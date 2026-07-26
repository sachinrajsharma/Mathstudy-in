/**
 * seed-grade3-worksheets.js
 *
 * Seeds the 18 chapter-wise Grade 3 Maths Worksheet e-books into the existing
 * "Grade 3 Math" category (grade-3-math), each with globally-searchable SEO
 * metadata, a rich HTML description and its own cover. The chapter list mirrors
 * the free study material at vidaara.org/courses/math/class-3 exactly, and every
 * product deep-links to its OWN chapter study page.
 *
 * Every book: 20 printable one-page worksheets with a Name / Date / Score line,
 * ~191-238 unique questions, diagram-rich, and a full answer key. 25-26pp PDF.
 *
 * Idempotent — matches on slug, updates in place, never touches download_url
 * (that comes from data/download-urls.json via scripts/import-download-urls.js).
 *
 *   node scripts/seed-grade3-worksheets.js            (write to DB)
 *   node scripts/seed-grade3-worksheets.js --dry-run  (print only)
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

const CAT_SLUG = 'grade-3-math';
const IMG = '/wp-content/uploads';
const PRICE = 35, ORIGINAL = 55;
const CLASS3 = 'https://vidaara.org/courses/math/class-3';

// pslug = product slug fragment (SEO-tuned, unique);
// chap  = class-3 chapter slug (study deep-link + cover file fragment).
const BOOKS = [
  {
    ch: 'Place Value to 10,000', pslug: 'place-value', chap: 'place-value', q: 210,
    topics: 'thousands, hundreds, tens and ones, place and face value, expanded and standard form, number names to 10,000, and rounding to the nearest 10, 100 and 1000',
    metaTitle: 'Grade 3 Place Value Worksheets PDF (to 10,000)',
    metaDesc: 'Grade 3 place value worksheets — 20 printable sheets, 210 questions on hundreds/tens/ones to 10,000, expanded form and rounding, with answer key. Instant PDF.',
  },
  {
    ch: 'Comparing & Ordering Numbers', pslug: 'comparing-ordering', chap: 'comparing-ordering', q: 226,
    topics: 'greater than, less than and equal to, comparing 3- and 4-digit numbers, ascending and descending order, number-line placement, and forming the greatest and smallest numbers',
    metaTitle: 'Grade 3 Comparing & Ordering Numbers Worksheets PDF',
    metaDesc: 'Grade 3 comparing and ordering worksheets — 20 printable sheets, 226 questions on greater/less than and ordering to 10,000, with answer key. Instant PDF.',
  },
  {
    ch: 'Addition with Regrouping', pslug: 'addition-with-regrouping', chap: 'addition-regrouping', q: 198,
    topics: '3-digit and 4-digit column addition with carrying, adding three numbers, missing digits, estimating sums by rounding, and addition word problems',
    metaTitle: 'Grade 3 Addition with Regrouping Worksheets PDF',
    metaDesc: 'Grade 3 addition worksheets — 20 printable sheets, 198 questions on 3 and 4-digit column addition with carrying and word problems, with answer key. PDF.',
  },
  {
    ch: 'Subtraction with Regrouping', pslug: 'subtraction-with-regrouping', chap: 'subtraction-regrouping', q: 196,
    topics: '3-digit and 4-digit column subtraction with borrowing, subtracting across zeros, checking by addition, and subtraction word problems',
    metaTitle: 'Grade 3 Subtraction with Regrouping Worksheets PDF',
    metaDesc: 'Grade 3 subtraction worksheets — 20 printable sheets, 196 questions on 3 and 4-digit borrowing, across zeros and word problems, with answer key. Instant PDF.',
  },
  {
    ch: 'Multiplication Facts (1-10)', pslug: 'multiplication-facts', chap: 'multiplication-facts', q: 215,
    topics: 'times tables 1 to 10, equal groups and arrays, skip counting, the commutative property, missing factors, and multiplication word problems',
    metaTitle: 'Grade 3 Multiplication Tables Worksheets PDF (1-10)',
    metaDesc: 'Grade 3 multiplication facts worksheets — 20 printable sheets, 215 questions on tables 1-10, arrays, skip counting and missing factors, with answer key. PDF.',
  },
  {
    ch: 'Multiplication: 2-digit by 1-digit', pslug: 'multiplication-2-digit-by-1-digit', chap: 'multiplication-2by1', q: 192,
    topics: 'multiplying tens and ones, the box (area) method, column multiplication with and without regrouping, estimating products, and word problems',
    metaTitle: 'Grade 3 2-Digit by 1-Digit Multiplication Worksheets',
    metaDesc: 'Grade 3 multiplication worksheets — 20 printable sheets, 192 questions on 2-digit by 1-digit, box method and column regrouping, with answer key. Instant PDF.',
  },
  {
    ch: 'Division Basics', pslug: 'division', chap: 'division', q: 204,
    topics: 'equal sharing and grouping, division as repeated subtraction, division facts, the multiplication-division link and fact families, simple remainders, and word problems',
    metaTitle: 'Grade 3 Division Worksheets PDF — Facts & Remainders',
    metaDesc: 'Grade 3 division worksheets — 20 printable sheets, 204 questions on sharing, grouping, division facts and remainders, with answer key. Instant PDF download.',
  },
  {
    ch: 'Fractions on a Number Line', pslug: 'fractions-on-a-number-line', chap: 'fractions-number-line', q: 196,
    topics: 'unit fractions, naming fractions of a whole, marking and reading fractions on a number line, simple equivalent fractions, and comparing fractions',
    metaTitle: 'Grade 3 Fractions on a Number Line Worksheets PDF',
    metaDesc: 'Grade 3 fractions worksheets — 20 printable sheets, 196 questions on unit fractions, number lines, equivalence and comparing, with answer key. Instant PDF.',
  },
  {
    ch: 'Money', pslug: 'money', chap: 'money', q: 238,
    topics: 'rupees and paise, counting notes and coins, rupee-paise conversion, adding and subtracting amounts, making bills and giving change',
    metaTitle: 'Grade 3 Money Worksheets PDF — Rupees & Paise',
    metaDesc: 'Grade 3 money worksheets — 20 printable sheets, 238 questions on rupees and paise, counting, bills and change, with answer key. Instant PDF download.',
  },
  {
    ch: 'Measurement: Length', pslug: 'length-measurement', chap: 'measurement-length', q: 220,
    topics: 'millimetres, centimetres, metres and kilometres, reading a ruler, estimating, comparing and ordering, unit conversions, and length word problems',
    metaTitle: 'Grade 3 Length Measurement Worksheets PDF (mm cm m km)',
    metaDesc: 'Grade 3 length worksheets — 20 printable sheets, 220 questions on mm/cm/m/km, ruler reading and conversions, with answer key. Instant PDF download.',
  },
  {
    ch: 'Measurement: Mass & Capacity', pslug: 'mass-and-capacity-measurement', chap: 'measurement-mass-capacity', q: 216,
    topics: 'grams and kilograms, millilitres and litres, reading balance scales and measuring jugs, estimating, unit conversions, and mass and capacity word problems',
    metaTitle: 'Grade 3 Mass & Capacity Worksheets PDF (g kg mL L)',
    metaDesc: 'Grade 3 mass and capacity worksheets — 20 printable sheets, 216 questions on grams, kilograms, millilitres and litres, with answer key. Instant PDF.',
  },
  {
    ch: 'Time', pslug: 'time', chap: 'time', q: 198,
    topics: 'reading clocks to the minute, minutes past and to, a.m. and p.m., converting hours and minutes, the calendar, and elapsed-time word problems',
    metaTitle: 'Grade 3 Time Worksheets PDF — Clock to the Minute',
    metaDesc: 'Grade 3 time worksheets — 20 printable sheets, 198 questions on reading clocks to the minute, a.m./p.m., calendar and elapsed time, with answer key. PDF.',
  },
  {
    ch: 'Perimeter', pslug: 'perimeter', chap: 'perimeter', q: 192,
    topics: 'perimeter as the distance around a shape, adding side lengths, perimeter of squares, rectangles and polygons, perimeter on grids, missing sides, and word problems',
    metaTitle: 'Grade 3 Perimeter Worksheets PDF — Squares & Rectangles',
    metaDesc: 'Grade 3 perimeter worksheets — 20 printable sheets, 192 questions on adding sides, squares, rectangles and grids, with answer key. Instant PDF download.',
  },
  {
    ch: 'Area (Counting Squares)', pslug: 'area-counting-squares', chap: 'area', q: 206,
    topics: 'area as the surface covered, counting unit squares and half squares, comparing and ordering areas, drawing shapes with a given area, and area in square units',
    metaTitle: 'Grade 3 Area Worksheets PDF — Counting Squares',
    metaDesc: 'Grade 3 area worksheets — 20 printable sheets, 206 questions on counting unit squares and half squares and comparing areas, with answer key. Instant PDF.',
  },
  {
    ch: 'Points, Lines, Rays, Angles', pslug: 'points-lines-rays-angles', chap: 'lines-and-angles', q: 206,
    topics: 'points, lines, line segments and rays, straight and curved, angles as a turn, right, acute and obtuse angles, comparing angles, and angles around us',
    metaTitle: 'Grade 3 Lines and Angles Worksheets PDF',
    metaDesc: 'Grade 3 geometry worksheets — 20 printable sheets, 206 questions on points, lines, rays and right/acute/obtuse angles, with answer key. Instant PDF.',
  },
  {
    ch: 'Quadrilaterals', pslug: 'quadrilaterals', chap: 'quadrilaterals', q: 206,
    topics: 'squares, rectangles, rhombuses, parallelograms and trapeziums, sides and corners, equal sides, right angles, parallel sides, and sorting quadrilaterals',
    metaTitle: 'Grade 3 Quadrilaterals Worksheets PDF — 4-Sided Shapes',
    metaDesc: 'Grade 3 quadrilaterals worksheets — 20 printable sheets, 206 questions on squares, rectangles, rhombus, parallelogram and trapezium, with answer key. PDF.',
  },
  {
    ch: 'Patterns', pslug: 'patterns', chap: 'patterns', q: 200,
    topics: 'repeating patterns, growing and shrinking patterns, number patterns, finding the rule, patterns in the number grid and tables, and symmetry and tiling patterns',
    metaTitle: 'Grade 3 Patterns Worksheets PDF — Number & Shape',
    metaDesc: 'Grade 3 patterns worksheets — 20 printable sheets, 200 questions on repeating, growing, number and shape patterns, with answer key. Instant PDF download.',
  },
  {
    ch: 'Scaled Graphs', pslug: 'scaled-graphs', chap: 'scaled-graphs', q: 191,
    topics: 'pictographs with a key or scale (including half symbols), scaled bar graphs, reading data tables, drawing graphs, and interpreting data',
    metaTitle: 'Grade 3 Scaled Graphs Worksheets PDF — Bars & Pictographs',
    metaDesc: 'Grade 3 data handling worksheets — 20 printable sheets, 191 questions on scaled bar graphs, pictographs and tables, with answer key. Instant PDF download.',
  },
];

const productSlug = (b) => `grade-3-${b.pslug}-worksheets-with-answers`;
const title = (b) => `Grade 3 ${b.ch} Worksheets With Answers`;

const shortDesc = (b) =>
  `20 printable ${b.ch} worksheets for Grade 3 — ${b.q} unique questions with a Name, Date and ` +
  `Score line on every sheet and a full answer key. CBSE, ICSE and international.`;

const description = (b) => `
<p>The <strong>Grade 3 ${b.ch} Worksheets With Answers</strong> e-book gives learners 20 clear,
one-page worksheets that build real fluency — and gives teachers and parents sheets they can
print and hand out in seconds.</p>
<ul>
  <li><strong>20 printable worksheets</strong>, each fitting one A4 page with a
      <strong>Name, Date and Score line</strong> — ready for the classroom</li>
  <li><strong>${b.q} questions, every one unique</strong> — no repeats anywhere in the book,
      moving steadily from easy to challenge level</li>
  <li><strong>Diagram-rich questions</strong> that keep 8- and 9-year-olds engaged</li>
  <li><strong>Complete Answer Key</strong> at the back — checking a sheet takes a minute</li>
  <li>Aligned with <strong>CBSE, ICSE and international</strong> Grade 3 curricula</li>
  <li>A4 PDF — instant download, print as many times as you need</li>
</ul>
<p><strong>What this book covers:</strong> ${b.topics}.</p>
<p>This book follows the free
<a href="${CLASS3}/${b.chap}" target="_blank" rel="noopener">Vidaara Grade 3 ${b.ch} study
material</a> so children can learn the concept free online and then practise it on paper. See all
chapters on the <a href="${CLASS3}" target="_blank" rel="noopener">Class 3 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '─'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/grade-3-worksheets-${b.chap}.jpg`);
    console.log('study link  ' + `${CLASS3}/${b.chap}`);
    console.log('price       Rs.' + PRICE + '  (was Rs.' + ORIGINAL + ')');
    console.log(`meta_title  ${b.metaTitle}   [${b.metaTitle.length}/70]`);
    console.log(`meta_desc   ${b.metaDesc}   [${b.metaDesc.length}/160]`);
  }
  console.log('\n' + BOOKS.length + ' products would be written into category "' + CAT_SLUG + '".');
}

async function run() {
  if (process.argv.includes('--dry-run')) return dryRun();
  const conn = await mysql.createConnection(cfg);

  const [[cat]] = await conn.query(`SELECT id FROM categories WHERE slug=?`, [CAT_SLUG]);
  if (!cat) throw new Error('Category ' + CAT_SLUG + ' not found');
  console.log(`Category "${CAT_SLUG}" -> id ${cat.id}`);

  let added = 0, updated = 0;
  for (const b of BOOKS) {
    const slug = productSlug(b);
    const [[existing]] = await conn.query(`SELECT id FROM products WHERE slug=?`, [slug]);
    const row = [
      title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
      `${IMG}/grade-3-worksheets-${b.chap}.jpg`, 25, 'Grade 3', 'CBSE/ICSE',
      b.metaTitle, b.metaDesc,
    ];
    if (existing) {
      await conn.query(
        `UPDATE products SET title=?,slug=?,description=?,short_desc=?,category_id=?,price=?,
         original_price=?,cover_image=?,page_count=?,grade=?,board=?,meta_title=?,meta_desc=?,
         is_published=1 WHERE id=?`, [...row, existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,0)`, row);
      added++; console.log('  added    ' + slug);
    }
  }

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=?`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated. "${CAT_SLUG}" now holds ${total.n} products.`);
  console.log('Next: ensure data/download-urls.json has the grade-3 links and run');
  console.log('  node scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
