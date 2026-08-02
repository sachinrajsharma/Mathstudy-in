/**
 * seed-ctet-paper1-chapter-tests.js
 *
 * Seeds the 17 chapter-wise "CTET Paper 1 Maths Chapter Tests" MCQ e-books
 * (150 MCQs / 5 worksheets each) + the "30 Practice Papers" book into the
 * "CTET Paper 1 Mathematics" category (ctet-paper-1-math, created if missing),
 * each with globally-searchable SEO metadata, a rich HTML description and its
 * own SEO-friendly slug + cover.
 *
 * PRICE: Rs 23 (was Rs 35). Seeded with price_locked=1 so the bulk repricer does
 * NOT revert them.
 *
 * Idempotent (upsert by slug). Never touches download_url — that comes from
 * data/download-urls.json via scripts/import-download-urls.js.
 *
 *   node scripts/seed-ctet-paper1-chapter-tests.js            (write to DB)
 *   node scripts/seed-ctet-paper1-chapter-tests.js --dry-run  (validate only)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

const CAT_SLUG = 'ctet-paper-1-math';
const CAT_NAME = 'CTET Paper 1 Mathematics';
const CAT_SORT = 23;
const IMG = '/wp-content/uploads';
const PRICE = 23, ORIGINAL = 35;
const COURSE = 'https://vidaara.org/ctet/paper-1';

// ch = display name; chap = slug fragment + cover file; pc = pages;
// topics = concept list for the description; metaTitle <=70; metaDesc <=160.
const BOOKS = [
  { ch: 'Plane Shapes (2-D Shapes)', chap: 'plane-shapes-2d-shapes', pc: 73,
    topics: 'circles, triangles, squares, rectangles and polygons, their sides and vertices, and curved vs straight boundaries',
    metaTitle: 'CTET Paper 1 Plane Shapes Maths Chapter Test PDF',
    metaDesc: 'CTET Paper 1 Maths Plane Shapes (2-D Shapes) chapter tests: 150 MCQs in 5 worksheets with answer keys and step-by-step solutions. Only Rs 23.' },
  { ch: 'Properties of Shapes', chap: 'properties-of-shapes', pc: 90,
    topics: 'sides, corners and equal sides of 2-D shapes and spatial position words (above/below, inside/outside, near/far)',
    metaTitle: 'CTET Paper 1 Properties of Shapes Maths Test PDF',
    metaDesc: 'CTET Paper 1 Maths Properties of Shapes chapter tests: 150 MCQs in 5 worksheets with answer keys and detailed solutions. CTET Paper I prep. Rs 23.' },
  { ch: 'Geometrical Concepts', chap: 'geometrical-concepts', pc: 79,
    topics: 'points, lines, line segments, rays, and open and closed figures',
    metaTitle: 'CTET Paper 1 Geometrical Concepts Maths Test PDF',
    metaDesc: 'CTET Paper 1 Maths Geometrical Concepts chapter tests: 150 MCQs in 5 worksheets with answer keys and step-by-step solutions. Best CTET prep. Rs 23.' },
  { ch: 'Symmetry', chap: 'symmetry', pc: 66,
    topics: 'lines of symmetry, symmetric shapes and the number of lines of symmetry in common figures',
    metaTitle: 'CTET Paper 1 Symmetry Maths Chapter Test PDF',
    metaDesc: 'CTET Paper 1 Maths Symmetry chapter tests: 150 MCQs in 5 worksheets with answer keys and detailed step-by-step solutions. CTET Paper I prep. Rs 23.' },
  { ch: 'Shapes and Spatial Understanding', chap: 'shapes-spatial-understanding', pc: 66,
    topics: 'recognising and combining shapes, position and direction, and visualising 2-D and 3-D figures',
    metaTitle: 'CTET Paper 1 Shapes & Spatial Maths Test PDF',
    metaDesc: 'CTET Paper 1 Maths Shapes and Spatial Understanding chapter tests: 150 MCQs in 5 worksheets with answer keys and full solutions. CTET prep. Rs 23.' },
  { ch: 'Solids Around Us', chap: 'solids-around-us', pc: 76,
    topics: 'cubes, cuboids, spheres, cylinders and cones, their faces, edges and vertices, and real-life examples',
    metaTitle: 'CTET Paper 1 Solids Around Us Maths Test PDF',
    metaDesc: 'CTET Paper 1 Maths Solids Around Us chapter tests: 150 MCQs in 5 worksheets on 3-D shapes with answer keys and step-by-step solutions. Rs 23.' },
  { ch: 'Numbers', chap: 'numbers', pc: 70,
    topics: 'place value, number names, expanded form, comparing and ordering, odd and even numbers and Roman numerals',
    metaTitle: 'CTET Paper 1 Numbers Maths Chapter Test PDF',
    metaDesc: 'CTET Paper 1 Maths Numbers chapter tests: 150 MCQs in 5 worksheets on place value, comparison and Roman numerals, with full solutions. Rs 23.' },
  { ch: 'Addition and Subtraction', chap: 'addition-and-subtraction', pc: 57,
    topics: 'addition and subtraction with carrying and borrowing, mental-maths strategies, estimation and word problems',
    metaTitle: 'CTET Paper 1 Addition & Subtraction Maths Test',
    metaDesc: 'CTET Paper 1 Maths Addition and Subtraction chapter tests: 150 MCQs in 5 worksheets with answer keys and step-by-step solutions. CTET prep. Rs 23.' },
  { ch: 'Multiplication', chap: 'multiplication', pc: 70,
    topics: 'multiplication as repeated addition, arrays, tables and the key properties of multiplication',
    metaTitle: 'CTET Paper 1 Multiplication Maths Test PDF',
    metaDesc: 'CTET Paper 1 Maths Multiplication chapter tests: 150 MCQs in 5 worksheets with answer keys and detailed step-by-step solutions. CTET Paper I. Rs 23.' },
  { ch: 'Division', chap: 'division', pc: 72,
    topics: 'division as equal sharing and grouping, division facts, quotient and remainder and long division',
    metaTitle: 'CTET Paper 1 Division Maths Chapter Test PDF',
    metaDesc: 'CTET Paper 1 Maths Division chapter tests: 150 MCQs in 5 worksheets with answer keys and step-by-step solutions. Best CTET Paper I practice. Rs 23.' },
  { ch: 'Measurement', chap: 'measurement', pc: 67,
    topics: 'non-standard and standard units of length, unit conversion, perimeter and estimation',
    metaTitle: 'CTET Paper 1 Measurement Maths Test PDF',
    metaDesc: 'CTET Paper 1 Maths Measurement chapter tests: 150 MCQs in 5 worksheets on length, conversion and perimeter, with full solutions. Rs 23.' },
  { ch: 'Weight (Mass)', chap: 'weight-mass', pc: 79,
    topics: 'heavy and light, grams and kilograms, unit conversion, the balance and word problems',
    metaTitle: 'CTET Paper 1 Weight (Mass) Maths Test PDF',
    metaDesc: 'CTET Paper 1 Maths Weight (Mass) chapter tests: 150 MCQs in 5 worksheets with answer keys and step-by-step solutions. CTET Paper I prep. Rs 23.' },
  { ch: 'Time', chap: 'time', pc: 78,
    topics: 'reading clocks, 12-hour time, units of time, the calendar and elapsed time',
    metaTitle: 'CTET Paper 1 Time Maths Chapter Test PDF',
    metaDesc: 'CTET Paper 1 Maths Time chapter tests: 150 MCQs in 5 worksheets on clocks, calendars and elapsed time, with full step-by-step solutions. Rs 23.' },
  { ch: 'Volume (Capacity)', chap: 'volume-capacity', pc: 81,
    topics: 'capacity, litres and millilitres, unit conversion and measuring liquids',
    metaTitle: 'CTET Paper 1 Volume (Capacity) Maths Test PDF',
    metaDesc: 'CTET Paper 1 Maths Volume (Capacity) chapter tests: 150 MCQs in 5 worksheets on litres and millilitres, with answer keys and full solutions. Rs 23.' },
  { ch: 'Data Handling', chap: 'data-handling', pc: 71,
    topics: 'data collection, tally marks, tables, pictographs and bar graphs',
    metaTitle: 'CTET Paper 1 Data Handling Maths Test PDF',
    metaDesc: 'CTET Paper 1 Maths Data Handling chapter tests: 150 MCQs in 5 worksheets on tally marks, pictographs and bar graphs, with full solutions. Rs 23.' },
  { ch: 'Patterns', chap: 'patterns', pc: 75,
    topics: 'number patterns, shape patterns, pattern rules and finding missing terms',
    metaTitle: 'CTET Paper 1 Patterns Maths Chapter Test PDF',
    metaDesc: 'CTET Paper 1 Maths Patterns chapter tests: 150 MCQs in 5 worksheets on number and shape patterns, with answer keys and step-by-step solutions. Rs 23.' },
  { ch: 'Money', chap: 'money', pc: 81,
    topics: 'Indian currency (coins and notes), counting money, making amounts, change and word problems',
    metaTitle: 'CTET Paper 1 Money Maths Chapter Test PDF',
    metaDesc: 'CTET Paper 1 Maths Money chapter tests: 150 MCQs in 5 worksheets on Indian currency, change and word problems, with full solutions. Rs 23.' },
];

const PRACTICE = {
  ch: '30 Practice Papers', chap: '30-practice-papers', pc: 431, isPractice: true,
  topics: 'all Paper I maths chapters — numbers, operations, geometry, measurement, time, money, data handling and patterns',
  metaTitle: 'CTET Paper 1 Maths 30 Practice Papers PDF (900 MCQs)',
  metaDesc: 'CTET Paper 1 Maths 30 full practice papers: 900 MCQs balanced across all chapters, with answer keys and step-by-step solutions. Only Rs 23.',
};

const productSlug = (b) => b.isPractice ? 'ctet-paper-1-maths-30-practice-papers'
                                        : `ctet-paper-1-maths-${b.chap}-chapter-tests`;
const title = (b) => b.isPractice
  ? 'CTET Paper 1 Maths 30 Practice Papers — 900 MCQs with Answer Keys & Solutions'
  : `CTET Paper 1 Maths ${b.ch} Chapter Tests — 150 MCQs with Solutions`;
const coverFile = (b) => b.isPractice ? `${IMG}/ctet-paper-1-maths-30-practice-papers.jpg`
                                      : `${IMG}/ctet-paper-1-maths-${b.chap}-chapter-tests.jpg`;

const shortDesc = (b) => b.isPractice
  ? '30 full-length CTET Paper 1 Maths practice papers — 900 MCQs (30 per paper) balanced across every chapter, each with its own answer key and step-by-step solutions. Instant PDF.'
  : `150 CTET Paper I pattern MCQs on ${b.ch}, arranged as 5 worksheets of 30 with an answer key and step-by-step solutions after each. Balanced content + pedagogy. Instant PDF download.`;

const description = (b) => (b.isPractice ? `
<p>The <strong>CTET Paper 1 Maths 30 Practice Papers</strong> e-book is the ultimate final-revision resource for the CTET Paper I (Classes I–V) Mathematics section — <strong>30 full-length papers, 900 MCQs</strong> in all.</p>
<ul>
  <li><strong>30 practice papers &times; 30 questions = 900 CTET-pattern MCQs</strong></li>
  <li>Every paper is <strong>balanced across all Paper I maths chapters</strong> — just like the real exam</li>
  <li><strong>Answer key after every paper</strong> plus <strong>detailed step-by-step solutions</strong></li>
  <li>Diagrams and figures wherever they help; competency-based and NEP-2020 aligned</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — ideal for the mock-test phase of CTET, State TET (UPTET, REET, HTET, MPTET) and primary-teacher exams</li>
</ul>
<p><strong>What these papers cover:</strong> ${b.topics}.</p>
` : `
<p>The <strong>CTET Paper 1 Maths ${b.ch} Chapter Tests</strong> e-book gives you <strong>150 exam-pattern MCQs</strong> on <strong>${b.ch}</strong>, arranged as <strong>5 worksheets of 30 questions</strong> — focused, chapter-wise practice for the CTET Paper I (Classes I–V) Mathematics section.</p>
<ul>
  <li><strong>150 CTET Paper I pattern MCQs</strong> on ${b.ch}, graded from easy to difficult</li>
  <li><strong>5 timed worksheets of 30</strong>, each with a complete <strong>answer key</strong> and <strong>step-by-step detailed solutions</strong></li>
  <li>A balanced mix of <strong>content and pedagogy</strong> questions, exactly as CTET Paper I asks</li>
  <li><strong>Formula &amp; concept revision with colourful diagrams</strong> before you practise</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — perfect for CTET, CTET Paper 1, State TET (UPTET, REET, HTET, MPTET) and primary-teacher recruitment exams</li>
</ul>
<p><strong>Topics covered:</strong> ${b.topics}.</p>
`).trim().replace(/\s*\n\s*/g, ' ') +
` <p>Prepare the whole syllabus with the free <a href="${COURSE}" target="_blank" rel="noopener">CTET Paper I Mathematics course at vidaara.org</a>, then test yourself chapter by chapter.</p>` +
` <p><em>Prepared by Sachin Sharma, Founder — vidaara.org (free e-learning platform).</em></p>`;

const ALL = [...BOOKS, PRACTICE];

function dryRun() {
  for (const b of ALL) {
    const s = productSlug(b), t = title(b), sd = shortDesc(b);
    console.log('\n' + '-'.repeat(78));
    console.log('title       ' + t + `   [${t.length}/220]`);
    console.log('slug        ' + s);
    console.log('cover       ' + coverFile(b));
    console.log('price       Rs.' + PRICE + '  (was Rs.' + ORIGINAL + ')  [locked]');
    console.log(`meta_title  ${b.metaTitle}   [${b.metaTitle.length}/70]` + (b.metaTitle.length>70?'  !! TOO LONG':''));
    console.log(`meta_desc   ${b.metaDesc}   [${b.metaDesc.length}/160]` + (b.metaDesc.length>160?'  !! TOO LONG':''));
    console.log(`short_desc  [${sd.length}/300]` + (sd.length>300?'  !! TOO LONG':''));
  }
  const bad = ALL.filter(b => b.metaTitle.length>70 || b.metaDesc.length>160 || title(b).length>220 || shortDesc(b).length>300);
  console.log('\n' + ALL.length + ' products would be written into category "' + CAT_SLUG + '" (slug ' + CAT_SLUG + ').');
  console.log(bad.length ? ('LENGTH PROBLEMS in ' + bad.length + ' product(s)') : 'All field lengths OK.');
}

async function run() {
  if (process.argv.includes('--dry-run')) return dryRun();
  const conn = await mysql.createConnection(cfg);

  let [[cat]] = await conn.query(`SELECT id FROM categories WHERE slug=?`, [CAT_SLUG]);
  if (!cat) {
    await conn.query(`INSERT INTO categories (name, slug, sort_order) VALUES (?,?,?)`, [CAT_NAME, CAT_SLUG, CAT_SORT]);
    [[cat]] = await conn.query(`SELECT id FROM categories WHERE slug=?`, [CAT_SLUG]);
    console.log(`Created category "${CAT_SLUG}" -> id ${cat.id}`);
  } else {
    console.log(`Category "${CAT_SLUG}" -> id ${cat.id}`);
  }

  let added = 0, updated = 0;
  for (const b of ALL) {
    const slug = productSlug(b);
    const grade = 'CTET Paper 1', board = 'CTET';
    const [[existing]] = await conn.query(`SELECT id FROM products WHERE slug=?`, [slug]);
    if (existing) {
      await conn.query(
        `UPDATE products SET title=?,slug=?,description=?,short_desc=?,category_id=?,
         price=IF(price_locked=1,price,?),original_price=IF(price_locked=1,original_price,?),
         cover_image=?,page_count=?,grade=?,board=?,meta_title=?,meta_desc=?,
         is_published=1,price_locked=1 WHERE id=?`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         coverFile(b), b.pc, grade, board, b.metaTitle, b.metaDesc, existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,price_locked,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,1,?)`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         coverFile(b), b.pc, grade, board, b.metaTitle, b.metaDesc, b.isPractice ? 1 : 0]);
      added++; console.log('  added    ' + slug);
    }
  }

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=?`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated. "${CAT_SLUG}" now holds ${total.n} products.`);
  console.log('Prices seeded at Rs ' + PRICE + '/' + ORIGINAL + ' with price_locked=1.');
  console.log('Next: ensure data/download-urls.json has the ctet-paper-1 links, then run scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
