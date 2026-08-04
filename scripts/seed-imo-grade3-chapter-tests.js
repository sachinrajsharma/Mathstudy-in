/**
 * seed-imo-grade3-chapter-tests.js
 *
 * Seeds the 10 chapter-wise "IMO Class 3 Maths Chapter Tests" MCQ e-books
 * (100 MCQs / 10 worksheets each) + the "25 Practice Papers" book (750 MCQs)
 * into the "IMO Class 3 Mathematics" category (imo-class-3-math, created if
 * missing), each with keyword-rich SEO metadata, a rich HTML description and an
 * SEO-friendly slug + cover.
 *
 * PRICE: Rs 32 (was Rs 45). price_locked=1 so the repricer won't revert.
 * Idempotent (upsert by slug). Never touches download_url — Drive links are
 * pasted per-product via /admin/products (Google Drive link field).
 *
 *   node scripts/seed-imo-grade3-chapter-tests.js            (write to DB)
 *   node scripts/seed-imo-grade3-chapter-tests.js --dry-run  (validate only)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

const CAT_SLUG = 'imo-class-3-math';
const CAT_NAME = 'IMO Class 3 Mathematics';
const CAT_SORT = 28;
const IMG = '/wp-content/uploads';
const PRICE = 32, ORIGINAL = 45;
const COURSE = 'https://vidaara.org/olympiad/imo';

const BOOKS = [
  { chap: 'numbers', title: 'Numbers', pc: 52, short: 'Numbers', topics: '3- and 4-digit numbers, place value, expanded and standard form, comparing and ordering, rounding and estimation, Roman numerals, odd and even numbers and number patterns' },
  { chap: 'addition-and-subtraction', title: 'Addition and Subtraction', pc: 53, short: 'Addition & Subtraction', topics: '3- and 4-digit addition and subtraction with carrying and borrowing, estimation, missing numbers and word problems' },
  { chap: 'multiplication', title: 'Multiplication', pc: 53, short: 'Multiplication', topics: 'multiplication tables, 2- and 3-digit by 1-digit multiplication, multiplying by 10 and 100, properties and word problems' },
  { chap: 'division', title: 'Division', pc: 52, short: 'Division', topics: 'division facts, quotient and remainder, division by a 1-digit number, fact families and word problems' },
  { chap: 'fractions', title: 'Fractions', pc: 53, short: 'Fractions', topics: 'proper and equivalent fractions, comparing fractions, fraction of a collection and adding and subtracting like fractions' },
  { chap: 'money', title: 'Money', pc: 52, short: 'Money', topics: 'rupees and paise, converting between them, adding and subtracting money, bills and making change' },
  { chap: 'length-weight-and-capacity', title: 'Length, Weight and Capacity', pc: 52, short: 'Measurement', topics: 'length (mm, cm, m, km), weight (g, kg) and capacity (mL, L), unit conversions and word problems' },
  { chap: 'time', title: 'Time', pc: 52, short: 'Time', topics: 'reading the clock to the minute, a.m./p.m., the 24-hour clock, the calendar and elapsed time' },
  { chap: 'geometry', title: 'Geometry', pc: 62, short: 'Geometry', topics: '2-D and 3-D shapes, faces, edges and vertices, points, lines and angles, symmetry and perimeter' },
  { chap: 'data-handling', title: 'Data Handling', pc: 53, short: 'Data Handling', topics: 'pictographs and bar graphs with scales, tally marks, tables and interpreting data' },
];

const PRACTICE = {
  chap: '25-practice-papers', title: '25 Practice Papers', pc: 273, isPractice: true, short: '25 Practice Papers',
  topics: 'all ten Grade-3 chapters — numbers, addition and subtraction, multiplication, division, fractions, money, measurement, time, geometry and data handling',
};

const productSlug = (b) => b.isPractice ? 'imo-class-3-maths-25-practice-papers' : `imo-class-3-maths-${b.chap}-chapter-tests`;
const title = (b) => b.isPractice
  ? 'IMO Maths Olympiad Class 3 — 25 Sample Papers & Practice Papers: 750 MCQs with Solutions'
  : `IMO Maths Olympiad Class 3 ${b.title} — Chapter Worksheets: 100 MCQs with Answers`;
const coverFile = (b) => `${IMG}/${productSlug(b)}.jpg`;

function metaTitle(b) {
  let t = b.isPractice ? 'IMO Class 3 Maths Sample Papers PDF (750 MCQs)' : `Class 3 Maths Olympiad ${b.short} Worksheets PDF`;
  return t.length > 70 ? t.slice(0, 70) : t;
}
function metaDesc(b) {
  let d = b.isPractice
    ? 'IMO Maths Olympiad Class 3 sample & practice papers PDF: 25 papers, 750 MCQs across all chapters with answers and step-by-step solutions. SOF prep. Rs 32.'
    : `Maths Olympiad Class 3 ${b.title} worksheets PDF with answers: 100 IMO/SOF-pattern MCQs in 10 tests with step-by-step solutions. Rs 32.`;
  return d.length > 160 ? d.slice(0, 157).replace(/\s+\S*$/, '') + '…' : d;
}
const shortDesc = (b) => b.isPractice
  ? '25 full-length IMO Maths Olympiad Class 3 sample papers — 750 MCQs (30 per paper) balanced across every chapter, each with an answer key and step-by-step solutions. Instant PDF download.'
  : `100 IMO/SOF Maths Olympiad Class 3 ${b.title} MCQs with answers, arranged as 10 worksheets of 10 with an answer key and step-by-step solutions after each. Instant PDF download.`;

const description = (b) => (b.isPractice ? `
<p>The <strong>IMO Maths Olympiad Class 3 — 25 Practice Papers</strong> e-book is the ideal final-revision resource for the International Mathematics Olympiad (Class 3) — <strong>25 full-length sample papers, 750 MCQs</strong> in all, with answers and full solutions.</p>
<ul>
  <li><strong>25 practice / sample papers &times; 30 questions = 750 IMO-pattern MCQs</strong>, none repeated</li>
  <li>Every paper is <strong>balanced across all 10 Grade-3 chapters</strong> — just like the real SOF Olympiad</li>
  <li><strong>Answer key after every paper</strong> plus <strong>detailed step-by-step solutions</strong></li>
  <li>Colourful diagrams and figures wherever they help; graded intermediate to hard</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — perfect Class 3 Maths Olympiad sample papers and previous-year-style revision for IMO, iOM, NIMO and school exams</li>
</ul>
<p><strong>What these Class 3 Maths Olympiad papers cover:</strong> ${b.topics}.</p>
` : `
<p>The <strong>IMO Maths Olympiad Class 3 ${b.title} Chapter Worksheets</strong> e-book gives you <strong>100 Olympiad-pattern MCQs</strong> on <strong>${b.title}</strong>, arranged as <strong>10 worksheets of 10 questions</strong> — focused, chapter-wise <strong>Maths Olympiad for Class 3 worksheets PDF with answers</strong>.</p>
<ul>
  <li><strong>100 IMO / SOF-pattern Class 3 Maths MCQs</strong> on ${b.title}, graded intermediate to hard</li>
  <li><strong>10 short worksheets of 10</strong>, each with a complete <strong>answer key</strong> and <strong>step-by-step detailed solutions</strong></li>
  <li><strong>Key concepts, facts &amp; figures with colourful diagrams</strong> before you practise</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — ideal Class 3 IMO worksheets and sample-paper practice for IMO, iOM, NIMO and school Olympiads</li>
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
    console.log(`${productSlug(b).padEnd(50)} mt=${mt.length} md=${md.length} t=${t.length} sd=${sd.length}` + (flag ? '  !!' : ''));
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
    const slug = productSlug(b), grade = 'Class 3', board = 'IMO / Olympiad';
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
