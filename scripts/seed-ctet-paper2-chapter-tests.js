/**
 * seed-ctet-paper2-chapter-tests.js
 *
 * Seeds the 14 chapter-wise "CTET Paper 2 Maths Chapter Tests" MCQ e-books
 * (150 MCQs / 5 worksheets each) + the "30 Practice Papers" book into the
 * "CTET Paper 2 Mathematics" category (ctet-paper-2-math, created if missing),
 * each with globally-searchable SEO metadata, a rich HTML description and its
 * own SEO-friendly slug + cover.
 *
 * PRICE: Rs 23 (was Rs 35). Seeded with price_locked=1 so the bulk repricer does
 * NOT revert them.
 *
 * Idempotent (upsert by slug). Never touches download_url — that comes from
 * data/download-urls.json via scripts/import-download-urls.js.
 *
 *   node scripts/seed-ctet-paper2-chapter-tests.js            (write to DB)
 *   node scripts/seed-ctet-paper2-chapter-tests.js --dry-run  (validate only)
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

const CAT_SLUG = 'ctet-paper-2-math';
const CAT_NAME = 'CTET Paper 2 Mathematics';
const CAT_SORT = 24;
const IMG = '/wp-content/uploads';
const PRICE = 23, ORIGINAL = 35;
const COURSE = 'https://vidaara.org/ctet/paper-2';

// ch = display name; chap = slug fragment + cover file; pc = pages;
// topics = concept list for the description; metaTitle <=70; metaDesc <=160.
const BOOKS = [
  { ch: 'Number System', chap: 'number-system', pc: 64,
    topics: 'place value and face value, the Indian and International systems of numeration, comparing large numbers, estimation, rounding and Roman numerals',
    metaTitle: 'CTET Paper 2 Number System Maths Test PDF',
    metaDesc: 'CTET Paper 2 Maths Number System chapter tests: 150 MCQs in 5 worksheets with answer keys and step-by-step solutions. CTET Paper II prep. Rs 23.' },
  { ch: 'Playing with Numbers', chap: 'playing-with-numbers', pc: 66,
    topics: 'factors and multiples, prime and composite numbers, divisibility rules, prime factorisation, HCF and LCM',
    metaTitle: 'CTET Paper 2 Playing with Numbers Maths Test PDF',
    metaDesc: 'CTET Paper 2 Maths Playing with Numbers chapter tests: 150 MCQs on factors, primes, HCF and LCM with answer keys and full solutions. Rs 23.' },
  { ch: 'Whole Numbers', chap: 'whole-numbers', pc: 64,
    topics: 'the number line, successor and predecessor, and the properties of the four operations',
    metaTitle: 'CTET Paper 2 Whole Numbers Maths Chapter Test PDF',
    metaDesc: 'CTET Paper 2 Maths Whole Numbers chapter tests: 150 MCQs in 5 worksheets with answer keys and step-by-step solutions. CTET Paper II prep. Rs 23.' },
  { ch: 'Negative Numbers and Integers', chap: 'negative-numbers-and-integers', pc: 64,
    topics: 'integers on the number line, ordering, absolute value and the rules of signs for all four operations',
    metaTitle: 'CTET Paper 2 Integers Maths Chapter Test PDF',
    metaDesc: 'CTET Paper 2 Maths Negative Numbers and Integers chapter tests: 150 MCQs with answer keys and detailed step-by-step solutions. CTET prep. Rs 23.' },
  { ch: 'Fractions and Decimals', chap: 'fractions-and-decimals', pc: 60,
    topics: 'types of fractions, equivalent fractions, the four operations, and conversion between fractions, decimals and percentages',
    metaTitle: 'CTET Paper 2 Fractions & Decimals Maths Test PDF',
    metaDesc: 'CTET Paper 2 Maths Fractions and Decimals chapter tests: 150 MCQs in 5 worksheets with answer keys and full step-by-step solutions. Rs 23.' },
  { ch: 'Introduction to Algebra', chap: 'introduction-to-algebra', pc: 64,
    topics: 'variables, constants, terms and coefficients, forming and simplifying expressions, and solving simple linear equations',
    metaTitle: 'CTET Paper 2 Algebra Maths Chapter Test PDF',
    metaDesc: 'CTET Paper 2 Maths Introduction to Algebra chapter tests: 150 MCQs on expressions and equations with answer keys and full solutions. Rs 23.' },
  { ch: 'Exponents, Powers and Identities', chap: 'exponents-powers-and-identities', pc: 60,
    topics: 'powers, the laws of exponents, standard (scientific) form and the basic algebraic identities',
    metaTitle: 'CTET Paper 2 Exponents & Powers Maths Test PDF',
    metaDesc: 'CTET Paper 2 Maths Exponents, Powers and Identities chapter tests: 150 MCQs with answer keys and step-by-step solutions. CTET Paper II. Rs 23.' },
  { ch: 'Ratio and Proportion', chap: 'ratio-and-proportion', pc: 66,
    topics: 'ratio in simplest form, proportion, the unitary method, percentage, and direct and inverse variation',
    metaTitle: 'CTET Paper 2 Ratio and Proportion Maths Test PDF',
    metaDesc: 'CTET Paper 2 Maths Ratio and Proportion chapter tests: 150 MCQs on ratio, proportion, unitary method and percentage with full solutions. Rs 23.' },
  { ch: 'Basic Geometrical Ideas (2-D)', chap: 'basic-geometrical-ideas-2d', pc: 64,
    topics: 'points, lines, rays, line segments, angles, polygons and the terms of a circle',
    metaTitle: 'CTET Paper 2 Basic Geometrical Ideas Maths Test',
    metaDesc: 'CTET Paper 2 Maths Basic Geometrical Ideas (2-D) chapter tests: 150 MCQs on points, lines, angles and polygons with full solutions. Rs 23.' },
  { ch: 'Understanding Elementary Shapes', chap: 'understanding-elementary-shapes', pc: 64,
    topics: 'types of angles, classification of triangles and quadrilaterals, 3-D solids and Euler’s formula',
    metaTitle: 'CTET Paper 2 Elementary Shapes Maths Test PDF',
    metaDesc: 'CTET Paper 2 Maths Understanding Elementary Shapes chapter tests: 150 MCQs on angles, triangles and solids with answer keys and solutions. Rs 23.' },
  { ch: 'Symmetry', chap: 'symmetry', pc: 68,
    topics: 'line (reflection) symmetry, lines of symmetry of common figures and rotational symmetry',
    metaTitle: 'CTET Paper 2 Symmetry Maths Chapter Test PDF',
    metaDesc: 'CTET Paper 2 Maths Symmetry chapter tests: 150 MCQs in 5 worksheets on line and rotational symmetry, with full step-by-step solutions. Rs 23.' },
  { ch: 'Geometrical Constructions', chap: 'geometrical-constructions', pc: 77,
    topics: 'ruler-and-compass constructions — perpendicular bisector, angle bisector and standard angles',
    metaTitle: 'CTET Paper 2 Geometrical Constructions Maths Test',
    metaDesc: 'CTET Paper 2 Maths Geometrical Constructions chapter tests: 150 MCQs on ruler-and-compass constructions with answer keys and solutions. Rs 23.' },
  { ch: 'Mensuration', chap: 'mensuration', pc: 72,
    topics: 'perimeter and area of plane figures and the surface area and volume of cubes, cuboids and cylinders',
    metaTitle: 'CTET Paper 2 Mensuration Maths Chapter Test PDF',
    metaDesc: 'CTET Paper 2 Maths Mensuration chapter tests: 150 MCQs on perimeter, area, surface area and volume, with answer keys and full solutions. Rs 23.' },
  { ch: 'Data Handling', chap: 'data-handling', pc: 69,
    topics: 'tally marks, frequency tables, pictographs, bar graphs and finding the average (mean)',
    metaTitle: 'CTET Paper 2 Data Handling Maths Test PDF',
    metaDesc: 'CTET Paper 2 Maths Data Handling chapter tests: 150 MCQs on tally marks, pictographs, bar graphs and averages, with full solutions. Rs 23.' },
];

const PRACTICE = {
  ch: '30 Practice Papers', chap: '30-practice-papers', pc: 375, isPractice: true,
  topics: 'all Paper II maths chapters — number system, operations, fractions, algebra, exponents, ratio, geometry, mensuration and data handling',
  metaTitle: 'CTET Paper 2 Maths 30 Practice Papers PDF (900 MCQs)',
  metaDesc: 'CTET Paper 2 Maths 30 full practice papers: 900 MCQs balanced across all 14 chapters, with answer keys and step-by-step solutions. Only Rs 23.',
};

const productSlug = (b) => b.isPractice ? 'ctet-paper-2-maths-30-practice-papers'
                                        : `ctet-paper-2-maths-${b.chap}-chapter-tests`;
const title = (b) => b.isPractice
  ? 'CTET Paper 2 Maths 30 Practice Papers — 900 MCQs with Answer Keys & Solutions'
  : `CTET Paper 2 Maths ${b.ch} Chapter Tests — 150 MCQs with Solutions`;
const coverFile = (b) => b.isPractice ? `${IMG}/ctet-paper-2-maths-30-practice-papers.jpg`
                                      : `${IMG}/ctet-paper-2-maths-${b.chap}-chapter-tests.jpg`;

const shortDesc = (b) => b.isPractice
  ? '30 full-length CTET Paper 2 Maths practice papers — 900 MCQs (30 per paper) balanced across every chapter, each with its own answer key and step-by-step solutions. Instant PDF.'
  : `150 CTET Paper II pattern MCQs on ${b.ch}, arranged as 5 worksheets of 30 with an answer key and step-by-step solutions after each. Balanced content + pedagogy. Instant PDF download.`;

const description = (b) => (b.isPractice ? `
<p>The <strong>CTET Paper 2 Maths 30 Practice Papers</strong> e-book is the ultimate final-revision resource for the CTET Paper II (Classes VI–VIII) Mathematics section — <strong>30 full-length papers, 900 MCQs</strong> in all.</p>
<ul>
  <li><strong>30 practice papers &times; 30 questions = 900 CTET-pattern MCQs</strong></li>
  <li>Every paper is <strong>balanced across all 14 Paper II maths chapters</strong> — just like the real exam</li>
  <li><strong>Answer key after every paper</strong> plus <strong>detailed step-by-step solutions</strong></li>
  <li>Diagrams and figures wherever they help; competency-based and NEP-2020 aligned</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — ideal for the mock-test phase of CTET, State TET (UPTET, REET, HTET, MPTET) and TGT/PGT maths exams</li>
</ul>
<p><strong>What these papers cover:</strong> ${b.topics}.</p>
` : `
<p>The <strong>CTET Paper 2 Maths ${b.ch} Chapter Tests</strong> e-book gives you <strong>150 exam-pattern MCQs</strong> on <strong>${b.ch}</strong>, arranged as <strong>5 worksheets of 30 questions</strong> — focused, chapter-wise practice for the CTET Paper II (Classes VI–VIII) Mathematics &amp; Science section.</p>
<ul>
  <li><strong>150 CTET Paper II pattern MCQs</strong> on ${b.ch}, graded from easy to difficult</li>
  <li><strong>5 timed worksheets of 30</strong>, each with a complete <strong>answer key</strong> and <strong>step-by-step detailed solutions</strong></li>
  <li>A balanced mix of <strong>content and pedagogy</strong> questions, exactly as CTET Paper II asks</li>
  <li><strong>Formula, identity &amp; concept revision with colourful diagrams</strong> before you practise</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — perfect for CTET Paper 2, State TET (UPTET, REET, HTET, MPTET) and upper-primary maths teacher exams</li>
</ul>
<p><strong>Topics covered:</strong> ${b.topics}.</p>
`).trim().replace(/\s*\n\s*/g, ' ') +
` <p>Prepare the whole syllabus with the free <a href="${COURSE}" target="_blank" rel="noopener">CTET Paper II Mathematics course at vidaara.org</a>, then test yourself chapter by chapter.</p>` +
` <p><em>Prepared by Sachin Sharma, Founder — vidaara.org (free e-learning platform).</em></p>`;

const ALL = [...BOOKS, PRACTICE];

function dryRun() {
  for (const b of ALL) {
    const s = productSlug(b), t = title(b), sd = shortDesc(b);
    console.log('\n' + '-'.repeat(78));
    console.log('title       ' + t + `   [${t.length}/220]`);
    console.log('slug        ' + s);
    console.log('cover       ' + coverFile(b));
    console.log('price       Rs.' + PRICE + '  (was Rs.' + ORIGINAL + ')  [locked]  pages ' + b.pc);
    console.log(`meta_title  ${b.metaTitle}   [${b.metaTitle.length}/70]` + (b.metaTitle.length > 70 ? '  !! TOO LONG' : ''));
    console.log(`meta_desc   ${b.metaDesc}   [${b.metaDesc.length}/160]` + (b.metaDesc.length > 160 ? '  !! TOO LONG' : ''));
    console.log(`short_desc  [${sd.length}/300]` + (sd.length > 300 ? '  !! TOO LONG' : ''));
  }
  const bad = ALL.filter(b => b.metaTitle.length > 70 || b.metaDesc.length > 160 || title(b).length > 220 || shortDesc(b).length > 300);
  console.log('\n' + ALL.length + ' products would be written into category "' + CAT_NAME + '" (slug ' + CAT_SLUG + ').');
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
    const grade = 'CTET Paper 2', board = 'CTET';
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
  console.log('Next: ensure data/download-urls.json has the ctet-paper-2 links, then run scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
