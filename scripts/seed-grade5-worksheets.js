/**
 * seed-grade5-worksheets.js
 *
 * Seeds the 17 chapter-wise Grade 5 Maths Worksheet e-books into the "Grade 5 Math"
 * category (grade-5-math), each with globally-searchable SEO metadata, a rich HTML
 * description and its own cover. The chapter list mirrors the free study material at
 * vidaara.org/courses/math/class-5 exactly, and every product deep-links to its OWN
 * chapter study page (requirement: wire each e-book to its respective Class 5 study page).
 *
 * Every book: 20 printable one-page worksheets with a Name / Date / Score line,
 * ~188-240 unique questions, diagram-rich, and a full answer key. 25-27pp PDF.
 *
 * Idempotent — matches on slug, updates in place, never touches download_url
 * (that comes from data/download-urls.json via scripts/import-download-urls.js).
 * Creates the grade-5-math category if it does not exist yet.
 *
 *   node scripts/seed-grade5-worksheets.js            (write to DB)
 *   node scripts/seed-grade5-worksheets.js --dry-run  (print only)
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

const CAT_SLUG = 'grade-5-math';
const CAT_NAME = 'Grade 5 Math';
const CAT_SORT = 5;
const IMG = '/wp-content/uploads';
const PRICE = 35, ORIGINAL = 55;
const CLASS5 = 'https://vidaara.org/courses/math/class-5';

// pslug = product slug fragment (SEO-tuned, unique — becomes the download-urls.json key);
// chap  = class-5 chapter slug (study deep-link + cover file fragment); pc = pages.
const BOOKS = [
  {
    ch: 'Large Numbers & Place Value', pslug: 'large-numbers-place-value', chap: 'large-numbers', q: 204, pc: 27,
    topics: 'reading and writing numbers to lakhs, crores and millions, place and face value, expanded and standard form, the Indian vs international grouping, comparing and ordering large numbers, and rounding to the nearest 1000, 10,000 and lakh',
    metaTitle: 'Grade 5 Large Numbers & Place Value Worksheets PDF',
    metaDesc: 'Grade 5 large numbers worksheets — 20 printable sheets, 204 questions on place value to crores and millions, comparing and rounding, with answer key. PDF.',
  },
  {
    ch: 'Multi-Digit Multiplication', pslug: 'multi-digit-multiplication', chap: 'multiplication', q: 190, pc: 25,
    topics: '3-digit by 2-digit and 4-digit by 1-digit multiplication, the box (area) method, column multiplication with regrouping, multiplying by 10, 100 and 1000, estimating products, and multi-step word problems',
    metaTitle: 'Grade 5 Multi-Digit Multiplication Worksheets PDF',
    metaDesc: 'Grade 5 multiplication worksheets — 20 printable sheets, 190 questions on 3-digit by 2-digit, area model, estimating and word problems, with answer key. PDF.',
  },
  {
    ch: 'Long Division', pslug: 'long-division', chap: 'division', q: 204, pc: 25,
    topics: 'long division by 1-digit and 2-digit divisors, finding the quotient and remainder, interpreting the remainder, checking a division by multiplication, and division word problems',
    metaTitle: 'Grade 5 Long Division Worksheets PDF (2-Digit Divisors)',
    metaDesc: 'Grade 5 long division worksheets — 20 printable sheets, 204 questions on dividing by 1 and 2-digit divisors, remainders and word problems, with answer key. PDF.',
  },
  {
    ch: 'Factors, Multiples, HCF & LCM', pslug: 'factors-multiples-hcf-lcm', chap: 'factors-hcf-lcm', q: 204, pc: 25,
    topics: 'factors and multiples, prime and composite numbers, divisibility rules, prime factorisation with factor trees, and Highest Common Factor (HCF) and Lowest Common Multiple (LCM) by listing and by prime factorisation',
    metaTitle: 'Grade 5 Factors, Multiples, HCF & LCM Worksheets PDF',
    metaDesc: 'Grade 5 HCF and LCM worksheets — 20 printable sheets, 204 questions on factors, multiples, prime factorisation, HCF and LCM, with answer key. Instant PDF.',
  },
  {
    ch: 'Place Value with Decimals (Thousandths)', pslug: 'decimal-place-value-thousandths', chap: 'place-value-with-decimals', q: 218, pc: 26,
    topics: 'reading and writing decimals to three places, tenths, hundredths and thousandths, decimal and fraction conversions, the decimal number line, comparing and ordering decimals, and rounding decimals',
    metaTitle: 'Grade 5 Decimal Place Value Worksheets PDF (Thousandths)',
    metaDesc: 'Grade 5 decimal place value worksheets — 20 printable sheets, 218 questions on tenths, hundredths, thousandths, comparing and rounding, with answer key. PDF.',
  },
  {
    ch: 'Decimal Operations', pslug: 'decimal-operations', chap: 'decimal-operations', q: 198, pc: 25,
    topics: 'adding and subtracting decimals, multiplying decimals, dividing decimals, multiplying and dividing by powers of 10, and decimal and money word problems',
    metaTitle: 'Grade 5 Decimal Operations Worksheets PDF (Add & Multiply)',
    metaDesc: 'Grade 5 decimal worksheets — 20 printable sheets, 198 questions on add, subtract, multiply and divide decimals and powers of 10, with answer key. PDF.',
  },
  {
    ch: 'Adding & Subtracting Unlike Fractions', pslug: 'adding-subtracting-fractions', chap: 'operations-with-fractions', q: 226, pc: 25,
    topics: 'adding and subtracting fractions with unlike denominators, common denominators and the LCM of denominators, comparing and ordering unlike fractions, mixed numbers, and fraction word problems',
    metaTitle: 'Grade 5 Adding & Subtracting Fractions Worksheets PDF',
    metaDesc: 'Grade 5 fractions worksheets — 20 printable sheets, 226 questions on adding and subtracting unlike fractions and mixed numbers, with answer key. Instant PDF.',
  },
  {
    ch: 'Multiplying Fractions', pslug: 'multiplying-fractions', chap: 'multiplying-fractions', q: 220, pc: 25,
    topics: 'a fraction of a quantity, fraction times a whole number, fraction times a fraction, multiplying mixed numbers, simplifying products, and multiplication word problems',
    metaTitle: 'Grade 5 Multiplying Fractions Worksheets PDF',
    metaDesc: 'Grade 5 multiplying fractions worksheets — 20 printable sheets, 220 questions on fraction of a quantity, fraction times fraction and mixed numbers, answer key.',
  },
  {
    ch: 'Percentages', pslug: 'percentages', chap: 'percentages', q: 224, pc: 26,
    topics: 'percent as out of 100, reading a percent from a grid, converting between fractions, decimals and percents, percent of a quantity, and real-life percentage problems',
    metaTitle: 'Grade 5 Percentages Worksheets PDF (Percent of a Number)',
    metaDesc: 'Grade 5 percentages worksheets — 20 printable sheets, 224 questions on percent, fraction-decimal-percent and percent of a quantity, with answer key. PDF.',
  },
  {
    ch: 'Ratio & Proportion', pslug: 'ratio-proportion', chap: 'ratio-proportion', q: 214, pc: 25,
    topics: 'the meaning of ratio, part-to-part and part-to-whole, simplifying ratios, equivalent ratios, proportion and the missing term, sharing in a ratio, and ratio word problems',
    metaTitle: 'Grade 5 Ratio & Proportion Worksheets PDF',
    metaDesc: 'Grade 5 ratio and proportion worksheets — 20 printable sheets, 214 questions on ratios, equivalent ratios, proportion and sharing, with answer key. Instant PDF.',
  },
  {
    ch: 'Order of Operations (BODMAS)', pslug: 'order-of-operations', chap: 'order-of-operations', q: 204, pc: 25,
    topics: 'the BODMAS and PEMDAS rules, brackets first, nested brackets, multi-step numeric expressions, inserting brackets, spotting the mistake, and order-of-operations word problems',
    metaTitle: 'Grade 5 Order of Operations (BODMAS) Worksheets PDF',
    metaDesc: 'Grade 5 BODMAS worksheets — 20 printable sheets, 204 questions on order of operations, brackets and multi-step expressions, with answer key. Instant PDF.',
  },
  {
    ch: 'Volume', pslug: 'volume', chap: 'volume', q: 196, pc: 25,
    topics: 'counting unit cubes, the volume of a cuboid using length times breadth times height, volume in cubic units, finding a missing dimension, comparing volumes, and volume word problems',
    metaTitle: 'Grade 5 Volume Worksheets PDF (Cuboids & Unit Cubes)',
    metaDesc: 'Grade 5 volume worksheets — 20 printable sheets, 196 questions on counting unit cubes and the volume of a cuboid (l x b x h), with answer key. Instant PDF.',
  },
  {
    ch: 'Perimeter & Area', pslug: 'perimeter-area', chap: 'perimeter-area', q: 188, pc: 26,
    topics: 'perimeter and area of rectangles and squares by formula, composite and L-shapes, area versus perimeter, finding a missing side, and perimeter and area word problems',
    metaTitle: 'Grade 5 Perimeter & Area Worksheets PDF',
    metaDesc: 'Grade 5 perimeter and area worksheets — 20 printable sheets, 188 questions on rectangles, squares and composite shapes, with answer key. Instant PDF.',
  },
  {
    ch: 'Metric & Customary Conversion', pslug: 'metric-customary-conversion', chap: 'metric-customary-conversion', q: 240, pc: 25,
    topics: 'converting metric length, mass and capacity, customary units, converting units of time, mixed-unit measures, and measurement conversion word problems',
    metaTitle: 'Grade 5 Measurement Conversion Worksheets PDF',
    metaDesc: 'Grade 5 measurement conversion worksheets — 20 printable sheets, 240 questions on metric and customary units and time conversions, with answer key. Instant PDF.',
  },
  {
    ch: 'Coordinate Plane (First Quadrant)', pslug: 'coordinate-plane', chap: 'coordinate-plane', q: 192, pc: 25,
    topics: 'the first-quadrant grid, plotting and naming points as ordered pairs, reading coordinates off a grid, horizontal and vertical distance between points, and coordinate word problems',
    metaTitle: 'Grade 5 Coordinate Plane Worksheets PDF (First Quadrant)',
    metaDesc: 'Grade 5 coordinate plane worksheets — 20 printable sheets, 192 questions on plotting points, reading coordinates and distance, with answer key. Instant PDF.',
  },
  {
    ch: 'Classifying 2D Figures', pslug: 'classifying-2d-figures', chap: 'classifying-2d-figures', q: 210, pc: 25,
    topics: 'naming polygons by their sides, regular and irregular polygons, classifying triangles by sides and angles, the quadrilateral family and hierarchy, and properties of 2D shapes',
    metaTitle: 'Grade 5 Classifying 2D Figures Worksheets PDF',
    metaDesc: 'Grade 5 2D shapes worksheets — 20 printable sheets, 210 questions on polygons, triangles and the quadrilateral hierarchy, with answer key. Instant PDF.',
  },
  {
    ch: 'Line Plots & Mean', pslug: 'line-plots-mean', chap: 'line-plots-mean', q: 196, pc: 25,
    topics: 'reading and creating line and dot plots on whole-number and fractional scales, finding the mean (average), median and mode, the range, and data word problems',
    metaTitle: 'Grade 5 Line Plots & Mean Worksheets PDF (Averages)',
    metaDesc: 'Grade 5 data worksheets — 20 printable sheets, 196 questions on line plots, the mean, median and mode, with answer key. Instant PDF download.',
  },
];

const productSlug = (b) => `grade-5-${b.pslug}-worksheets-with-answers`;
const title = (b) => `Grade 5 ${b.ch} Worksheets With Answers`;

const shortDesc = (b) =>
  `20 printable ${b.ch} worksheets for Grade 5 — ${b.q} unique questions with a Name, Date and ` +
  `Score line on every sheet and a full answer key. CBSE, ICSE and international.`;

const description = (b) => `
<p>The <strong>Grade 5 ${b.ch} Worksheets With Answers</strong> e-book gives learners 20 clear,
one-page worksheets that build real fluency — and gives teachers and parents sheets they can
print and hand out in seconds.</p>
<ul>
  <li><strong>20 printable worksheets</strong>, each fitting one A4 page with a
      <strong>Name, Date and Score line</strong> — ready for the classroom</li>
  <li><strong>${b.q} questions, every one unique</strong> — no repeats anywhere in the book,
      moving steadily from easy to challenge level</li>
  <li><strong>Diagram-rich questions</strong> that keep 10- and 11-year-olds engaged</li>
  <li><strong>Complete Answer Key</strong> at the back — checking a sheet takes a minute</li>
  <li>Aligned with <strong>CBSE, ICSE and international</strong> Grade 5 curricula</li>
  <li>A4 PDF — instant download, print as many times as you need</li>
</ul>
<p><strong>What this book covers:</strong> ${b.topics}.</p>
<p>This book follows the free
<a href="${CLASS5}/${b.chap}" target="_blank" rel="noopener">Vidaara Grade 5 ${b.ch} study
material</a> so children can learn the concept free online and then practise it on paper. See all
chapters on the <a href="${CLASS5}" target="_blank" rel="noopener">Class 5 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '─'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/grade-5-worksheets-${b.chap}.jpg`);
    console.log('study link  ' + `${CLASS5}/${b.chap}`);
    console.log('price       Rs.' + PRICE + '  (was Rs.' + ORIGINAL + ')');
    console.log(`meta_title  ${b.metaTitle}   [${b.metaTitle.length}/70]`);
    console.log(`meta_desc   ${b.metaDesc}   [${b.metaDesc.length}/160]`);
  }
  console.log('\n' + BOOKS.length + ' products would be written into category "' + CAT_SLUG + '".');
}

async function run() {
  if (process.argv.includes('--dry-run')) return dryRun();
  const conn = await mysql.createConnection(cfg);

  // Ensure the category exists (idempotent).
  let [[cat]] = await conn.query(`SELECT id FROM categories WHERE slug=?`, [CAT_SLUG]);
  if (!cat) {
    const [r] = await conn.query(
      `INSERT INTO categories (name, slug, sort_order) VALUES (?,?,?)`,
      [CAT_NAME, CAT_SLUG, CAT_SORT]).catch(async () => {
        // fall back if the column is named differently in this schema
        return conn.query(`INSERT INTO categories (name, slug) VALUES (?,?)`, [CAT_NAME, CAT_SLUG]);
      });
    [[cat]] = await conn.query(`SELECT id FROM categories WHERE slug=?`, [CAT_SLUG]);
    console.log(`Created category "${CAT_SLUG}" -> id ${cat.id}`);
  } else {
    console.log(`Category "${CAT_SLUG}" -> id ${cat.id}`);
  }

  let added = 0, updated = 0;
  for (const b of BOOKS) {
    const slug = productSlug(b);
    const [[existing]] = await conn.query(`SELECT id FROM products WHERE slug=?`, [slug]);
    const row = [
      title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
      `${IMG}/grade-5-worksheets-${b.chap}.jpg`, b.pc, 'Grade 5', 'CBSE/ICSE',
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
  console.log('Next: ensure data/download-urls.json has the grade-5 links and run');
  console.log('  node scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
