/**
 * seed-grade8-worksheets.js
 *
 * Seeds the 22 chapter-wise Grade 8 Maths Worksheet e-books into the "Grade 8 Math"
 * category (grade-8-math), each with globally-searchable SEO metadata, a rich HTML
 * description and its own cover. The chapter list mirrors the free study material at
 * vidaara.org/courses/math/class-8 exactly, and every product deep-links to its OWN
 * chapter study page (requirement: wire each e-book to its respective Class 8 study page).
 *
 * Every book: 10 printable one-page worksheets with a Name / Date / Score line,
 * ~100-120 unique questions, diagram-rich, a full answer key AND step-by-step worked
 * solutions. 17-20pp PDF.
 *
 * PRICE: Rs 37 (was Rs 49). These are seeded with price_locked=1 so the bulk repricer
 * (seed-bundles-pricing) does NOT revert them to the default worksheet price. The
 * price columns are still guarded with IF(price_locked=1,...) so a later admin price
 * edit is preserved on re-seed.
 *
 * Idempotent. Creates the grade-8-math category if missing. Never touches download_url
 * (that comes from data/download-urls.json via scripts/import-download-urls.js).
 *
 *   node scripts/seed-grade8-worksheets.js            (write to DB)
 *   node scripts/seed-grade8-worksheets.js --dry-run  (print only)
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

const CAT_SLUG = 'grade-8-math';
const CAT_NAME = 'Grade 8 Math';
const CAT_SORT = 8;
const IMG = '/wp-content/uploads';
const PRICE = 37, ORIGINAL = 49;
const CLASS8 = 'https://vidaara.org/courses/math/class-8';

// chap = class-8 chapter slug (product slug fragment + study deep-link + cover file); pc = pages.
const BOOKS = [
  { ch: 'Rational Numbers', chap: 'rational-numbers', q: 112, pc: 18,
    topics: 'rational-number properties, the additive and multiplicative inverse, the number line, comparing and ordering, and the four operations on rationals',
    metaTitle: 'Grade 8 Rational Numbers Worksheets PDF',
    metaDesc: 'Grade 8 rational numbers worksheets — 10 printable sheets, 112 questions on properties, inverses and the four operations, with answers and solutions.' },
  { ch: 'Irrational Numbers', chap: 'irrational-numbers', q: 116, pc: 18,
    topics: 'the real number system, surds and square roots, simplifying surds, operations on irrationals, and estimating roots',
    metaTitle: 'Grade 8 Irrational Numbers Worksheets PDF (Surds)',
    metaDesc: 'Grade 8 irrational numbers worksheets — 10 printable sheets, 116 questions on surds, simplifying and operations on square roots, with answers and solutions.' },
  { ch: 'Integers & Absolute Value', chap: 'integers-absolute-value', q: 118, pc: 19,
    topics: 'integers and absolute value, comparing and ordering, and the four operations on integers with the sign rules',
    metaTitle: 'Grade 8 Integers & Absolute Value Worksheets PDF',
    metaDesc: 'Grade 8 integers worksheets — 10 printable sheets, 118 questions on absolute value and the four operations on integers, with answers and solutions.' },
  { ch: 'Algebraic Expressions', chap: 'algebraic-expressions', q: 106, pc: 17,
    topics: 'terms and types, like terms, the distributive property, expansion of products and identities, and factorisation',
    metaTitle: 'Grade 8 Algebraic Expressions Worksheets PDF',
    metaDesc: 'Grade 8 algebra worksheets — 10 printable sheets, 106 questions on like terms, expansion, identities and factorisation, with answers and solutions.' },
  { ch: 'Linear Equations', chap: 'linear-equations', q: 120, pc: 19,
    topics: 'solving linear equations by transposition, equations with brackets, variables on both sides, and word problems',
    metaTitle: 'Grade 8 Linear Equations Worksheets PDF',
    metaDesc: 'Grade 8 linear equations worksheets — 10 printable sheets, 120 questions on transposition, brackets and variables on both sides, with answers and solutions.' },
  { ch: 'Patterns & Sequences', chap: 'patterns-sequences', q: 104, pc: 18,
    topics: 'number patterns, arithmetic and geometric sequences, the nth term, and continuing and completing patterns',
    metaTitle: 'Grade 8 Patterns & Sequences Worksheets PDF',
    metaDesc: 'Grade 8 sequences worksheets — 10 printable sheets, 104 questions on arithmetic and geometric sequences and the nth term, with answers and solutions.' },
  { ch: 'Coordinate Geometry', chap: 'coordinate-geometry', q: 106, pc: 19,
    topics: 'the Cartesian plane and quadrants, plotting and naming points, distance between points, and graphing relations',
    metaTitle: 'Grade 8 Coordinate Geometry Worksheets PDF',
    metaDesc: 'Grade 8 coordinate geometry worksheets — 10 printable sheets, 106 questions on the Cartesian plane, distance and graphing, with answers and solutions.' },
  { ch: 'Basic Geometry', chap: 'basic-geometry', q: 119, pc: 20,
    topics: 'points, lines and angle types, complementary, supplementary and vertically opposite angles, and parallel lines cut by a transversal',
    metaTitle: 'Grade 8 Basic Geometry Worksheets PDF (Angles)',
    metaDesc: 'Grade 8 geometry worksheets — 10 printable sheets, 119 questions on lines, angle types and parallel-line angles, with answers and solutions.' },
  { ch: 'Triangles', chap: 'triangles', q: 104, pc: 20,
    topics: 'classifying triangles, the angle sum and exterior angle, congruence rules, and the Pythagoras theorem',
    metaTitle: 'Grade 8 Triangles Worksheets PDF (Pythagoras)',
    metaDesc: 'Grade 8 triangles worksheets — 10 printable sheets, 104 questions on the angle sum, congruence and the Pythagoras theorem, with answers and solutions.' },
  { ch: 'Quadrilaterals', chap: 'quadrilaterals', q: 104, pc: 17,
    topics: 'types and properties of quadrilaterals, the 360-degree angle sum, parallelograms and special quadrilaterals',
    metaTitle: 'Grade 8 Quadrilaterals Worksheets PDF',
    metaDesc: 'Grade 8 quadrilaterals worksheets — 10 printable sheets, 104 questions on types, properties and the 360 angle sum, with answers and solutions.' },
  { ch: 'Polygons', chap: 'polygons', q: 110, pc: 18,
    topics: 'naming polygons, the interior angle sum, exterior angles, and regular polygons',
    metaTitle: 'Grade 8 Polygons Worksheets PDF (Angle Sums)',
    metaDesc: 'Grade 8 polygons worksheets — 10 printable sheets, 110 questions on interior and exterior angle sums and regular polygons, with answers and solutions.' },
  { ch: 'Circles', chap: 'circles', q: 110, pc: 18,
    topics: 'parts of a circle, circumference, area, arc length and sector area',
    metaTitle: 'Grade 8 Circles Worksheets PDF (Area & Sectors)',
    metaDesc: 'Grade 8 circles worksheets — 10 printable sheets, 110 questions on circumference, area, arc length and sector area, with answers and solutions.' },
  { ch: 'Transformations', chap: 'transformations', q: 106, pc: 18,
    topics: 'translation, reflection, rotation and enlargement, and the properties of each transformation',
    metaTitle: 'Grade 8 Transformations Worksheets PDF',
    metaDesc: 'Grade 8 transformations worksheets — 10 printable sheets, 106 questions on translation, reflection, rotation and enlargement, with answers and solutions.' },
  { ch: 'Perimeter & Area', chap: 'perimeter-area', q: 104, pc: 19,
    topics: 'perimeter and area of 2D shapes (rectangle, triangle, parallelogram, trapezium, circle) and composite figures',
    metaTitle: 'Grade 8 Perimeter & Area Worksheets PDF',
    metaDesc: 'Grade 8 perimeter and area worksheets — 10 printable sheets, 104 questions on 2D shapes and composite figures, with answers and solutions.' },
  { ch: 'Surface Area & Volume', chap: 'surface-area-volume', q: 104, pc: 17,
    topics: 'nets, surface area of cuboids and prisms, and volume of prisms and cylinders',
    metaTitle: 'Grade 8 Surface Area & Volume Worksheets PDF',
    metaDesc: 'Grade 8 surface area and volume worksheets — 10 printable sheets, 104 questions on prisms and cylinders, with answers and step-by-step solutions.' },
  { ch: 'Data Representation', chap: 'data-representation', q: 107, pc: 18,
    topics: 'frequency tables, bar graphs, histograms, pie charts, line graphs and stem-and-leaf plots',
    metaTitle: 'Grade 8 Data Representation Worksheets PDF',
    metaDesc: 'Grade 8 data handling worksheets — 10 printable sheets, 107 questions on bar graphs, histograms, pie charts and stem-leaf plots, with answers and solutions.' },
  { ch: 'Measures of Central Tendency', chap: 'measures-central-tendency', q: 103, pc: 18,
    topics: 'the mean (including from a frequency table), median, mode and range, and choosing the best measure',
    metaTitle: 'Grade 8 Mean, Median & Mode Worksheets PDF',
    metaDesc: 'Grade 8 statistics worksheets — 10 printable sheets, 103 questions on mean, median, mode and range, with answers and step-by-step solutions.' },
  { ch: 'Probability', chap: 'probability', q: 113, pc: 18,
    topics: 'the likelihood scale, theoretical and experimental probability, the complement, and expected frequency',
    metaTitle: 'Grade 8 Probability Worksheets PDF',
    metaDesc: 'Grade 8 probability worksheets — 10 printable sheets, 113 questions on theoretical and experimental probability, with answers and solutions.' },
  { ch: 'Ratio, Proportion & Percentages', chap: 'ratio-proportion-percentages', q: 110, pc: 17,
    topics: 'ratios and equivalent ratios, direct proportion and the unitary method, and scale drawings',
    metaTitle: 'Grade 8 Ratio & Proportion Worksheets PDF',
    metaDesc: 'Grade 8 ratio and proportion worksheets — 10 printable sheets, 110 questions on ratios, the unitary method and scale drawings, with answers and solutions.' },
  { ch: 'Percentages', chap: 'percentages', q: 106, pc: 17,
    topics: 'percentage calculations, profit and loss, discount, simple interest, and tax',
    metaTitle: 'Grade 8 Percentages Worksheets PDF (Profit & Loss)',
    metaDesc: 'Grade 8 percentages worksheets — 10 printable sheets, 106 questions on profit and loss, discount and simple interest, with answers and solutions.' },
  { ch: 'Commercial Mathematics', chap: 'commercial-mathematics', q: 100, pc: 17,
    topics: 'bills and invoices, banking basics, savings and budgeting, and currency conversion',
    metaTitle: 'Grade 8 Commercial Mathematics Worksheets PDF',
    metaDesc: 'Grade 8 commercial maths worksheets — 10 printable sheets, 100 questions on bills, banking, budgeting and currency, with answers and solutions.' },
  { ch: 'Logical Reasoning', chap: 'logical-reasoning', q: 118, pc: 17,
    topics: 'number and letter sequences, Venn diagrams, coding-decoding, and logical puzzles',
    metaTitle: 'Grade 8 Logical Reasoning Worksheets PDF',
    metaDesc: 'Grade 8 logical reasoning worksheets — 10 printable sheets, 118 questions on sequences, Venn diagrams and coding-decoding, with answers and solutions.' },
];

const productSlug = (b) => `grade-8-${b.chap}-worksheets-with-answers`;
const title = (b) => `Grade 8 ${b.ch} Worksheets With Answers`;

const shortDesc = (b) =>
  `10 printable ${b.ch} worksheets for Grade 8 — ${b.q} unique questions with a Name, Date and ` +
  `Score line, a full answer key and step-by-step worked solutions. CBSE, ICSE and international.`;

const description = (b) => `
<p>The <strong>Grade 8 ${b.ch} Worksheets With Answers</strong> e-book gives learners 10 clear,
one-page worksheets that build real fluency — and gives teachers and parents sheets they can
print and hand out in seconds.</p>
<ul>
  <li><strong>10 printable worksheets</strong>, each fitting one A4 page with a
      <strong>Name, Date and Score line</strong> — ready for the classroom</li>
  <li><strong>${b.q} questions, every one unique</strong> — no repeats anywhere in the book,
      moving steadily from easy to challenge level</li>
  <li><strong>Diagram-rich questions</strong> that keep 13- and 14-year-olds engaged</li>
  <li><strong>Full Answer Key AND step-by-step Worked Solutions</strong> at the back — see exactly
      how every question is solved, not just the final answer</li>
  <li>Aligned with <strong>CBSE, ICSE and international</strong> Grade 8 curricula</li>
  <li>A4 PDF — instant download, print as many times as you need</li>
</ul>
<p><strong>What this book covers:</strong> ${b.topics}.</p>
<p>This book follows the free
<a href="${CLASS8}/${b.chap}" target="_blank" rel="noopener">Vidaara Grade 8 ${b.ch} study
material</a> so children can learn the concept free online and then practise it on paper. See all
chapters on the <a href="${CLASS8}" target="_blank" rel="noopener">Class 8 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '─'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/grade-8-worksheets-${b.chap}.jpg`);
    console.log('study link  ' + `${CLASS8}/${b.chap}`);
    console.log('price       Rs.' + PRICE + '  (was Rs.' + ORIGINAL + ')  [locked]');
    console.log(`meta_title  ${b.metaTitle}   [${b.metaTitle.length}/70]`);
    console.log(`meta_desc   ${b.metaDesc}   [${b.metaDesc.length}/160]`);
  }
  console.log('\n' + BOOKS.length + ' products would be written into category "' + CAT_SLUG + '".');
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
  for (const b of BOOKS) {
    const slug = productSlug(b);
    const [[existing]] = await conn.query(`SELECT id FROM products WHERE slug=?`, [slug]);
    if (existing) {
      // Preserve a manually-edited (locked) price; otherwise set the Rs 37/49 price. Keep it locked.
      await conn.query(
        `UPDATE products SET title=?,slug=?,description=?,short_desc=?,category_id=?,
         price=IF(price_locked=1,price,?),original_price=IF(price_locked=1,original_price,?),
         cover_image=?,page_count=?,grade=?,board=?,meta_title=?,meta_desc=?,
         is_published=1,price_locked=1 WHERE id=?`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         `${IMG}/grade-8-worksheets-${b.chap}.jpg`, b.pc, 'Grade 8', 'CBSE/ICSE',
         b.metaTitle, b.metaDesc, existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,price_locked,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,1,0)`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         `${IMG}/grade-8-worksheets-${b.chap}.jpg`, b.pc, 'Grade 8', 'CBSE/ICSE', b.metaTitle, b.metaDesc]);
      added++; console.log('  added    ' + slug);
    }
  }

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=?`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated. "${CAT_SLUG}" now holds ${total.n} products.`);
  console.log('Prices seeded at Rs ' + PRICE + '/' + ORIGINAL + ' with price_locked=1 (repricer will not change them).');
  console.log('Next: ensure data/download-urls.json has the grade-8 links and run scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
