// scripts/seed-bundles-pricing.js
// (4) Pricing lift — reprice products to competitive levels (₹50–₹399 band).
// (1) Bundles — create 4 discounted bundle products that grant all their e-books.
// Idempotent. Prices are starting points — adjust freely in the admin.
//   node scripts/seed-bundles-pricing.js
require('dotenv').config();
const mysql = require('mysql2/promise');

// Sensible price by product type (price, original/MRP for the strike-through).
function priceFor(slug, title) {
  const s = (slug + ' ' + title).toLowerCase();
  if (/formula book/.test(s)) return [99, 199];
  if (/\bdpp\b/.test(s)) return [59, 119];
  if (/cat .*sample|ctet/.test(s)) return [99, 199];
  if (/ncert exemplar|ncert solution|question bank|objective|hots|chapter.*test|work.?book class xii|sample paper/.test(s)) return [129, 249];
  if (/case stud/.test(s) && /class 12|class xii|all chapter|pdf book/.test(s)) return [99, 199];
  if (/case stud/.test(s)) return [49, 99];
  if (/workbook|work book/.test(s)) return [79, 149];
  if (/worksheet|word problem/.test(s)) return [49, 99];
  return [59, 119];
}

const BUNDLES = [
  { slug: 'class-12-maths-case-studies-bundle',
    title: 'Class 12 Maths Case Study Questions Bundle (Solved) — PDF',
    meta: 'Every Class 12 Maths case-study chapter in one solved PDF bundle — the case-based questions that decide board marks. Save vs buying singly. Instant download.',
    short: 'All Class 12 Maths case-study questions, fully solved, in one money-saving bundle.',
    price: 149, items: ['math-case-studies-class-12-pdf-book', 'case-studies-class-12-probability-with-solutions'] },
  { slug: 'class-8-maths-case-studies-full-set',
    title: 'Class 8 Maths Case Study Questions — Full Set (Solved PDF)',
    meta: 'All Class 8 Maths case-study chapters — Algebra, Exponents, Rational Numbers, Roots, Number System — solved in one PDF bundle. Save vs singles. Instant download.',
    short: 'Every Class 8 Maths case-study chapter, solved, in one discounted set.',
    price: 199, items: ['case-studies-class-8-algebraic-expressions-pdf', 'case-studies-class-8-exponents-and-powers-pdf', 'case-studies-class-8-rational-numbers-pdf', 'case-studies-class-8-square-root-and-cube-roots-pdf', 'case-studies-number-system-class-8-e-book'] },
  { slug: 'grade-3-word-problems-mega-pack',
    title: 'Grade 3 Word Problems Mega Pack — Printable PDF',
    meta: 'All Grade 3 word-problem worksheets — addition, subtraction, multiplication & division — with answers, in one printable PDF pack. Save vs singles. Instant download.',
    short: 'Every Grade 3 word-problem worksheet (add, subtract, multiply, divide) in one printable pack.',
    price: 149, items: ['addition-word-problems-for-grade-3', 'subtraction-word-problems-for-grade-3', 'multiplication-word-problems-for-grade-3-150-problems', 'word-problems-for-grade-3-division', 'mixed-word-problems-for-grade-3'] },
  { slug: 'jee-maths-dpp-formula-bundle',
    title: 'JEE Maths Formula Book + DPP Bundle — PDF Download',
    meta: 'JEE maths essentials in one bundle: the complete formula book plus topic-wise DPPs (trigonometry, complex numbers) with solutions. Save vs singles. Instant PDF.',
    short: 'The JEE maths formula book plus topic-wise DPPs, bundled at a discount.',
    price: 199, items: ['mathematics-formula-book-for-jee', 'jee-dpp-trigonometric-functions-equations', 'jee-mains-advance-dpp-complex-numbers'] }
];

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASS || '', database: process.env.DB_NAME || 'mathstudy'
  });

  // ── (4) Reprice individual (non-bundle) products ──
  const [prods] = await db.query('SELECT id,slug,title FROM products WHERE bundle_items IS NULL');
  let repriced = 0;
  for (const p of prods) {
    const [price, mrp] = priceFor(p.slug, p.title);
    await db.query('UPDATE products SET price=?, original_price=? WHERE id=?', [price, mrp, p.id]);
    repriced++;
  }
  console.log(`Repriced ${repriced} products.`);

  // ── (1) Create / update bundles ──
  const idBySlug = {};
  const [all] = await db.query('SELECT id,slug,price,cover_image,category_id FROM products');
  all.forEach((p) => { idBySlug[p.slug] = p; });

  for (const b of BUNDLES) {
    const comps = b.items.map((s) => idBySlug[s]).filter(Boolean);
    if (!comps.length) { console.log('  ! no components found for', b.slug); continue; }
    const ids = comps.map((c) => c.id);
    const sum = comps.reduce((s, c) => s + Number(c.price || 0), 0);
    const cover = comps[0].cover_image || '/images/og-default.png';
    const catId = comps[0].category_id || null;
    const itemsJson = JSON.stringify(ids);

    const [[exists]] = await db.query('SELECT id FROM products WHERE slug=?', [b.slug]);
    if (exists) {
      await db.query(
        `UPDATE products SET title=?,short_desc=?,price=?,original_price=?,cover_image=?,category_id=?,
         meta_title=?,meta_desc=?,bundle_items=?,is_published=1,is_featured=1 WHERE id=?`,
        [b.title, b.short, b.price, sum, cover, catId, b.title, b.meta.slice(0, 158), itemsJson, exists.id]);
      console.log(`  ~ updated bundle ${b.slug} (${ids.length} items, ₹${b.price} vs ₹${sum})`);
    } else {
      await db.query(
        `INSERT INTO products (title,slug,short_desc,price,original_price,cover_image,category_id,meta_title,meta_desc,bundle_items,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,?,?,?,1,1)`,
        [b.title, b.slug, b.short, b.price, sum, cover, catId, b.title, b.meta.slice(0, 158), itemsJson]);
      console.log(`  + created bundle ${b.slug} (${ids.length} items, ₹${b.price} vs ₹${sum})`);
    }
  }

  console.log('Done.');
  await db.end(); process.exit(0);
})().catch((e) => { console.error('Failed:', e); process.exit(1); });
