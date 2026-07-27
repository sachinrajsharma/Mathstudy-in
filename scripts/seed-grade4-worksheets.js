/**
 * seed-grade4-worksheets.js
 *
 * Seeds the 17 chapter-wise Grade 4 Maths Worksheet e-books into the existing
 * "Grade 4 Math" category (grade-4-math), each with globally-searchable SEO
 * metadata, a rich HTML description and its own cover. The chapter list mirrors
 * the free study material at vidaara.org/courses/math/class-4 exactly, and every
 * product deep-links to its OWN chapter study page.
 *
 * Every book: 20 printable one-page worksheets with a Name / Date / Score line,
 * ~182-232 unique questions, diagram-rich, and a full answer key. 25-26pp PDF.
 *
 * Idempotent — matches on slug, updates in place, never touches download_url
 * (that comes from data/download-urls.json via scripts/import-download-urls.js).
 *
 *   node scripts/seed-grade4-worksheets.js            (write to DB)
 *   node scripts/seed-grade4-worksheets.js --dry-run  (print only)
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

const CAT_SLUG = 'grade-4-math';
const IMG = '/wp-content/uploads';
const PRICE = 35, ORIGINAL = 55;
const CLASS4 = 'https://vidaara.org/courses/math/class-4';

// pslug = product slug fragment (SEO-tuned, unique — becomes the download-urls.json key);
// chap  = class-4 chapter slug (study deep-link + cover file fragment); pc = pages.
const BOOKS = [
  {
    ch: 'Place Value to 4,00,000', pslug: 'place-value', chap: 'place-value-to-4-lakh', q: 208, pc: 25,
    topics: 'reading and writing 5- and 6-digit numbers, place and face value to lakhs, expanded and standard form, number names, the Indian vs international grouping, and rounding to the nearest 10,000 and lakh',
    metaTitle: 'Grade 4 Place Value Worksheets PDF (to Lakhs)',
    metaDesc: 'Grade 4 place value worksheets — 20 printable sheets, 208 questions on 5 and 6-digit numbers to lakhs, expanded form and rounding, with answer key. Instant PDF.',
  },
  {
    ch: 'Comparing, Ordering & Rounding', pslug: 'comparing-ordering-rounding', chap: 'comparing-ordering-rounding', q: 220, pc: 25,
    topics: 'comparing and ordering large numbers, greater than and less than, ascending and descending order, rounding to 10, 100 and 1000, and estimating with rounding',
    metaTitle: 'Grade 4 Comparing, Ordering & Rounding Worksheets PDF',
    metaDesc: 'Grade 4 comparing, ordering and rounding worksheets — 20 printable sheets, 220 questions on large numbers and estimation, with answer key. Instant PDF download.',
  },
  {
    ch: 'Addition & Subtraction of Large Numbers', pslug: 'addition-subtraction', chap: 'addition-subtraction', q: 182, pc: 25,
    topics: '4- and 5-digit column addition and subtraction with regrouping, subtracting across zeros, missing digits, estimating sums and differences, and multi-step word problems',
    metaTitle: 'Grade 4 Addition & Subtraction Worksheets PDF (Large Numbers)',
    metaDesc: 'Grade 4 addition and subtraction worksheets — 20 printable sheets, 182 questions on 4 and 5-digit regrouping and word problems, with answer key. Instant PDF.',
  },
  {
    ch: 'Multi-Digit Multiplication', pslug: 'multi-digit-multiplication', chap: 'multi-digit-multiplication', q: 190, pc: 25,
    topics: '4-digit by 1-digit and 2-digit by 2-digit multiplication, the box (area) method, column multiplication with regrouping, multiplying by tens, estimating products, and word problems',
    metaTitle: 'Grade 4 Multi-Digit Multiplication Worksheets PDF',
    metaDesc: 'Grade 4 multiplication worksheets — 20 printable sheets, 190 questions on 4-digit by 1 and 2-digit by 2-digit, box method and column, with answer key. PDF.',
  },
  {
    ch: 'Division with Remainders', pslug: 'division-with-remainders', chap: 'division-with-remainders', q: 210, pc: 25,
    topics: 'long division of 3-digit numbers by 1-digit divisors, division with and without remainders, interpreting the remainder, checking by multiplication, and word problems',
    metaTitle: 'Grade 4 Long Division Worksheets PDF (with Remainders)',
    metaDesc: 'Grade 4 division worksheets — 20 printable sheets, 210 questions on long division with remainders and checking by multiplication, with answer key. Instant PDF.',
  },
  {
    ch: 'Factors & Multiples', pslug: 'factors-multiples', chap: 'factors-multiples', q: 210, pc: 25,
    topics: 'factors and multiples, prime and composite numbers, common factors and multiples, divisibility rules, and factor trees',
    metaTitle: 'Grade 4 Factors & Multiples Worksheets PDF',
    metaDesc: 'Grade 4 factors and multiples worksheets — 20 printable sheets, 210 questions on primes, composites, divisibility and factor trees, with answer key. PDF.',
  },
  {
    ch: 'Equivalent Fractions', pslug: 'equivalent-fractions', chap: 'equivalent-fractions', q: 202, pc: 25,
    topics: 'generating equivalent fractions, simplest form, comparing and ordering fractions, fraction models and bars, and marking fractions on a number line',
    metaTitle: 'Grade 4 Equivalent Fractions Worksheets PDF',
    metaDesc: 'Grade 4 equivalent fractions worksheets — 20 printable sheets, 202 questions on equivalence, simplest form and comparing fractions, with answer key. PDF.',
  },
  {
    ch: 'Fraction Operations', pslug: 'fraction-operations', chap: 'fraction-operations', q: 228, pc: 25,
    topics: 'adding and subtracting like fractions, mixed numbers and improper fractions, fraction of a quantity, and fraction word problems',
    metaTitle: 'Grade 4 Fraction Operations Worksheets PDF (Add & Subtract)',
    metaDesc: 'Grade 4 fraction worksheets — 20 printable sheets, 228 questions on adding/subtracting like fractions, mixed numbers and word problems, with answer key. PDF.',
  },
  {
    ch: 'Decimals (Tenths & Hundredths)', pslug: 'decimals', chap: 'decimals-tenths-hundredths', q: 212, pc: 26,
    topics: 'tenths and hundredths, fraction-to-decimal and decimal-to-fraction, decimal place value, the decimal number line, comparing decimals, and adding and subtracting decimals',
    metaTitle: 'Grade 4 Decimals Worksheets PDF (Tenths & Hundredths)',
    metaDesc: 'Grade 4 decimals worksheets — 20 printable sheets, 212 questions on tenths, hundredths, comparing and adding/subtracting decimals, with answer key. Instant PDF.',
  },
  {
    ch: 'Money', pslug: 'money', chap: 'money', q: 224, pc: 25,
    topics: 'rupees and paise as decimals, adding and subtracting money, making change, rate charts and bills, and money word problems',
    metaTitle: 'Grade 4 Money Worksheets PDF — Rupees & Paise Decimals',
    metaDesc: 'Grade 4 money worksheets — 20 printable sheets, 224 questions on rupees and paise as decimals, bills, change and word problems, with answer key. Instant PDF.',
  },
  {
    ch: 'Measurement Conversions', pslug: 'measurement-conversions', chap: 'measurement-conversions', q: 232, pc: 25,
    topics: 'converting km, m, cm and mm, kg and g, L and mL, and units of time, mixed-unit measures, and measurement word problems',
    metaTitle: 'Grade 4 Measurement Conversion Worksheets PDF (Metric)',
    metaDesc: 'Grade 4 measurement worksheets — 20 printable sheets, 232 questions on km/m/cm/mm, kg/g, L/mL and time conversions, with answer key. Instant PDF download.',
  },
  {
    ch: 'Area & Perimeter Formulas', pslug: 'area-perimeter', chap: 'area-perimeter-formulas', q: 188, pc: 26,
    topics: 'perimeter and area of squares and rectangles by formula, area versus perimeter, finding a missing side, and area and perimeter word problems',
    metaTitle: 'Grade 4 Area & Perimeter Worksheets PDF (Formulas)',
    metaDesc: 'Grade 4 area and perimeter worksheets — 20 printable sheets, 188 questions on square and rectangle formulas and missing sides, with answer key. Instant PDF.',
  },
  {
    ch: 'Time & the 24-Hour Clock', pslug: 'time', chap: 'time', q: 208, pc: 25,
    topics: 'a.m. and p.m., the 24-hour clock, converting between 12- and 24-hour time, elapsed time, the calendar and leap years, and time word problems',
    metaTitle: 'Grade 4 Time Worksheets PDF — 24-Hour Clock & Elapsed Time',
    metaDesc: 'Grade 4 time worksheets — 20 printable sheets, 208 questions on the 24-hour clock, elapsed time, calendar and word problems, with answer key. Instant PDF.',
  },
  {
    ch: '2D Shapes & Symmetry', pslug: '2d-shapes-symmetry', chap: '2d-shapes-symmetry', q: 200, pc: 25,
    topics: 'polygons, triangles, quadrilaterals, pentagons and hexagons by number of sides, and lines of symmetry and symmetric figures',
    metaTitle: 'Grade 4 2D Shapes & Symmetry Worksheets PDF',
    metaDesc: 'Grade 4 geometry worksheets — 20 printable sheets, 200 questions on polygons, quadrilaterals and lines of symmetry, with answer key. Instant PDF download.',
  },
  {
    ch: 'Lines and Angles', pslug: 'lines-and-angles', chap: 'lines-and-angles', q: 200, pc: 25,
    topics: 'points, lines, rays and line segments, parallel and perpendicular lines, and right, acute and obtuse angles with comparing and naming',
    metaTitle: 'Grade 4 Lines and Angles Worksheets PDF',
    metaDesc: 'Grade 4 lines and angles worksheets — 20 printable sheets, 200 questions on parallel/perpendicular lines and right/acute/obtuse angles, with answer key. PDF.',
  },
  {
    ch: 'Line Plots with Fractions', pslug: 'line-plots', chap: 'line-plots-with-fractions', q: 192, pc: 25,
    topics: 'reading and creating line and dot plots, fractional scales in halves, quarters and eighths, and finding totals, ranges and differences from a plot',
    metaTitle: 'Grade 4 Line Plots Worksheets PDF (with Fractions)',
    metaDesc: 'Grade 4 line plot worksheets — 20 printable sheets, 192 questions on reading and making line plots with fraction scales, with answer key. Instant PDF.',
  },
  {
    ch: 'Number Patterns', pslug: 'number-patterns', chap: 'number-patterns', q: 216, pc: 25,
    topics: 'growing and shrinking patterns, finding the pattern rule, input-output tables and function machines, and shape and figurate-number patterns',
    metaTitle: 'Grade 4 Number Patterns Worksheets PDF',
    metaDesc: 'Grade 4 number patterns worksheets — 20 printable sheets, 216 questions on pattern rules, function machines and shape patterns, with answer key. Instant PDF.',
  },
];

const productSlug = (b) => `grade-4-${b.pslug}-worksheets-with-answers`;
const title = (b) => `Grade 4 ${b.ch} Worksheets With Answers`;

const shortDesc = (b) =>
  `20 printable ${b.ch} worksheets for Grade 4 — ${b.q} unique questions with a Name, Date and ` +
  `Score line on every sheet and a full answer key. CBSE, ICSE and international.`;

const description = (b) => `
<p>The <strong>Grade 4 ${b.ch} Worksheets With Answers</strong> e-book gives learners 20 clear,
one-page worksheets that build real fluency — and gives teachers and parents sheets they can
print and hand out in seconds.</p>
<ul>
  <li><strong>20 printable worksheets</strong>, each fitting one A4 page with a
      <strong>Name, Date and Score line</strong> — ready for the classroom</li>
  <li><strong>${b.q} questions, every one unique</strong> — no repeats anywhere in the book,
      moving steadily from easy to challenge level</li>
  <li><strong>Diagram-rich questions</strong> that keep 9- and 10-year-olds engaged</li>
  <li><strong>Complete Answer Key</strong> at the back — checking a sheet takes a minute</li>
  <li>Aligned with <strong>CBSE, ICSE and international</strong> Grade 4 curricula</li>
  <li>A4 PDF — instant download, print as many times as you need</li>
</ul>
<p><strong>What this book covers:</strong> ${b.topics}.</p>
<p>This book follows the free
<a href="${CLASS4}/${b.chap}" target="_blank" rel="noopener">Vidaara Grade 4 ${b.ch} study
material</a> so children can learn the concept free online and then practise it on paper. See all
chapters on the <a href="${CLASS4}" target="_blank" rel="noopener">Class 4 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '─'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/grade-4-worksheets-${b.chap}.jpg`);
    console.log('study link  ' + `${CLASS4}/${b.chap}`);
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
      `${IMG}/grade-4-worksheets-${b.chap}.jpg`, b.pc, 'Grade 4', 'CBSE/ICSE',
      b.metaTitle, b.metaDesc,
    ];
    if (existing) {
      await conn.query(
        `UPDATE products SET title=?,slug=?,description=?,short_desc=?,category_id=?,price=IF(price_locked=1,price,?),
         original_price=IF(price_locked=1,original_price,?),cover_image=?,page_count=?,grade=?,board=?,meta_title=?,meta_desc=?,
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
  console.log('Next: ensure data/download-urls.json has the grade-4 links and run');
  console.log('  node scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
