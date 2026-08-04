/**
 * seed-imo-grade2-chapter-tests.js
 *
 * Seeds the 10 chapter-wise "IMO Class 2 Maths Chapter Tests" MCQ e-books
 * (100 MCQs / 10 worksheets each) + the "30 Practice Papers" book (900 MCQs)
 * into the "IMO Class 2 Mathematics" category (imo-class-2-math, created if
 * missing), each with keyword-rich SEO metadata, a rich HTML description and an
 * SEO-friendly slug + cover.
 *
 * PRICE: Rs 32 (was Rs 45). price_locked=1 so the repricer won't revert.
 * Idempotent (upsert by slug). Never touches download_url (that comes from
 * data/download-urls.json via scripts/import-download-urls.js).
 *
 *   node scripts/seed-imo-grade2-chapter-tests.js            (write to DB)
 *   node scripts/seed-imo-grade2-chapter-tests.js --dry-run  (validate only)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

const CAT_SLUG = 'imo-class-2-math';
const CAT_NAME = 'IMO Class 2 Mathematics';
const CAT_SORT = 27;
const IMG = '/wp-content/uploads';
const PRICE = 32, ORIGINAL = 45;
const COURSE = 'https://vidaara.org/olympiad/imo';

// chap = slug fragment + cover file; title = display; pc = pages; short = meta;
// topics = concept list for the description.
const BOOKS = [
  { chap: 'numbers-0-1000', title: 'Numbers (0–1000)', pc: 53, short: 'Numbers 0-1000', topics: 'counting, number names, place value (hundreds, tens and ones), expanded and standard form, comparing and ordering, ordinal numbers, odd and even numbers and skip counting' },
  { chap: 'addition', title: 'Addition', pc: 53, short: 'Addition', topics: '2-digit and 3-digit addition, carrying, number bonds, missing numbers, mental addition and word problems' },
  { chap: 'subtraction', title: 'Subtraction', pc: 53, short: 'Subtraction', topics: '2-digit and 3-digit subtraction, borrowing, missing numbers and word problems' },
  { chap: 'multiplication', title: 'Multiplication', pc: 52, short: 'Multiplication', topics: 'equal groups, repeated addition, arrays, multiplication tables 2 to 10, multiplication facts and word problems' },
  { chap: 'division', title: 'Division', pc: 52, short: 'Division', topics: 'equal sharing, grouping, division facts, the relation with multiplication (fact families) and simple word problems' },
  { chap: 'fractions', title: 'Fractions', pc: 53, short: 'Fractions', topics: 'halves, thirds and quarters, equal parts, and identifying and comparing simple fractions' },
  { chap: 'geometry', title: 'Geometry', pc: 59, short: 'Geometry', topics: '2-D and 3-D shapes, faces, edges and vertices, lines and curves, symmetry and patterns' },
  { chap: 'measurement', title: 'Measurement', pc: 53, short: 'Measurement', topics: 'length, mass and capacity with standard units, time and the calendar, and money' },
  { chap: 'data-handling', title: 'Data Handling', pc: 53, short: 'Data Handling', topics: 'pictographs with a key, tally marks, simple tables and interpreting data' },
  { chap: 'logical-reasoning', title: 'Logical Reasoning', pc: 52, short: 'Logical Reasoning', topics: 'series, classification, analogy, coding-decoding, spatial reasoning and mirror images' },
];

const PRACTICE = {
  chap: '30-practice-papers', title: '30 Practice Papers', pc: 319, isPractice: true, short: '30 Practice Papers',
  topics: 'all ten Grade-2 chapters — numbers, addition, subtraction, multiplication, division, fractions, geometry, measurement, data handling and logical reasoning',
};

const productSlug = (b) => b.isPractice ? 'imo-class-2-maths-30-practice-papers' : `imo-class-2-maths-${b.chap}-chapter-tests`;
const title = (b) => b.isPractice
  ? 'IMO Maths Olympiad Class 2 — 30 Sample Papers & Practice Papers: 900 MCQs with Solutions'
  : `IMO Maths Olympiad Class 2 ${b.title} — Chapter Worksheets: 100 MCQs with Answers`;
const coverFile = (b) => `${IMG}/${productSlug(b)}.jpg`;

function metaTitle(b) {
  let t = b.isPractice ? 'IMO Class 2 Maths Sample Papers PDF (900 MCQs)' : `Class 2 Maths Olympiad ${b.short} Worksheets PDF`;
  return t.length > 70 ? t.slice(0, 70) : t;
}
function metaDesc(b) {
  let d = b.isPractice
    ? 'IMO Maths Olympiad Class 2 sample & practice papers PDF: 30 papers, 900 MCQs across all chapters with answers and step-by-step solutions. SOF prep. Rs 32.'
    : `Maths Olympiad Class 2 ${b.title} worksheets PDF with answers: 100 IMO/SOF-pattern MCQs in 10 tests with step-by-step solutions. Rs 32.`;
  return d.length > 160 ? d.slice(0, 157).replace(/\s+\S*$/, '') + '…' : d;
}
const shortDesc = (b) => b.isPractice
  ? '30 full-length IMO Maths Olympiad Class 2 sample papers — 900 MCQs (30 per paper) balanced across every chapter, each with an answer key and step-by-step solutions. Instant PDF download.'
  : `100 IMO/SOF Maths Olympiad Class 2 ${b.title} MCQs with answers, arranged as 10 worksheets of 10 with an answer key and step-by-step solutions after each. Instant PDF download.`;

const description = (b) => (b.isPractice ? `
<p>The <strong>IMO Maths Olympiad Class 2 — 30 Practice Papers</strong> e-book is the ideal final-revision resource for the International Mathematics Olympiad (Class 2) — <strong>30 full-length sample papers, 900 MCQs</strong> in all, with answers and full solutions.</p>
<ul>
  <li><strong>30 practice / sample papers &times; 30 questions = 900 IMO-pattern MCQs</strong>, none repeated</li>
  <li>Every paper is <strong>balanced across all 10 Grade-2 chapters</strong> — just like the real SOF Olympiad</li>
  <li><strong>Answer key after every paper</strong> plus <strong>detailed step-by-step solutions</strong></li>
  <li>Colourful diagrams and figures wherever they help; graded intermediate to hard</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — perfect Class 2 Maths Olympiad sample papers and previous-year-style revision for IMO, iOM, NIMO and school exams</li>
</ul>
<p><strong>What these Class 2 Maths Olympiad papers cover:</strong> ${b.topics}.</p>
` : `
<p>The <strong>IMO Maths Olympiad Class 2 ${b.title} Chapter Worksheets</strong> e-book gives you <strong>100 Olympiad-pattern MCQs</strong> on <strong>${b.title}</strong>, arranged as <strong>10 worksheets of 10 questions</strong> — focused, chapter-wise <strong>Maths Olympiad for Class 2 worksheets PDF with answers</strong>.</p>
<ul>
  <li><strong>100 IMO / SOF-pattern Class 2 Maths MCQs</strong> on ${b.title}, graded intermediate to hard</li>
  <li><strong>10 short worksheets of 10</strong>, each with a complete <strong>answer key</strong> and <strong>step-by-step detailed solutions</strong></li>
  <li><strong>Key concepts, facts &amp; figures with colourful diagrams</strong> before you practise</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — ideal Class 2 IMO worksheets and sample-paper practice for IMO, iOM, NIMO and school Olympiads</li>
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
    console.log(`${productSlug(b).padEnd(48)} mt=${mt.length} md=${md.length} t=${t.length} sd=${sd.length}` + (flag ? '  !!' : ''));
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
    const slug = productSlug(b), grade = 'Class 2', board = 'IMO / Olympiad';
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
  console.log('Next: ensure data/download-urls.json has the imo-class-2-maths links, then run scripts/import-download-urls.js');
  await conn.end();
}
run().catch((e) => { console.error(e); process.exit(1); });
