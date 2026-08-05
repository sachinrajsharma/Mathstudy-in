/**
 * seed-imo-grade6-chapter-tests.js
 *
 * Seeds the 14 chapter-wise "IMO Class 6 Maths Chapter Tests" MCQ e-books
 * (100 MCQs / 10 worksheets each) + the "25 Practice Papers" book (750 MCQs)
 * into the "IMO Class 6 Mathematics" category (imo-class-6-math, created if
 * missing), each with keyword-rich SEO metadata, a rich HTML description and an
 * SEO-friendly slug + cover.
 *
 * PRICE: Rs 32 (was Rs 45). price_locked=1 so the repricer won't revert.
 * Idempotent (upsert by slug). Never touches download_url — Drive links are
 * pasted per-product via /admin/products (Google Drive link field).
 *
 *   node scripts/seed-imo-grade6-chapter-tests.js            (write to DB)
 *   node scripts/seed-imo-grade6-chapter-tests.js --dry-run  (validate only)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

const CAT_SLUG = 'imo-class-6-math';
const CAT_NAME = 'IMO Class 6 Mathematics';
const CAT_SORT = 31;
const IMG = '/wp-content/uploads';
const PRICE = 32, ORIGINAL = 45;
const COURSE = 'https://vidaara.org/olympiad/imo';

const BOOKS = [
  { chap: 'knowing-our-numbers', title: 'Knowing Our Numbers', pc: 52, short: 'Knowing Our Numbers', topics: 'Indian and international place value, comparing and ordering large numbers, estimation and rounding, Roman numerals and number word problems' },
  { chap: 'whole-numbers', title: 'Whole Numbers', pc: 52, short: 'Whole Numbers', topics: 'whole numbers on the number line, successors and predecessors, properties of addition and multiplication, distributivity and number patterns' },
  { chap: 'playing-with-numbers', title: 'Playing with Numbers', pc: 53, short: 'Playing with Numbers', topics: 'factors and multiples, primes and composites, divisibility tests, prime factorisation, HCF and LCM with word problems' },
  { chap: 'integers', title: 'Integers', pc: 52, short: 'Integers', topics: 'integers on the number line, ordering, absolute value, addition and subtraction of integers and real-life sign problems' },
  { chap: 'fractions', title: 'Fractions', pc: 52, short: 'Fractions', topics: 'equivalent fractions, simplest form, comparing, all four operations, mixed numbers and fraction word problems' },
  { chap: 'decimals', title: 'Decimals', pc: 52, short: 'Decimals', topics: 'decimal place value, fractions to decimals, comparing, addition and subtraction, and decimals in money and measurement' },
  { chap: 'algebra', title: 'Algebra', pc: 52, short: 'Algebra', topics: 'variables, writing and evaluating expressions, matchstick patterns and solving simple equations' },
  { chap: 'ratio-and-proportion', title: 'Ratio and Proportion', pc: 52, short: 'Ratio & Proportion', topics: 'ratios in simplest form, dividing in a ratio, equivalent ratios, proportion and the unitary method' },
  { chap: 'basic-geometrical-ideas', title: 'Basic Geometrical Ideas', pc: 58, short: 'Basic Geometry', topics: 'points, lines, rays and segments, angles and angle pairs, polygons and diagonals, triangles, quadrilaterals and parts of a circle' },
  { chap: 'understanding-elementary-shapes', title: 'Understanding Elementary Shapes', pc: 61, short: 'Elementary Shapes', topics: 'measuring angles and revolutions, triangle and quadrilateral classification, Pythagoras basics, polygons and 3-D solids with Euler’s formula' },
  { chap: 'symmetry', title: 'Symmetry', pc: 56, short: 'Symmetry', topics: 'lines of symmetry in shapes and letters, mirror reflections, rotational symmetry and coordinate reflections' },
  { chap: 'mensuration', title: 'Mensuration', pc: 63, short: 'Mensuration', topics: 'perimeter and area of squares, rectangles, triangles and regular polygons, composite figures, paths and cost problems' },
  { chap: 'data-handling', title: 'Data Handling', pc: 55, short: 'Data Handling', topics: 'tally marks, pictographs with scales, bar graphs, mean, median, mode, range and simple probability' },
  { chap: 'logical-reasoning', title: 'Logical Reasoning', pc: 52, short: 'Logical Reasoning', topics: 'number and letter series, analogies, coding-decoding, directions, ranking and blood relations' },
];

const PRACTICE = {
  chap: '25-practice-papers', title: '25 Practice Papers', pc: 282, isPractice: true, short: '25 Practice Papers',
  topics: 'all fourteen Grade-6 chapters — numbers, whole numbers, playing with numbers, integers, fractions, decimals, algebra, ratio and proportion, geometry, elementary shapes, symmetry, mensuration, data handling and logical reasoning',
};

const productSlug = (b) => b.isPractice ? 'imo-class-6-maths-25-practice-papers' : `imo-class-6-maths-${b.chap}-chapter-tests`;
const title = (b) => b.isPractice
  ? 'IMO Maths Olympiad Class 6 — 25 Sample Papers & Practice Papers: 750 MCQs with Solutions'
  : `IMO Maths Olympiad Class 6 ${b.title} — Chapter Worksheets: 100 MCQs with Answers`;
const coverFile = (b) => `${IMG}/${productSlug(b)}.jpg`;

function metaTitle(b) {
  let t = b.isPractice ? 'IMO Class 6 Maths Sample Papers PDF (750 MCQs)' : `Class 6 Maths Olympiad ${b.short} Worksheets PDF`;
  return t.length > 70 ? t.slice(0, 70) : t;
}
function metaDesc(b) {
  let d = b.isPractice
    ? 'IMO Maths Olympiad Class 6 sample & practice papers PDF: 25 papers, 750 MCQs across all chapters with answers and step-by-step solutions. SOF prep. Rs 32.'
    : `Maths Olympiad Class 6 ${b.title} worksheets PDF with answers: 100 IMO/SOF-pattern MCQs in 10 tests with step-by-step solutions. Rs 32.`;
  return d.length > 160 ? d.slice(0, 157).replace(/\s+\S*$/, '') + '…' : d;
}
const shortDesc = (b) => b.isPractice
  ? '25 full-length IMO Maths Olympiad Class 6 sample papers — 750 MCQs (30 per paper) balanced across every chapter, each with an answer key and step-by-step solutions. Instant PDF download.'
  : `100 IMO/SOF Maths Olympiad Class 6 ${b.title} MCQs with answers, arranged as 10 worksheets of 10 with an answer key and step-by-step solutions after each. Instant PDF download.`;

const description = (b) => (b.isPractice ? `
<p>The <strong>IMO Maths Olympiad Class 6 — 25 Practice Papers</strong> e-book is the ideal final-revision resource for the International Mathematics Olympiad (Class 6) — <strong>25 full-length sample papers, 750 MCQs</strong> in all, with answers and full solutions.</p>
<ul>
  <li><strong>25 practice / sample papers &times; 30 questions = 750 IMO-pattern MCQs</strong>, none repeated</li>
  <li>Every paper is <strong>balanced across all 14 Grade-6 chapters</strong> — just like the real SOF Olympiad</li>
  <li><strong>Answer key after every paper</strong> plus <strong>detailed step-by-step solutions</strong></li>
  <li>Colourful diagrams and figures wherever they help; graded intermediate to hard</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — perfect Class 6 Maths Olympiad sample papers and previous-year-style revision for IMO, iOM, NIMO and school exams</li>
</ul>
<p><strong>What these Class 6 Maths Olympiad papers cover:</strong> ${b.topics}.</p>
` : `
<p>The <strong>IMO Maths Olympiad Class 6 ${b.title} Chapter Worksheets</strong> e-book gives you <strong>100 Olympiad-pattern MCQs</strong> on <strong>${b.title}</strong>, arranged as <strong>10 worksheets of 10 questions</strong> — focused, chapter-wise <strong>Maths Olympiad for Class 6 worksheets PDF with answers</strong>.</p>
<ul>
  <li><strong>100 IMO / SOF-pattern Class 6 Maths MCQs</strong> on ${b.title}, graded intermediate to hard</li>
  <li><strong>10 short worksheets of 10</strong>, each with a complete <strong>answer key</strong> and <strong>step-by-step detailed solutions</strong></li>
  <li><strong>Key concepts, facts &amp; figures with colourful diagrams</strong> before you practise</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — ideal Class 6 IMO worksheets and sample-paper practice for IMO, iOM, NIMO and school Olympiads</li>
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
    console.log(`${productSlug(b).padEnd(58)} mt=${mt.length} md=${md.length} t=${t.length} sd=${sd.length}` + (flag ? '  !!' : ''));
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
    const slug = productSlug(b), grade = 'Class 6', board = 'IMO / Olympiad';
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
