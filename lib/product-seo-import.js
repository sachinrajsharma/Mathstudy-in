/**
 * product-seo-import.js — apply SEO-Assistant-tuned product fields on boot.
 *
 * Files in data/product-seo/*.json each hold an array of records:
 *   { slug, focus_keyword, meta_title, meta_desc, short_desc, description }
 * Every boot, each record is compared to the DB row and UPDATEd only when a
 * field differs (idempotent, cheap on a no-change boot). Never creates
 * products, never touches price/cover/download_url — SEO text fields only.
 *
 * This runs AFTER any manual seed script, so re-running an old seed can no
 * longer clobber the tuned SEO copy: the next boot re-applies it.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data', 'product-seo');
const FIELDS = ['focus_keyword', 'meta_title', 'meta_desc', 'short_desc', 'description'];

async function applyProductSeo(pool) {
  const out = { updated: 0, unchanged: 0, missing: 0, files: 0 };
  let files = [];
  try { files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')); }
  catch (e) { return out; } // no data/product-seo dir — nothing to do
  out.files = files.length;

  for (const file of files) {
    let records;
    try { records = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')); }
    catch (e) { console.error('[product-seo] bad JSON, skipped:', file, '-', e.message); continue; }
    if (!Array.isArray(records)) continue;

    for (const r of records) {
      if (!r || !r.slug) continue;
      try {
        const [[row]] = await pool.query(
          `SELECT id, focus_keyword, meta_title, meta_desc, short_desc, description FROM products WHERE slug=?`, [r.slug]);
        if (!row) { out.missing++; continue; } // never create from an overlay
        const changed = FIELDS.filter(f => r[f] !== undefined && String(r[f]) !== String(row[f] == null ? '' : row[f]));
        if (!changed.length) { out.unchanged++; continue; }
        const set = changed.map(f => f + '=?').join(',');
        await pool.query(`UPDATE products SET ${set} WHERE id=?`, [...changed.map(f => r[f]), row.id]);
        out.updated++;
      } catch (e) { console.error('[product-seo] db error:', r.slug, '-', e.message); }
    }
  }
  return out;
}

module.exports = { applyProductSeo };
