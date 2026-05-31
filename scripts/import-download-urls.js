// scripts/import-download-urls.js
// Bulk-loads the secret slug -> Google-Drive map (data/download-urls.json,
// git-ignored) into products.download_url. Idempotent. Run on the server:
//   node scripts/import-download-urls.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const file = path.join(__dirname, '..', 'data', 'download-urls.json');
  if (!fs.existsSync(file)) { console.error('Missing data/download-urls.json'); process.exit(1); }
  const map = JSON.parse(fs.readFileSync(file, 'utf8'));

  const pool = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mathstudy'
  });

  let ok = 0; const missing = [];
  for (const [slug, url] of Object.entries(map)) {
    if (slug.startsWith('_')) continue; // skip _comment
    const [r] = await pool.query('UPDATE products SET download_url=? WHERE slug=?', [url, slug]);
    if (r.affectedRows > 0) { ok++; console.log('  ✓ ' + slug); }
    else { missing.push(slug); console.log('  ✗ NO PRODUCT for slug: ' + slug); }
  }
  console.log(`\nDone — ${ok} products linked, ${missing.length} slug(s) had no matching product.`);
  if (missing.length) console.log('Unmatched slugs:', missing.join(', '));
  await pool.end();
  process.exit(0);
})().catch((e) => { console.error('Import failed:', e); process.exit(1); });
