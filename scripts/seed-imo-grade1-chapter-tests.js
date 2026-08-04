/**
 * seed-imo-grade1-chapter-tests.js
 *
 * Seeds the 8 chapter-wise "IMO Class 1 Maths Chapter Tests" MCQ e-books
 * (100 MCQs / 10 worksheets each) + the "25 Practice Papers" book (750 MCQs)
 * into the "IMO Class 1 Mathematics" category (imo-class-1-math, created if
 * missing), each with searchable SEO metadata, a rich HTML description and an
 * SEO-friendly slug + cover.
 *
 * PRICE: Rs 23 (was Rs 35). price_locked=1 so the repricer won't revert.
 * Idempotent (upsert by slug). Never touches download_url (that comes from
 * data/download-urls.json via scripts/import-download-urls.js).
 *
 *   node scripts/seed-imo-grade1-chapter-tests.js            (write to DB)
 *   node scripts/seed-imo-grade1-chapter-tests.js --dry-run  (validate only)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

const CAT_SLUG = 'imo-class-1-math';
const CAT_NAME = 'IMO Class 1 Mathematics';
const CAT_SORT = 26;
const IMG = '/wp-content/uploads';
const PRICE = 23, ORIGINAL = 35;
const COURSE = 'https://vidaara.org/olympiad/imo';

// chap = slug fragment + cover file; title = display; pc = pages; short = for meta_title;
// topics = concept list for the description.
const BOOKS = [
  { chap: 'numbers-0-100', title: 'Numbers 0–100', pc: 53, short: 'Numbers 0-100', topics: 'counting forward and backward, number names, place value (tens and ones), comparing and ordering, skip counting and odd and even numbers' },
  { chap: 'addition', title: 'Addition', pc: 53, short: 'Addition', topics: 'number bonds, adding on a number line, two-digit addition, missing numbers and word problems' },
  { chap: 'subtraction', title: 'Subtraction', pc: 53, short: 'Subtraction', topics: 'taking away, finding the difference, two-digit subtraction with borrowing, missing numbers and word problems' },
  { chap: 'shapes-and-patterns', title: 'Shapes and Patterns', pc: 55, short: 'Shapes & Patterns', topics: '2-D and 3-D shapes, sides and corners, repeating patterns and lines of symmetry' },
  { chap: 'measurement', title: 'Measurement', pc: 53, short: 'Measurement', topics: 'length, weight, capacity, time (days, months and the clock) and money' },
  { chap: 'data-handling', title: 'Data Handling', pc: 53, short: 'Data Handling', topics: 'picture graphs, tables and tally marks — counting, comparing and finding totals' },
  { chap: 'spatial-reasoning', title: 'Spatial Reasoning', pc: 53, short: 'Spatial Reasoning', topics: 'inside/outside, left/right, top/bottom, near/far and ordinal positions' },
  { chap: 'logical-reasoning', title: 'Logical Reasoning', pc: 53, short: 'Logical Reasoning', topics: 'odd one out, series, analogies, mirror images and picture coding' },
];

const PRACTICE = {
  chap: '25-practice-papers', title: '25 Practice Papers', pc: 267, isPractice: true, short: '25 Practice Papers',
  topics: 'all eight Grade-1 chapters — numbers, addition, subtraction, shapes and patterns, measurement, data handling, spatial reasoning and logical reasoning',
};

const productSlug = (b) => b.isPractice ? 'imo-class-1-maths-25-practice-papers' : `imo-class-1-maths-${b.chap}-chapter-tests`;
const title = (b) => b.isPractice
  ? 'IMO Class 1 Maths — 25 Practice Papers: 750 MCQs with Answer Keys & Solutions'
  : `IMO Class 1 Maths — ${b.title} Chapter Tests: 100 MCQs with Solutions`;
const coverFile = (b) => `${IMG}/${productSlug(b)}.jpg`;

function metaTitle(b) {
  let t = b.isPractice ? 'IMO Class 1 Maths 25 Practice Papers PDF (750 MCQs)' : `IMO Class 1 ${b.short} Test PDF`;
  return t.length > 70 ? t.slice(0, 70) : t;
}
function metaDesc(b) {
  let d = b.isPractice
    ? 'IMO Class 1 Maths: 25 full practice papers, 750 MCQs balanced across all 8 chapters, with answer keys and step-by-step solutions. Only Rs 23.'
    : `IMO Class 1 Maths ${b.title} chapter tests: 100 MCQs in 10 worksheets with answer keys and step-by-step solutions. Olympiad prep. Rs 23.`;
  return d.length > 160 ? d.slice(0, 157).replace(/\s+\S*$/, '') + '…' : d;
}
const shortDesc = (b) => b.isPractice
  ? '25 full-length IMO Class 1 practice papers — 750 MCQs (30 per paper) balanced across every chapter, each with its own answer key and step-by-step solutions. Instant PDF.'
  : `100 IMO-pattern MCQs on ${b.title}, arranged as 10 worksheets of 10 with an answer key and step-by-step solutions after each. Graded intermediate to hard. Instant PDF download.`;

const description = (b) => (b.isPractice ? `
<p>The <strong>IMO Class 1 Maths 25 Practice Papers</strong> e-book is the perfect final-revision resource for the International Mathematics Olympiad (Class 1) — <strong>25 full-length papers, 750 MCQs</strong> in all.</p>
<ul>
  <li><strong>25 practice papers &times; 30 questions = 750 IMO-pattern MCQs</strong>, none repeated</li>
  <li>Every paper is <strong>balanced across all 8 Grade-1 chapters</strong> — just like the real Olympiad</li>
  <li><strong>Answer key after every paper</strong> plus <strong>detailed step-by-step solutions</strong></li>
  <li>Colourful diagrams and figures wherever they help; graded intermediate to hard</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — ideal for IMO, IOM, iOM, NIMO and other Class-1 Maths Olympiads and school revision</li>
</ul>
<p><strong>What these papers cover:</strong> ${b.topics}.</p>
` : `
<p>The <strong>IMO Class 1 Maths ${b.title} Chapter Tests</strong> e-book gives you <strong>100 Olympiad-pattern MCQs</strong> on <strong>${b.title}</strong>, arranged as <strong>10 worksheets of 10 questions</strong> — focused, chapter-wise practice for the Class-1 Mathematics Olympiad.</p>
<ul>
  <li><strong>100 IMO-pattern MCQs</strong> on ${b.title}, graded from intermediate to hard</li>
  <li><strong>10 short worksheets of 10</strong>, each with a complete <strong>answer key</strong> and <strong>step-by-step detailed solutions</strong></li>
  <li><strong>Key concepts, facts &amp; figures with colourful diagrams</strong> before you practise</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — perfect for IMO, IOM, NIMO and other Class-1 Maths Olympiads and school practice</li>
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
  console.log('\n' + ALL.length + ' products for category "' + CAT_NAME + '" (' + CAT_SLUG + '). ' + (bad ? bad + ' LENGTH PROBLEMS' : 'All lengths OK.'));
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
    const slug = productSlug(b), grade = 'Class 1', board = 'IMO / Olympiad';
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
  console.log('Next: ensure data/download-urls.json has the imo-class-1-maths links, then run scripts/import-download-urls.js');
  await conn.end();
}
run().catch((e) => { console.error(e); process.exit(1); });
