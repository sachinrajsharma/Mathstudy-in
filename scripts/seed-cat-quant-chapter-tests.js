/**
 * seed-cat-quant-chapter-tests.js
 *
 * Seeds the 29 chapter-wise "CAT Quant Chapter Tests" MCQ e-books (150 MCQs /
 * 5 worksheets each) + the "30 Practice Papers" book into the "CAT Quantitative
 * Aptitude" category (cat-quant-math, created if missing), each with globally
 * searchable SEO metadata, a rich HTML description and an SEO-friendly slug + cover.
 *
 * PRICE: Rs 27 (was Rs 35). price_locked=1 so the repricer won't revert.
 * Idempotent (upsert by slug). Never touches download_url (that comes from
 * data/download-urls.json via scripts/import-download-urls.js).
 *
 *   node scripts/seed-cat-quant-chapter-tests.js            (write to DB)
 *   node scripts/seed-cat-quant-chapter-tests.js --dry-run  (validate only)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

const CAT_SLUG = 'cat-quant-math';
const CAT_NAME = 'CAT Quantitative Aptitude';
const CAT_SORT = 25;
const IMG = '/wp-content/uploads';
const PRICE = 27, ORIGINAL = 35;
const COURSE = 'https://vidaara.org/cat/quant';

// chap = slug fragment + cover file; title = display; pc = pages; short = for meta_title;
// topics = concept list for the description.
const BOOKS = [
  { chap: 'percentages', title: 'Percentages', pc: 66, short: 'Percentages', topics: 'percentage change, successive change, product-constancy and applications in profit, data interpretation and mixtures' },
  { chap: 'profit-loss-and-discount', title: 'Profit, Loss & Discount', pc: 56, short: 'Profit Loss & Discount', topics: 'cost price, selling price, markup, successive discounts and false-weight problems' },
  { chap: 'ratio-and-proportion', title: 'Ratio & Proportion', pc: 67, short: 'Ratio & Proportion', topics: 'ratios, proportion, componendo–dividendo, partnership and mean proportional' },
  { chap: 'averages', title: 'Averages', pc: 72, short: 'Averages', topics: 'simple, weighted and moving averages, and change-in-average problems' },
  { chap: 'mixtures-and-alligations', title: 'Mixtures & Alligations', pc: 72, short: 'Mixtures & Alligations', topics: 'the alligation rule, repeated replacement and multi-ingredient mixing' },
  { chap: 'simple-and-compound-interest', title: 'Simple & Compound Interest', pc: 66, short: 'Simple & Compound Interest', topics: 'simple interest, compound interest, the CI–SI difference and growth/depreciation' },
  { chap: 'time-and-work', title: 'Time & Work', pc: 61, short: 'Time & Work', topics: 'work rates, efficiency, pipes and cisterns, and wages' },
  { chap: 'time-speed-and-distance', title: 'Time, Speed & Distance', pc: 67, short: 'Time Speed & Distance', topics: 'speed, relative speed, trains, boats and streams, races and average speed' },
  { chap: 'linear-equations', title: 'Linear Equations', pc: 52, short: 'Linear Equations', topics: 'linear equations, systems, consistency conditions and word problems' },
  { chap: 'quadratic-equations', title: 'Quadratic Equations', pc: 56, short: 'Quadratic Equations', topics: 'roots, the discriminant, Vieta’s relations and applications' },
  { chap: 'inequalities', title: 'Inequalities', pc: 52, short: 'Inequalities', topics: 'linear, quadratic, rational and modulus inequalities and the AM–GM inequality' },
  { chap: 'functions-and-graphs', title: 'Functions & Graphs', pc: 58, short: 'Functions & Graphs', topics: 'domain, range, composition, even/odd functions and graph reading' },
  { chap: 'logarithms', title: 'Logarithms', pc: 53, short: 'Logarithms', topics: 'the laws of logarithms, change of base and applications' },
  { chap: 'sequences-and-series', title: 'Sequences & Series', pc: 53, short: 'Sequences & Series', topics: 'arithmetic, geometric and harmonic progressions and standard series sums' },
  { chap: 'maxima-and-minima', title: 'Maxima & Minima', pc: 52, short: 'Maxima & Minima', topics: 'maxima and minima using AM–GM and the quadratic vertex' },
  { chap: 'number-systems', title: 'Number System', pc: 52, short: 'Number System', topics: 'factors, divisibility, remainders, cyclicity and number properties' },
  { chap: 'hcf-and-lcm', title: 'HCF & LCM', pc: 53, short: 'HCF & LCM', topics: 'HCF, LCM, their relation and word problems on fractions and remainders' },
  { chap: 'factorials-and-unit-digits', title: 'Factorials & Unit Digits', pc: 52, short: 'Factorials & Unit Digits', topics: 'factorials, trailing zeros and unit-digit cyclicity' },
  { chap: 'fractions-and-decimals', title: 'Fractions & Decimals', pc: 52, short: 'Fractions & Decimals', topics: 'fractions, decimals, and terminating and recurring decimals' },
  { chap: 'lines-angles-and-triangles', title: 'Lines, Angles & Triangles', pc: 63, short: 'Lines Angles & Triangles', topics: 'lines, angles, triangle properties, similarity and the Pythagoras theorem' },
  { chap: 'circles', title: 'Circles', pc: 63, short: 'Circles', topics: 'chords, tangents, circle theorems, arcs and sectors' },
  { chap: 'quadrilaterals', title: 'Quadrilaterals', pc: 67, short: 'Quadrilaterals', topics: 'rectangle, square, parallelogram, rhombus and trapezium — properties and areas' },
  { chap: 'coordinate-geometry', title: 'Coordinate Geometry', pc: 52, short: 'Coordinate Geometry', topics: 'distance, section, slope, straight lines and area of a triangle' },
  { chap: 'mensuration-2d', title: 'Mensuration (2-D)', pc: 55, short: 'Mensuration 2D', topics: 'perimeter and area of plane figures' },
  { chap: 'mensuration-3d', title: 'Mensuration (3-D)', pc: 59, short: 'Mensuration 3D', topics: 'surface area and volume of cubes, cuboids, cylinders, cones and spheres' },
  { chap: 'permutations-and-combinations', title: 'Permutations & Combinations', pc: 61, short: 'Permutations & Combinations', topics: 'permutations, combinations, arrangements and selections' },
  { chap: 'probability', title: 'Probability', pc: 62, short: 'Probability', topics: 'classical probability, the addition rule and conditional probability' },
  { chap: 'set-theory', title: 'Set Theory', pc: 56, short: 'Set Theory', topics: 'Venn diagrams, union–intersection formulae and counting' },
  { chap: 'calendar-and-clocks', title: 'Calendar & Clocks', pc: 52, short: 'Calendar & Clocks', topics: 'odd days, calendars and the angle between clock hands' },
];

const PRACTICE = {
  chap: '30-practice-papers', title: '30 Practice Papers', pc: 346, isPractice: true, short: '30 Practice Papers',
  topics: 'all 29 CAT Quant chapters — arithmetic, algebra, geometry, mensuration, number system and modern maths',
};

const productSlug = (b) => b.isPractice ? 'cat-quant-30-practice-papers' : `cat-quant-${b.chap}-chapter-tests`;
const title = (b) => b.isPractice
  ? 'CAT Quant 30 Practice Papers — 900 MCQs with Answer Keys & Solutions'
  : `CAT Quant ${b.title} Chapter Tests — 150 MCQs with Solutions`;
const coverFile = (b) => `${IMG}/${productSlug(b)}.jpg`;

function metaTitle(b) {
  let t = b.isPractice ? 'CAT Quant 30 Practice Papers PDF (900 MCQs)' : `CAT ${b.short} Maths Chapter Test PDF`;
  return t.length > 70 ? t.slice(0, 70) : t;
}
function metaDesc(b) {
  let d = b.isPractice
    ? 'CAT Quant 30 full practice papers: 900 MCQs balanced across all 29 chapters, with answer keys and step-by-step solutions. Only Rs 27.'
    : `CAT Quant ${b.title} chapter tests: 150 MCQs in 5 worksheets with answer keys and step-by-step solutions. Best CAT prep. Rs 27.`;
  return d.length > 160 ? d.slice(0, 157).replace(/\s+\S*$/, '') + '…' : d;
}
const shortDesc = (b) => b.isPractice
  ? '30 full-length CAT Quant practice papers — 900 MCQs (30 per paper) balanced across every chapter, each with its own answer key and step-by-step solutions. Instant PDF.'
  : `150 CAT-pattern MCQs on ${b.title}, arranged as 5 worksheets of 30 with an answer key and step-by-step solutions after each. Graded easy to hard. Instant PDF download.`;

const description = (b) => (b.isPractice ? `
<p>The <strong>CAT Quant 30 Practice Papers</strong> e-book is the ultimate final-revision resource for the CAT Quantitative Aptitude section — <strong>30 full-length papers, 900 MCQs</strong> in all.</p>
<ul>
  <li><strong>30 practice papers &times; 30 questions = 900 CAT-pattern MCQs</strong></li>
  <li>Every paper is <strong>balanced across all 29 CAT Quant chapters</strong> — just like the real exam</li>
  <li><strong>Answer key after every paper</strong> plus <strong>detailed step-by-step solutions</strong></li>
  <li>Diagrams and figures wherever they help; graded easy to hard</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — ideal for the mock-test phase of CAT, XAT, SNAP, NMAT, CMAT and other MBA entrances</li>
</ul>
<p><strong>What these papers cover:</strong> ${b.topics}.</p>
` : `
<p>The <strong>CAT Quant ${b.title} Chapter Tests</strong> e-book gives you <strong>150 exam-pattern MCQs</strong> on <strong>${b.title}</strong>, arranged as <strong>5 worksheets of 30 questions</strong> — focused, chapter-wise practice for the CAT Quantitative Aptitude section.</p>
<ul>
  <li><strong>150 CAT-pattern MCQs</strong> on ${b.title}, graded from easy to hard</li>
  <li><strong>5 timed worksheets of 30</strong>, each with a complete <strong>answer key</strong> and <strong>step-by-step detailed solutions</strong></li>
  <li><strong>Formula, shortcut &amp; concept revision with figures</strong> before you practise</li>
  <li>Instant, print-ready <strong>A4 PDF</strong> — perfect for CAT, XAT, SNAP, NMAT, CMAT and other MBA / aptitude exams</li>
</ul>
<p><strong>Topics covered:</strong> ${b.topics}.</p>
`).trim().replace(/\s*\n\s*/g, ' ') +
` <p>Prepare the whole syllabus with the free <a href="${COURSE}" target="_blank" rel="noopener">CAT Quantitative Aptitude course at vidaara.org</a>, then test yourself chapter by chapter.</p>` +
` <p><em>Prepared by Sachin Sharma, Founder — vidaara.org (free e-learning platform).</em></p>`;

const ALL = [...BOOKS, PRACTICE];

function dryRun() {
  let bad = 0;
  for (const b of ALL) {
    const mt = metaTitle(b), md = metaDesc(b), t = title(b), sd = shortDesc(b);
    const flag = (mt.length > 70 || md.length > 160 || t.length > 220 || sd.length > 300);
    if (flag) bad++;
    console.log(`${productSlug(b).padEnd(45)} mt=${mt.length} md=${md.length} t=${t.length} sd=${sd.length}` + (flag ? '  !!' : ''));
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
    const slug = productSlug(b), grade = 'CAT', board = 'CAT / MBA';
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
  console.log('Next: ensure data/download-urls.json has the cat-quant links, then run scripts/import-download-urls.js');
  await conn.end();
}
run().catch((e) => { console.error(e); process.exit(1); });
