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
// required:true  → abort if it fails (the site can't work without it).
// required:false → warn and continue (e.g. download-urls.json not uploaded yet).
const STEPS = [
  ['Schema + categories + admin user', 'setup-db.js', true],
  ['Migrate: products.download_url + order status enum', 'migrate-approval.js', true],
  ['Migrate: product_reviews table + products.bundle_items', 'migrate-sales.js', true],
  ['Migrate: customer-support ticket tables', 'migrate-support.js', false],
  ['Seed products (base catalogue + Node prices)', 'seed-products.js', true],
  ['Seed Class-12 products', 'seed-class12-new.js', false],
  ['Seed Grade-1 worksheet e-books', 'seed-grade1-worksheets.js', false],
  ['Seed Grade-2 worksheet e-books', 'seed-grade2-worksheets.js', false],
  ['Seed Grade-3 worksheet e-books', 'seed-grade3-worksheets.js', false],
  ['Seed Grade-4 worksheet e-books', 'seed-grade4-worksheets.js', false],
  ['Seed Class-5 chapter case-study books', 'seed-class5-case-studies.js', false],
  ['Seed Class-6 chapter case-study books', 'seed-class6-case-studies.js', false],
  ['Seed Class-7 chapter case-study books', 'seed-class7-case-studies.js', false],
  ['Seed Class-8 chapter case-study books', 'seed-class8-case-studies.js', false],
  ['Apply bundle pricing', 'seed-bundles-pricing.js', false],
  ['Apply product SEO meta', 'seed-product-seo.js', false],
  ['Wire Google-Drive download links', 'import-download-urls.js', false],
  ['Seed curated blog articles', 'seed-blog-articles.js', false],
  ['Import 437 WordPress posts (original slugs)', 'import-wp-blogs.js', false],
  ['Scrub injected spam links from blogs', 'clean-spam-links.js', false],
  ['Repoint product covers to local images', 'fix-product-covers.js', false],
];

let ok = 0, skipped = 0, warned = 0;
for (const [label, file, required] of STEPS) {
  const full = path.join(__dirname, file);
  if (!fs.existsSync(full)) { console.log('\n— SKIP (missing file): ' + file); skipped++; continue; }
  console.log('\n========== ' + label + '  (' + file + ') ==========');
  try { execSync(JSON.stringify(process.execPath) + ' ' + JSON.stringify(full), { stdio: 'inherit', cwd: path.join(__dirname, '..') }); ok++; }
  catch (e) {
    if (required) { console.error('\n!! REQUIRED STEP FAILED: ' + file + ' — fix env/DB and re-run.'); process.exit(1); }
    console.warn('\n~~ optional step failed (' + file + ') — continuing. Re-run setup-fresh after fixing (e.g. upload data/download-urls.json).');
    warned++;
  }
}
console.log('\n✅ Fresh setup done — ' + ok + ' ok' + (warned ? ', ' + warned + ' skipped(failed-optional)' : '') + (skipped ? ', ' + skipped + ' missing' : '') + '.');
console.log('Visit /  ·  /shop  ·  /blog  ·  an old post like /2nd-grade-math-worksheets/  to verify.');
