/**
 * blog-redirects.js — 301 map for legacy blogs that were consolidated or renamed
 * during the duplicate-intent SEO cleanup. Key = OLD slug, value = NEW slug.
 *
 * WHY: a Google core/Helpful-Content update collapsed many same-intent posts and
 * dropped impressions. The fix is to keep ONE canonical post per intent and 301
 * every near-duplicate to it (passing on its link equity) instead of leaving
 * competing URLs live or 404-ing them.
 *
 * Loaded once at boot from data/blog-redirects.json. redirectFor(slug) returns the
 * NEW slug or null. Applied in the /<slug> and /blog/<slug> handlers BEFORE the DB
 * lookup so an old URL 301s to its canonical replacement.
 */
const fs = require('fs');
const path = require('path');

let MAP = {}, ARCHIVE = [];
try {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'blog-redirects.json'), 'utf8'));
  MAP = (raw && raw.redirects) || {};
  ARCHIVE = (raw && raw.archive) || [];
} catch (e) { MAP = {}; ARCHIVE = []; }

function redirectFor(slug) {
  if (!slug) return null;
  const to = MAP[slug];
  if (!to || to === slug) return null;
  return to;
}

// On boot, take the redirected duplicate slugs OUT of the published set so they
// drop from /blog and sitemap.xml (their URLs already 301 to the canonical).
// Non-destructive: rows are kept as status='archived' and revert by republishing.
async function archiveRedirectedBlogs(pool) {
  // Redirected duplicates + explicitly-archived junk/off-topic posts both leave
  // the published set (drop from /blog + sitemap). Non-destructive: revert by
  // republishing. Redirected slugs also 301; archived-only slugs just 404/gone.
  const slugs = [...new Set([...Object.keys(MAP), ...ARCHIVE])];
  if (!slugs.length) return { archived: 0 };
  try {
    const [res] = await pool.query(
      "UPDATE blogs SET status='archived' WHERE status='published' AND slug IN (?)", [slugs]);
    return { archived: res.affectedRows };
  } catch (e) { console.error('[blog-redirects] archive failed:', e.message); return { archived: 0, error: e.message }; }
}

module.exports = { redirectFor, MAP, ARCHIVE, archiveRedirectedBlogs };
