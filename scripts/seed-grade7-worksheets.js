/**
 * seed-grade7-worksheets.js
 *
 * Seeds the 11 chapter-wise Grade 7 Maths Worksheet e-books into the "Grade 7 Math"
 * category (grade-7-math), each with globally-searchable SEO metadata, a rich HTML
 * description and its own cover. The chapter list mirrors the free study material at
 * vidaara.org/courses/math/class-7 exactly, and every product deep-links to its OWN
 * chapter study page (requirement: wire each e-book to its respective Class 7 study page).
 *
 * Every book: 10 printable one-page worksheets with a Name / Date / Score line,
 * ~102-116 unique questions, diagram-rich, a full answer key AND step-by-step worked
 * solutions. 17-19pp PDF.
 *
 * Idempotent — matches on slug, updates in place, never touches download_url
 * (that comes from data/download-urls.json via scripts/import-download-urls.js).
 * Creates the grade-7-math category if it does not exist yet.
 *
 *   node scripts/seed-grade7-worksheets.js            (write to DB)
 *   node scripts/seed-grade7-worksheets.js --dry-run  (print only)
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

const CAT_SLUG = 'grade-7-math';
const CAT_NAME = 'Grade 7 Math';
const CAT_SORT = 7;
const IMG = '/wp-content/uploads';
const PRICE = 35, ORIGINAL = 55;
const CLASS7 = 'https://vidaara.org/courses/math/class-7';

// pslug/chap = class-7 chapter slug (product slug fragment + study deep-link + cover file); pc = pages.
const BOOKS = [
  {
    ch: 'Rational Numbers', chap: 'rational-numbers', q: 112, pc: 17,
    topics: 'positive and negative rational numbers on the number line, comparing and ordering, and adding, subtracting, multiplying and dividing rationals',
    metaTitle: 'Grade 7 Rational Numbers Worksheets PDF',
    metaDesc: 'Grade 7 rational numbers worksheets — 10 printable sheets, 112 questions on positive and negative fractions and decimals, with answers and solutions.',
  },
  {
    ch: 'Ratios & Proportions (Advanced)', chap: 'ratios-proportions-advanced', q: 106, pc: 17,
    topics: 'unit rates, solving proportions by cross-multiplication, and percent problems including discount, tax, markup and simple interest',
    metaTitle: 'Grade 7 Ratios & Proportions Worksheets PDF',
    metaDesc: 'Grade 7 ratio and proportion worksheets — 10 printable sheets, 106 questions on cross-multiplication, percent, discount and tax, with answers and solutions.',
  },
  {
    ch: 'Exponents & Powers', chap: 'exponents-powers', q: 114, pc: 18,
    topics: 'writing powers, the laws of exponents, negative bases, powers of 10, and order of operations with exponents',
    metaTitle: 'Grade 7 Exponents & Powers Worksheets PDF',
    metaDesc: 'Grade 7 exponents worksheets — 10 printable sheets, 114 questions on powers, the laws of exponents, negative bases and powers of 10, with answers and solutions.',
  },
  {
    ch: 'Algebraic Expressions', chap: 'algebraic-expressions-two-step', q: 114, pc: 17,
    topics: 'writing and evaluating expressions, combining like terms, the distributive property, and factoring out a common factor',
    metaTitle: 'Grade 7 Algebraic Expressions Worksheets PDF',
    metaDesc: 'Grade 7 algebra worksheets — 10 printable sheets, 114 questions on evaluating expressions, combining like terms and factoring, with answers and solutions.',
  },
  {
    ch: 'One-Step & Two-Step Equations', chap: 'one-step-two-step-equations', q: 116, pc: 18,
    topics: 'solving one-step and two-step equations, checking the solution by substitution, and writing equations from word problems',
    metaTitle: 'Grade 7 Two-Step Equations Worksheets PDF',
    metaDesc: 'Grade 7 equations worksheets — 10 printable sheets, 116 questions on solving one-step and two-step equations, with answers and step-by-step solutions.',
  },
  {
    ch: 'Inequalities (One Variable)', chap: 'inequalities-one-variable', q: 108, pc: 17,
    topics: 'writing inequalities, solving one-step and two-step inequalities including the sign flip, and graphing the solution on a number line',
    metaTitle: 'Grade 7 Inequalities Worksheets PDF (One Variable)',
    metaDesc: 'Grade 7 inequalities worksheets — 10 printable sheets, 108 questions on writing, solving and graphing one-variable inequalities, with answers and solutions.',
  },
  {
    ch: 'Scale Drawings & Similar Figures', chap: 'scale-drawings-similar-figures', q: 114, pc: 18,
    topics: 'similar polygons and corresponding parts, scale factor, finding a missing length, scale drawings and maps, and side ratio versus area ratio',
    metaTitle: 'Grade 7 Scale Drawings & Similar Figures Worksheets',
    metaDesc: 'Grade 7 similar figures worksheets — 10 printable sheets, 114 questions on scale factor, similar polygons and scale drawings, with answers and solutions.',
  },
  {
    ch: 'Angles in Parallel Lines & Triangles', chap: 'angles-parallel-lines-triangles', q: 106, pc: 17,
    topics: 'corresponding, alternate and co-interior angles on parallel lines, the triangle angle sum, and the exterior angle theorem',
    metaTitle: 'Grade 7 Angles Worksheets PDF (Parallel Lines)',
    metaDesc: 'Grade 7 angles worksheets — 10 printable sheets, 106 questions on parallel-line angles, triangle angle sum and exterior angles, with answers and solutions.',
  },
  {
    ch: 'Circles (Basics)', chap: 'circles-basics', q: 108, pc: 18,
    topics: 'radius, diameter and chord, circumference and area of a circle using pi, and finding a missing radius or diameter',
    metaTitle: 'Grade 7 Circles Worksheets PDF (Circumference & Area)',
    metaDesc: 'Grade 7 circles worksheets — 10 printable sheets, 108 questions on radius, diameter, circumference and area using pi, with answers and step-by-step solutions.',
  },
  {
    ch: 'Probability (Intro)', chap: 'probability-intro', q: 106, pc: 17,
    topics: 'the likelihood scale, theoretical probability of simple events, experimental probability from data, and comparing the two',
    metaTitle: 'Grade 7 Probability Worksheets PDF (Intro)',
    metaDesc: 'Grade 7 probability worksheets — 10 printable sheets, 106 questions on likelihood scale, theoretical and experimental probability, with answers and solutions.',
  },
  {
    ch: 'Statistics: Center & Variability', chap: 'statistics-measures-center-variability', q: 102, pc: 19,
    topics: 'mean, median, mode and range, the mean absolute deviation (MAD), box plots and the five-number summary, and random sampling',
    metaTitle: 'Grade 7 Statistics Worksheets PDF (Mean, MAD, Box Plots)',
    metaDesc: 'Grade 7 statistics worksheets — 10 printable sheets, 102 questions on mean, median, mode, range, MAD and box plots, with answers and step-by-step solutions.',
  },
];

const productSlug = (b) => `grade-7-${b.chap}-worksheets-with-answers`;
const title = (b) => `Grade 7 ${b.ch} Worksheets With Answers`;

const shortDesc = (b) =>
  `10 printable ${b.ch} worksheets for Grade 7 — ${b.q} unique questions with a Name, Date and ` +
  `Score line, a full answer key and step-by-step worked solutions. CBSE, ICSE and international.`;

const description = (b) => `
<p>The <strong>Grade 7 ${b.ch} Worksheets With Answers</strong> e-book gives learners 10 clear,
one-page worksheets that build real fluency — and gives teachers and parents sheets they can
print and hand out in seconds.</p>
<ul>
  <li><strong>10 printable worksheets</strong>, each fitting one A4 page with a
      <strong>Name, Date and Score line</strong> — ready for the classroom</li>
  <li><strong>${b.q} questions, every one unique</strong> — no repeats anywhere in the book,
      moving steadily from easy to challenge level</li>
  <li><strong>Diagram-rich questions</strong> that keep 12- and 13-year-olds engaged</li>
  <li><strong>Full Answer Key AND step-by-step Worked Solutions</strong> at the back — see exactly
      how every question is solved, not just the final answer</li>
  <li>Aligned with <strong>CBSE, ICSE and international</strong> Grade 7 curricula</li>
  <li>A4 PDF — instant download, print as many times as you need</li>
</ul>
<p><strong>What this book covers:</strong> ${b.topics}.</p>
<p>This book follows the free
<a href="${CLASS7}/${b.chap}" target="_blank" rel="noopener">Vidaara Grade 7 ${b.ch} study
material</a> so children can learn the concept free online and then practise it on paper. See all
chapters on the <a href="${CLASS7}" target="_blank" rel="noopener">Class 7 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '─'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/grade-7-worksheets-${b.chap}.jpg`);
    console.log('study link  ' + `${CLASS7}/${b.chap}`);
    console.log('price       Rs.' + PRICE + '  (was Rs.' + ORIGINAL + ')');
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
    const row = [
      title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
      `${IMG}/grade-7-worksheets-${b.chap}.jpg`, b.pc, 'Grade 7', 'CBSE/ICSE',
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
  console.log('Next: ensure data/download-urls.json has the grade-7 links and run');
  console.log('  node scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
