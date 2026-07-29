/**
 * upsert-blog.js — insert/update one SEO blog post (with embedded MCQ quiz,
 * FAQ and a per-blog product CTA) from a JSON file. Idempotent by slug.
 *
 *   node scripts/upsert-blog.js data/blogs/<file>.json
 *   node scripts/upsert-blog.js data/blogs/<file>.json --dry-run
 *
 * JSON shape:
 * {
 *   "slug": "grade-1-addition-practice-questions-online-quiz",   // UNIQUE URL — check intent doesn't clash with another page
 *   "title": "...", "meta_title": "... (<=60)", "meta_desc": "... (<=155)",
 *   "excerpt": "...", "category": "Grade 1", "cover_image": "/wp-content/uploads/....jpg",
 *   "content": "<h2>...</h2><p>...</p>",   // SEMANTIC HTML (server-rendered)
 *   "cta_product_slug": "addition-worksheets-for-grade-1",       // the e-book to sell
 *   "quiz": { "title":"...", "intro":"...", "about":"...", "level":"Grade 1",
 *             "questions":[ {"q":"...","options":["a","b","c","d"],"answer":2,"explanation":"..."} ] },
 *   "faq":  [ {"q":"...","a":"..."} ],
 *   "status": "published"
 * }
 */
require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

const cfg = {
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

function validate(b) {
  const errs = [];
  if (!b.slug || !/^[a-z0-9-]+$/.test(b.slug)) errs.push('slug missing or not kebab-case');
  if (!b.title) errs.push('title missing');
  if (b.meta_title && b.meta_title.length > 65) errs.push(`meta_title ${b.meta_title.length} > 65`);
  if (b.meta_desc && b.meta_desc.length > 160) errs.push(`meta_desc ${b.meta_desc.length} > 160`);
  if (!b.content || !/^\s*</.test(b.content.trim())) errs.push('content must be non-empty HTML (start with a tag)');
  if (b.quiz) {
    if (!Array.isArray(b.quiz.questions) || !b.quiz.questions.length) errs.push('quiz.questions empty');
    (b.quiz.questions || []).forEach((q, i) => {
      if (!q.q) errs.push(`quiz Q${i+1} missing q`);
      if (!Array.isArray(q.options) || q.options.length !== 4) errs.push(`quiz Q${i+1} needs exactly 4 options`);
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) errs.push(`quiz Q${i+1} answer must be 0-3`);
    });
  }
  if (b.faq && !Array.isArray(b.faq)) errs.push('faq must be an array');
  return errs;
}

(async () => {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node scripts/upsert-blog.js <file.json> [--dry-run]'); process.exit(1); }
  const b = JSON.parse(fs.readFileSync(file, 'utf8'));

  const errs = validate(b);
  if (errs.length) { console.error('VALIDATION FAILED:\n - ' + errs.join('\n - ')); process.exit(1); }

  const wc = b.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  console.log(`slug        ${b.slug}`);
  console.log(`title       ${b.title}`);
  console.log(`meta_title  ${b.meta_title || '(uses title)'}  [${(b.meta_title||'').length}/65]`);
  console.log(`meta_desc   [${(b.meta_desc||'').length}/160]`);
  console.log(`words       ${wc}   quiz Qs: ${b.quiz ? b.quiz.questions.length : 0}   faq: ${b.faq ? b.faq.length : 0}`);
  console.log(`cta product ${b.cta_product_slug || '(none)'}`);
  if (process.argv.includes('--dry-run')) { console.log('\n[dry-run] not written.'); process.exit(0); }

  const conn = await mysql.createConnection(cfg);
  // Verify the CTA product exists (a dangling CTA just renders nothing, but warn).
  if (b.cta_product_slug) {
    const [[p]] = await conn.query('SELECT id FROM products WHERE slug=? AND is_published=1', [b.cta_product_slug]);
    if (!p) console.warn(`  ⚠ cta_product_slug "${b.cta_product_slug}" not found/published — CTA will be hidden.`);
  }

  const cols = {
    title: b.title, slug: b.slug, content: b.content,
    excerpt: b.excerpt || '', cover_image: b.cover_image || '', category: b.category || '',
    meta_title: b.meta_title || '', meta_desc: b.meta_desc || '',
    status: b.status || 'published', author: b.author || 'Sachin Sharma',
    quiz_json: b.quiz ? JSON.stringify(b.quiz) : null,
    faq_json: b.faq ? JSON.stringify(b.faq) : null,
    cta_product_slug: b.cta_product_slug || null,
  };

  const [[existing]] = await conn.query('SELECT id FROM blogs WHERE slug=?', [b.slug]);
  if (existing) {
    const set = Object.keys(cols).map(k => `${k}=?`).join(',');
    await conn.query(`UPDATE blogs SET ${set} WHERE id=?`, [...Object.values(cols), existing.id]);
    console.log(`\n✓ updated blog #${existing.id}`);
  } else {
    const keys = Object.keys(cols);
    await conn.query(`INSERT INTO blogs (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`, Object.values(cols));
    console.log('\n✓ inserted new blog');
  }
  console.log(`  live at: /${b.slug}   and   /blog/${b.slug}`);
  await conn.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
