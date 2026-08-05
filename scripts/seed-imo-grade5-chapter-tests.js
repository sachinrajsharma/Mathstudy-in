/**
 * seed-imo-grade5-chapter-tests.js
 *
 * Seeds the 11 chapter-wise "IMO Class 5 Maths Chapter Tests" MCQ e-books
 * (100 MCQs / 10 worksheets each) + the "25 Practice Papers" book (750 MCQs)
 * into the "IMO Class 5 Mathematics" category (imo-class-5-math, created if
 * missing), each with keyword-rich SEO metadata, a rich HTML description and an
 * SEO-friendly slug + cover.
 *
 * PRICE: Rs 32 (was Rs 45). price_locked=1 so the repricer won't revert.
 * Idempotent (upsert by slug). Never touches download_url — Drive links are
 * pasted per-product via /admin/products (Google Drive link field).
 *
 *   node scripts/seed-imo-grade5-chapter-tests.js            (write to DB)
 *   node scripts/seed-imo-grade5-chapter-tests.js --dry-run  (validate only)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

const CAT_SLUG = 'imo-class-5-math';
const CAT_NAME = 'IMO Class 5 Mathematics';
const CAT_SORT = 30;
const IMG = '/wp-content/uploads';
const PRICE = 32, ORIGINAL = 45;
const COURSE = 'https://vidaara.org/olympiad/imo';

const BOOKS = [
  { chap: 'large-numbers-and-operations', title: 'Large Numbers and Operations', pc: 53, short: 'Large Numbers', topics: 'Indian and international place value, expanded form, comparing, rounding, Roman numerals and the four operations with word problems' },
  { chap: 'factors-and-multiples', title: 'Factors and Multiples', pc: 53, short: 'Factors & Multiples', topics: 'primes and composites, prime factorisation, divisibility rules, HCF and LCM with word problems' },
  { chap: 'fractions', title: 'Fractions', pc: 52, short: 'Fractions', topics: 'all four operations on fractions, mixed numbers, simplest form, comparing and word problems' },
  { chap: 'decimals', title: 'Decimals', pc: 52, short: 'Decimals', topics: 'decimals to thousandths, conversions, all four operations, multiplying and dividing by 10/100/1000 and rounding' },
  { chap: 'percentage', title: 'Percentage', pc: 53, short: 'Percentage', topics: 'percent-fraction-decimal conversions, percentage of a quantity, what percent, increase and decrease' },
  { chap: 'measurement', title: 'Measurement', pc: 52, short: 'Measurement', topics: 'the full metric ladder (mm to km, mg to kg, mL to kL), decimal conversions and operations on measures' },
  { chap: 'geometry-angles-and-shapes', title: 'Geometry - Angles and Shapes', pc: 59, short: 'Geometry', topics: 'angle types and pairs, triangles, circles, polygons, symmetry and Euler’s formula for solids' },
  { chap: 'perimeter-area-and-volume', title: 'Perimeter, Area and Volume', pc: 66, short: 'Perimeter Area Volume', topics: 'perimeter and area of rectangles and triangles, composite shapes, and volume of cubes and cuboids' },
  { chap: 'temperature', title: 'Temperature', pc: 52, short: 'Temperature', topics: 'Celsius and Fahrenheit, reading thermometers, conversions between scales and temperature change' },
  { chap: 'money', title: 'Money', pc: 52, short: 'Money', topics: 'money operations, unit cost, bills, profit and loss and discounts' },
  { chap: 'data-handling', title: 'Data Handling', pc: 70, short: 'Data Handling', topics: 'bar and double-bar graphs, pie charts, pictographs, tally marks, mean, median and mode' },
];

const PRACTICE = {
  chap: '25-practice-papers', title: '25 Practice Papers', pc: 289, isPractice: true, short: '25 Practice Papers',
  topics: 'all eleven Grade-5 chapters — numbers and operations, factors and multiples, fractions, decimals, money, measurement, time, geometry, perimeter and area, patterns and data handling',
};

const productSlug = (b) => b.isPractice ? 'imo-class-5-maths-25-practice-papers' : `imo-class-5-maths-${b.chap}-chapter-tests`;
const title = (b) => b.isPractice
  ? 'IMO Maths Olympiad Class 5 — 25 Sample Papers & Practice Papers: 750 MCQs with Solutions'
  : `IMO Maths Olympiad Class 5 ${b.title} — Chapter Worksheets: 100 MCQs with Answers`;
const coverFile = (b) => `${IMG}/${productSlug(b)}.jpg`;

function metaTitle(b) {
  let t = b.isPractice ? 'IMO Class 5 Maths Sample Papers PDF (750 MCQs)' : `Class 5 Maths Olympiad ${b.short} Worksheets PDF`;
  return t.length > 70 ? t.slice(0, 70) : t;
}
function metaDesc(b) {
  let d = b.isPractice
    ? 'IMO Maths Olympiad Class 5 sample & practice papers PDF: 25 papers, 750 MCQs across all chapters with answers and step-by-step solutions. SOF prep. Rs 32.'
    : `Maths Olympiad Class 5 ${b.title} worksheets PDF with answers: 100 IMO/SOF-pattern MCQs in 10 tests with step-by-step solutions. Rs 32.`;
  return d.length > 160 ? d.slice(0, 157).replace(/\s+\S*$/, '') + '…' : d;
}
const shortDesc = (b) => b.isPractice
  ? '25 full-length IMO Maths Olympiad Class 5 sample papers — 750 MCQs (30 per paper) balanced across every chapter, each with an answer key and step-by-step solutions. Instant PDF download.'
  : `100 IMO/SOF Maths Olympiad Class 5 ${b.title} MCQs with answers, arranged as 10 worksheets of 10 with an answer key and step-by-step solutions after each. Instant PDF download.`;

const description = (b) => (b.isPractice ? `
<p>The <strong>IMO Maths Olympiad Class 5 — 25 Practice Papers</strong> e-book is the ideal final-revision resource for the International Mathematics Olympiad (Class 5) — <strong>25 full-length sample papers, 750 MCQs</strong> in all, with answers and full solutions.</p>
<ul>
  <li><strong>25 practice / sample papers &times; 30 questions = 750 IMO-pattern MCQs</strong>, none repeated</li>
  <li>Every paper is <strong>balanced across all 11 Grade-5 chapters</strong> — just like the real SOF Olympiad</li>
  <li><strong>Answer key after every paper</strong> plus <strong>detailed step-by-step solutions</strong></li>
  <li>Colourful diagrams and figures wherever they help; graded intermediate to hard</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — perfect Class 5 Maths Olympiad sample papers and previous-year-style revision for IMO, iOM, NIMO and school exams</li>
</ul>
<p><strong>What these Class 5 Maths Olympiad papers cover:</strong> ${b.topics}.</p>
` : `
<p>The <strong>IMO Maths Olympiad Class 5 ${b.title} Chapter Worksheets</strong> e-book gives you <strong>100 Olympiad-pattern MCQs</strong> on <strong>${b.title}</strong>, arranged as <strong>10 worksheets of 10 questions</strong> — focused, chapter-wise <strong>Maths Olympiad for Class 5 worksheets PDF with answers</strong>.</p>
<ul>
  <li><strong>100 IMO / SOF-pattern Class 5 Maths MCQs</strong> on ${b.title}, graded intermediate to hard</li>
  <li><strong>10 short worksheets of 10</strong>, each with a complete <strong>answer key</strong> and <strong>step-by-step detailed solutions</strong></li>
  <li><strong>Key concepts, facts &amp; figures with colourful diagrams</strong> before you practise</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — ideal Class 5 IMO worksheets and sample-paper practice for IMO, iOM, NIMO and school Olympiads</li>
</ul>
<p><strong>Topics covered:</strong> ${b.topics}.</p>
`).trim().replace(/\s*\n\s*/g, ' ') +
` <p>Learn the whole syllabus with the free <a href="${COURSE}" target="_blank" rel="noopener">IMO Maths Olympiad course at vidaara.org</a>, then test yourself chapter by chapter.</p>` +
` <p><em>Prepared by Sachin Sharma, Founder — vidaara.org (free e-learning platform).</em></p>`;

const ALL = [...BOOKS, PRACTICE];

function dryRun() {
  let bad = 0;
  for (const b of ALL) {
    const mt = metaTitle(b), md = metaDesc(b), t = title(b), sd = shortDesc(b);
    const flag = (mt.length > 70 || md.length > 160 || t.length > 220 || sd.length > 300);
    if (flag) bad++;
    console.log(`${productSlug(b).padEnd(52)} mt=${mt.length} md=${md.length} t=${t.length} sd=${sd.length}` + (flag ? '  !!' : ''));
  }
  console.log('\n' + ALL.length + ' products for "' + CAT_NAME + '" (' + CAT_SLUG + '). ' + (bad ? bad + ' LENGTH PROBLEMS' : 'All lengths OK.'));
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
  for (const b of ALL) {
    const slug = productSlug(b), grade = 'Class 5', board = 'IMO / Olympiad';
    const [[existing]] = await conn.query('SELECT id FROM products WHERE slug=?', [slug]);
    if (existing) {
      await conn.query(
        `UPDATE products SET title=?,slug=?,description=?,short_desc=?,category_id=?,
         price=IF(price_locked=1,price,?),original_price=IF(price_locked=1,original_price,?),
         cover_image=?,page_count=?,grade=?,board=?,meta_title=?,meta_desc=?,is_published=1,price_locked=1 WHERE id=?`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL, coverFile(b), b.pc, grade, board, metaTitle(b), metaDesc(b), existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,price_locked,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,1,?)`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL, coverFile(b), b.pc, grade, board, metaTitle(b), metaDesc(b), b.isPractice ? 1 : 0]);
      added++; console.log('  added    ' + slug);
    }
  }
  const [[total]] = await conn.query('SELECT COUNT(*) n FROM products WHERE category_id=?', [cat.id]);
  console.log('\nDone — ' + added + ' added, ' + updated + ' updated. "' + CAT_SLUG + '" now holds ' + total.n + ' products (Rs ' + PRICE + '/' + ORIGINAL + ', locked).');
  console.log('Download links: paste each Drive URL via /admin/products (edit → Google Drive link).');
  await conn.end();
}
run().catch((e) => { console.error(e); process.exit(1); });
