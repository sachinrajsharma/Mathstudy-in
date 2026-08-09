/**
 * seed-jee-dpp-chapter-tests.js
 *
 * Seeds the 30 chapter-wise "JEE Maths DPP" e-books (10 DPPs / 200 questions
 * each: 15 MCQ + 3 integer + 2 assertion-reasoning per DPP) plus the
 * "JEE Maths – 30 Practice Papers" book (900 questions) into the existing
 * "JEE Mathematics" category (jee-mathematics).
 *
 * All listing content (titles, slugs, SEO meta, focus keyword, rich HTML
 * descriptions) comes from data/jee-dpp-products.json — authored to score
 * all-green in the admin SEO assistant.
 *
 * PRICE: chapters Rs 49 (was 79), practice papers Rs 79 (was 129).
 * price_locked=1 so the repricer never reverts admin-set prices.
 * Idempotent (upsert by slug). Never touches download_url — the owner pastes
 * Google-Drive links per product via /admin/products.
 *
 * Also unpublishes the two legacy 100-question DPP products this line
 * replaces (jee-mains-advance-dpp-complex-numbers,
 * jee-dpp-trigonometric-functions-equations). They stay in the DB, so the
 * old formula bundle keeps delivering their PDFs.
 *
 *   node scripts/seed-jee-dpp-chapter-tests.js            (write to DB)
 *   node scripts/seed-jee-dpp-chapter-tests.js --dry-run  (validate only)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const path = require('path');

const cfg = {
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

const CAT_SLUG = 'jee-mathematics';
const CAT_NAME = 'JEE Mathematics';
const CAT_SORT = 21;
const RETIRE = ['jee-mains-advance-dpp-complex-numbers', 'jee-dpp-trigonometric-functions-equations'];

const { products } = require(path.join(__dirname, '..', 'data', 'jee-dpp-products.json'));

function dryRun() {
  let bad = 0;
  for (const p of products) {
    const problems = [];
    if (p.title.length > 220) problems.push('title>' + p.title.length);
    if (p.slug.length > 240 || /[^a-z0-9-]/.test(p.slug)) problems.push('slug');
    if (p.meta_title.length > 70) problems.push('mt>' + p.meta_title.length);
    if (p.meta_desc.length > 160) problems.push('md>' + p.meta_desc.length);
    if (p.short_desc.length > 300) problems.push('sd>' + p.short_desc.length);
    if (!p.description || p.description.length < 500) problems.push('desc-thin');
    if (!(p.price > 0 && p.original_price > p.price)) problems.push('price');
    if (!(p.page_count > 0)) problems.push('pages');
    if (problems.length) bad++;
    console.log(p.slug.padEnd(46) + (problems.length ? '  !! ' + problems.join(',') : '  ok'));
  }
  console.log('\n' + products.length + ' products for "' + CAT_NAME + '". ' + (bad ? bad + ' PROBLEMS' : 'All fields OK.'));
  if (bad) process.exitCode = 1;
}

async function run() {
  if (process.argv.includes('--dry-run')) return dryRun();
  const conn = await mysql.createConnection(cfg);
  let [[cat]] = await conn.query('SELECT id FROM categories WHERE slug=?', [CAT_SLUG]);
  if (!cat) {
    await conn.query('INSERT INTO categories (name, slug, sort_order) VALUES (?,?,?)', [CAT_NAME, CAT_SLUG, CAT_SORT]);
    [[cat]] = await conn.query('SELECT id FROM categories WHERE slug=?', [CAT_SLUG]);
    console.log('Created category "' + CAT_SLUG + '" -> id ' + cat.id);
  } else console.log('Category "' + CAT_SLUG + '" -> id ' + cat.id);

  let added = 0, updated = 0;
  for (const p of products) {
    const [[existing]] = await conn.query('SELECT id FROM products WHERE slug=?', [p.slug]);
    if (existing) {
      await conn.query(
        `UPDATE products SET title=?,slug=?,description=?,short_desc=?,category_id=?,
         price=IF(price_locked=1,price,?),original_price=IF(price_locked=1,original_price,?),
         cover_image=?,page_count=?,grade=?,board=?,meta_title=?,meta_desc=?,focus_keyword=?,
         is_published=1,is_featured=?,price_locked=1 WHERE id=?`,
        [p.title, p.slug, p.description, p.short_desc, cat.id, p.price, p.original_price,
         p.cover_image, p.page_count, p.grade, p.board, p.meta_title, p.meta_desc, p.focus_keyword,
         p.is_featured, existing.id]);
      updated++; console.log('  updated  ' + p.slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,price_locked,
         cover_image,page_count,grade,board,meta_title,meta_desc,focus_keyword,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,?,1,?)`,
        [p.title, p.slug, p.description, p.short_desc, cat.id, p.price, p.original_price,
         p.cover_image, p.page_count, p.grade, p.board, p.meta_title, p.meta_desc, p.focus_keyword,
         p.is_featured]);
      added++; console.log('  added    ' + p.slug);
    }
  }

  const [retired] = await conn.query(
    'UPDATE products SET is_published=0 WHERE slug IN (?) AND is_published=1', [RETIRE]);
  if (retired.affectedRows) console.log('Unpublished ' + retired.affectedRows + ' legacy DPP product(s): ' + RETIRE.join(', '));

  const [[total]] = await conn.query('SELECT COUNT(*) n FROM products WHERE category_id=? AND is_published=1', [cat.id]);
  console.log('\nDone — ' + added + ' added, ' + updated + ' updated. "' + CAT_SLUG + '" now holds ' + total.n + ' published products (locked prices).');
  console.log('Next: owner uploads/adjusts cover, price and Google-Drive link per product via /admin/products.');
  await conn.end();
}
run().catch((e) => { console.error(e); process.exit(1); });
