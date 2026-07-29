/**
 * blog-import.js — auto-import every SEO blog JSON in data/blogs/ into the
 * `blogs` table on boot. Idempotent by slug (insert if new, update if present),
 * so a plain Hostinger redeploy/restart is enough to publish new blogs — no
 * manual `node scripts/upsert-blog.js` loop over SSH is required.
 *
 * Mirrors the validation + column mapping of scripts/upsert-blog.js, but is
 * defensive: a single bad JSON file is skipped with a warning and never crashes
 * server boot.
 *
 *   const { importAllBlogs } = require('./lib/blog-import');
 *   await importAllBlogs(pool);            // returns { inserted, updated, skipped, total }
 */
const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '..', 'data', 'blogs');

// ── HTML-entity decode for ESCAPED-rendered text fields ─────────────────────
// blog-post.ejs renders title / meta / excerpt / quiz text / faq questions with
// EJS `<%= %>` (escaped), so an authored entity like `&amp;` or `&mdash;` shows
// up literally on the page. We decode those fields to real Unicode so authors
// can write entities (per BLOG-SPEC) and the page still reads correctly. The
// article `content` and faq ANSWERS are rendered as HTML (`<%- %>`) and are
// deliberately left untouched.
const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', minus: '−', hellip: '…',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  times: '×', divide: '÷', rarr: '→', larr: '←', deg: '°',
};
function decodeEntities(s) {
  if (typeof s !== 'string' || s.indexOf('&') === -1) return s;
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, function (_, h) { try { return String.fromCodePoint(parseInt(h, 16)); } catch (e) { return _; } })
    .replace(/&#(\d+);/g, function (_, d) { try { return String.fromCodePoint(parseInt(d, 10)); } catch (e) { return _; } })
    .replace(/&([a-zA-Z]+);/g, function (m, name) { return Object.prototype.hasOwnProperty.call(NAMED, name) ? NAMED[name] : m; });
}
// Decode the escaped-rendered fields of a blog IN PLACE. Leaves content and faq
// answers alone. Safe to run more than once (real characters decode to themselves).
function cleanBlogText(b) {
  ['title', 'meta_title', 'meta_desc', 'excerpt'].forEach(function (k) { if (b[k]) b[k] = decodeEntities(b[k]); });
  if (b.quiz) {
    ['title', 'intro', 'about'].forEach(function (k) { if (b.quiz[k]) b.quiz[k] = decodeEntities(b.quiz[k]); });
    (b.quiz.questions || []).forEach(function (q) {
      if (q.q) q.q = decodeEntities(q.q);
      if (q.explanation) q.explanation = decodeEntities(q.explanation);
      if (Array.isArray(q.options)) q.options = q.options.map(decodeEntities);
    });
  }
  if (Array.isArray(b.faq)) b.faq.forEach(function (f) { if (f.q) f.q = decodeEntities(f.q); }); // NOT f.a (rendered as HTML)
  return b;
}

function validate(b) {
  const errs = [];
  if (!b.slug || !/^[a-z0-9-]+$/.test(b.slug)) errs.push('slug missing or not kebab-case');
  if (!b.title) errs.push('title missing');
  if (b.meta_title && b.meta_title.length > 65) errs.push('meta_title > 65');
  if (b.meta_desc && b.meta_desc.length > 160) errs.push('meta_desc > 160');
  if (!b.content || !/^\s*</.test(String(b.content).trim())) errs.push('content must be non-empty HTML');
  if (b.quiz) {
    if (!Array.isArray(b.quiz.questions) || !b.quiz.questions.length) errs.push('quiz.questions empty');
    (b.quiz.questions || []).forEach((q, i) => {
      if (!q.q) errs.push('quiz Q' + (i + 1) + ' missing q');
      if (!Array.isArray(q.options) || q.options.length !== 4) errs.push('quiz Q' + (i + 1) + ' needs 4 options');
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) errs.push('quiz Q' + (i + 1) + ' answer 0-3');
    });
  }
  if (b.faq && !Array.isArray(b.faq)) errs.push('faq must be an array');
  return errs;
}

function toCols(b) {
  return {
    title: b.title, slug: b.slug, content: b.content,
    excerpt: b.excerpt || '', cover_image: b.cover_image || '', category: b.category || '',
    meta_title: b.meta_title || '', meta_desc: b.meta_desc || '',
    status: b.status || 'published', author: b.author || 'Sachin Sharma',
    quiz_json: b.quiz ? JSON.stringify(b.quiz) : null,
    faq_json: b.faq ? JSON.stringify(b.faq) : null,
    cta_product_slug: b.cta_product_slug || null,
  };
}

async function importAllBlogs(pool) {
  const out = { inserted: 0, updated: 0, skipped: 0, total: 0 };
  let files = [];
  try {
    files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.json'));
  } catch (e) {
    return out; // no data/blogs dir yet — nothing to do
  }
  out.total = files.length;

  for (const file of files) {
    let b;
    try {
      b = JSON.parse(fs.readFileSync(path.join(BLOG_DIR, file), 'utf8'));
    } catch (e) {
      out.skipped++; console.error('[blog-import] bad JSON, skipped:', file, '-', e.message); continue;
    }
    const errs = validate(b);
    if (errs.length) {
      out.skipped++; console.error('[blog-import] invalid, skipped:', file, '-', errs.join('; ')); continue;
    }
    try {
      cleanBlogText(b);
      const cols = toCols(b);
      const [[existing]] = await pool.query('SELECT id FROM blogs WHERE slug=?', [b.slug]);
      if (existing) {
        const set = Object.keys(cols).map(k => k + '=?').join(',');
        await pool.query('UPDATE blogs SET ' + set + ' WHERE id=?', [...Object.values(cols), existing.id]);
        out.updated++;
      } else {
        const keys = Object.keys(cols);
        await pool.query('INSERT INTO blogs (' + keys.join(',') + ') VALUES (' + keys.map(() => '?').join(',') + ')', Object.values(cols));
        out.inserted++;
      }
    } catch (e) {
      out.skipped++; console.error('[blog-import] db error, skipped:', file, '-', e.message);
    }
  }
  return out;
}

module.exports = { importAllBlogs, validate, decodeEntities, cleanBlogText };
