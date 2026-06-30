/**
 * One-command fresh setup for a BLANK database.
 * Runs every seed/import step in the correct order so a new deploy comes up
 * complete: schema + admin + shop (Node prices + Google-Drive delivery) +
 * curated blogs + 437 imported WordPress posts + fixed cover images.
 *
 * Prereqs on the server before running:
 *   - .env filled (DB_HOST=127.0.0.1, DB_USER, DB_PASS, DB_NAME, ADMIN_EMAIL, etc.)
 *   - data/download-urls.json present (the secret Google-Drive map — not in git)
 *   - media uploaded: public/wp-content/uploads/ and data/ebooks/
 *
 * Run: node scripts/setup-fresh.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ordered; each step is idempotent and safe to re-run.
const STEPS = [
  ['Schema + categories + admin user', 'setup-db.js'],
  ['Seed products (base catalogue + Node prices)', 'seed-products.js'],
  ['Seed Class-12 products', 'seed-class12-new.js'],
  ['Apply bundle pricing', 'seed-bundles-pricing.js'],
  ['Apply product SEO meta', 'seed-product-seo.js'],
  ['Wire Google-Drive download links', 'import-download-urls.js'],
  ['Seed curated blog articles', 'seed-blog-articles.js'],
  ['Import 437 WordPress posts (original slugs)', 'import-wp-blogs.js'],
  ['Repoint product covers to local images', 'fix-product-covers.js'],
];

let ok = 0, skipped = 0;
for (const [label, file] of STEPS) {
  const full = path.join(__dirname, file);
  if (!fs.existsSync(full)) { console.log('\n— SKIP (missing): ' + file); skipped++; continue; }
  console.log('\n========== ' + label + '  (' + file + ') ==========');
  try { execSync('node ' + JSON.stringify(full), { stdio: 'inherit', cwd: path.join(__dirname, '..') }); ok++; }
  catch (e) { console.error('\n!! STEP FAILED: ' + file + ' — fix and re-run (steps are idempotent).'); process.exit(1); }
}
console.log('\n✅ Fresh setup complete — ' + ok + ' steps run' + (skipped ? ', ' + skipped + ' skipped' : '') + '.');
console.log('Visit /  ·  /shop  ·  /blog  ·  an old post like /2nd-grade-math-worksheets/  to verify.');
