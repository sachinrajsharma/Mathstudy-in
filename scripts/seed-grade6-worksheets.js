/**
 * seed-grade6-worksheets.js
 *
 * Seeds the 11 chapter-wise Grade 6 Maths Worksheet e-books into the "Grade 6 Math"
 * category (grade-6-math), each with globally-searchable SEO metadata, a rich HTML
 * description and its own cover. The chapter list mirrors the free study material at
 * vidaara.org/courses/math/class-6 exactly, and every product deep-links to its OWN
 * chapter study page (requirement: wire each e-book to its respective Class 6 study page).
 *
 * Every book: 10 printable one-page worksheets with a Name / Date / Score line,
 * ~99-126 unique questions, diagram-rich, a full answer key AND step-by-step worked
 * solutions. 17-19pp PDF.
 *
 * Idempotent — matches on slug, updates in place, never touches download_url
 * (that comes from data/download-urls.json via scripts/import-download-urls.js).
 * Creates the grade-6-math category if it does not exist yet.
 *
 *   node scripts/seed-grade6-worksheets.js            (write to DB)
 *   node scripts/seed-grade6-worksheets.js --dry-run  (print only)
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

const CAT_SLUG = 'grade-6-math';
const CAT_NAME = 'Grade 6 Math';
const CAT_SORT = 6;
const IMG = '/wp-content/uploads';
const PRICE = 35, ORIGINAL = 55;
const CLASS6 = 'https://vidaara.org/courses/math/class-6';

// pslug = product slug fragment (SEO-tuned, unique — becomes the download-urls.json key);
// chap  = class-6 chapter slug (study deep-link + cover file fragment); pc = pages.
const BOOKS = [
  {
    ch: 'Ratios & Proportions', pslug: 'ratios-proportions', chap: 'ratios-proportions', q: 103, pc: 17,
    topics: 'writing ratios in three forms, equivalent ratios, ratio tables, double number lines, unit rates, and ratio and proportion word problems',
    metaTitle: 'Grade 6 Ratios & Proportions Worksheets PDF',
    metaDesc: 'Grade 6 ratios and proportions worksheets — 10 printable sheets, 103 questions on ratio tables, unit rates and equivalent ratios, with answers and solutions.',
  },
  {
    ch: 'Integers (Negative Numbers)', pslug: 'integers', chap: 'integers', q: 126, pc: 19,
    topics: 'integers on the number line, comparing and ordering integers, absolute value, and adding and subtracting integers',
    metaTitle: 'Grade 6 Integers Worksheets PDF (Negative Numbers)',
    metaDesc: 'Grade 6 integers worksheets — 10 printable sheets, 126 questions on the number line, comparing, absolute value and add/subtract, with answers and solutions.',
  },
  {
    ch: 'Prime Factorization, LCM & GCF', pslug: 'prime-factorization-lcm-gcf', chap: 'prime-factorization-lcm-gcf', q: 102, pc: 18,
    topics: 'prime factorisation with factor trees, the greatest common factor (GCF), the lowest common multiple (LCM), and GCF and LCM word problems',
    metaTitle: 'Grade 6 Prime Factorization, LCM & GCF Worksheets',
    metaDesc: 'Grade 6 LCM and GCF worksheets — 10 printable sheets, 102 questions on prime factorisation, factor trees, GCF and LCM, with answers and worked solutions.',
  },
  {
    ch: 'Fractions, Decimals & Percents', pslug: 'fractions-decimals-percents', chap: 'fractions-decimals-percents', q: 120, pc: 18,
    topics: 'converting between fractions, decimals and percents, dividing fractions, and percent of a quantity including discounts, tax and tips',
    metaTitle: 'Grade 6 Fractions, Decimals & Percents Worksheets',
    metaDesc: 'Grade 6 fractions, decimals and percents worksheets — 10 printable sheets, 120 questions on conversions, dividing fractions and percents, answers and solutions.',
  },
  {
    ch: 'Area of Triangles & Parallelograms', pslug: 'area-of-triangles-parallelograms', chap: 'area-of-triangles-parallelograms', q: 100, pc: 19,
    topics: 'the area of triangles, parallelograms and trapezia, finding a missing base or height, and composite and irregular polygons by decomposing',
    metaTitle: 'Grade 6 Area of Triangles & Parallelograms Worksheets',
    metaDesc: 'Grade 6 area worksheets — 10 printable sheets, 100 questions on triangles, parallelograms and trapezia, with a full answer key and step-by-step solutions.',
  },
  {
    ch: 'Surface Area & Nets', pslug: 'surface-area-nets', chap: 'surface-area-nets', q: 99, pc: 17,
    topics: 'nets of 3D shapes and the surface area of cubes, cuboids and prisms, including calculating total surface area from a net',
    metaTitle: 'Grade 6 Surface Area & Nets Worksheets PDF',
    metaDesc: 'Grade 6 surface area worksheets — 10 printable sheets, 99 questions on nets, cubes, cuboids and prisms, with a full answer key and step-by-step solutions.',
  },
  {
    ch: 'Statistics', pslug: 'statistics', chap: 'statistics', q: 112, pc: 19,
    topics: 'statistical questions, mean, median, mode and range, and reading dot plots, histograms and box plots',
    metaTitle: 'Grade 6 Statistics Worksheets PDF (Mean Median Mode)',
    metaDesc: 'Grade 6 statistics worksheets — 10 printable sheets, 112 questions on mean, median, mode, range, dot plots and box plots, with answers and solutions.',
  },
  {
    ch: 'Algebraic Expressions', pslug: 'algebraic-expressions', chap: 'algebraic-expressions', q: 116, pc: 17,
    topics: 'writing algebraic expressions from words, evaluating expressions, combining like terms, and the distributive property',
    metaTitle: 'Grade 6 Algebraic Expressions Worksheets PDF',
    metaDesc: 'Grade 6 algebra worksheets — 10 printable sheets, 116 questions on writing/evaluating expressions and combining like terms, with answers and solutions.',
  },
  {
    ch: 'Solving One-Step Equations', pslug: 'solving-one-step-equations', chap: 'solving-one-step-equations', q: 106, pc: 18,
    topics: 'solving one-step addition, subtraction, multiplication and division equations, and checking the solution by substitution',
    metaTitle: 'Grade 6 One-Step Equations Worksheets PDF',
    metaDesc: 'Grade 6 one-step equations worksheets — 10 printable sheets, 106 questions on solving and checking +, -, x and / equations, answers and solutions.',
  },
  {
    ch: 'Coordinate Plane (4 Quadrants)', pslug: 'coordinate-plane', chap: 'coordinate-plane', q: 108, pc: 17,
    topics: 'the four-quadrant coordinate plane, plotting and naming points with negative coordinates, reflections across the axes, and distance between points',
    metaTitle: 'Grade 6 Coordinate Plane Worksheets PDF (4 Quadrants)',
    metaDesc: 'Grade 6 coordinate plane worksheets — 10 printable sheets, 108 questions on plotting, quadrants, reflections and distance, with answers and solutions.',
  },
  {
    ch: 'Angle Relationships', pslug: 'angle-relationships', chap: 'angle-relationships', q: 110, pc: 19,
    topics: 'complementary, supplementary, vertical and adjacent angles, angles on a line and around a point, and the triangle angle sum',
    metaTitle: 'Grade 6 Angle Relationships Worksheets PDF',
    metaDesc: 'Grade 6 angles worksheets — 10 printable sheets, 110 questions on complementary, supplementary, vertical angles and the triangle sum, answers and solutions.',
  },
];

const productSlug = (b) => `grade-6-${b.pslug}-worksheets-with-answers`;
const title = (b) => `Grade 6 ${b.ch} Worksheets With Answers`;

const shortDesc = (b) =>
  `10 printable ${b.ch} worksheets for Grade 6 — ${b.q} unique questions with a Name, Date and ` +
  `Score line, a full answer key and step-by-step worked solutions. CBSE, ICSE and international.`;

const description = (b) => `
<p>The <strong>Grade 6 ${b.ch} Worksheets With Answers</strong> e-book gives learners 10 clear,
one-page worksheets that build real fluency — and gives teachers and parents sheets they can
print and hand out in seconds.</p>
<ul>
  <li><strong>10 printable worksheets</strong>, each fitting one A4 page with a
      <strong>Name, Date and Score line</strong> — ready for the classroom</li>
  <li><strong>${b.q} questions, every one unique</strong> — no repeats anywhere in the book,
      moving steadily from easy to challenge level</li>
  <li><strong>Diagram-rich questions</strong> that keep 11- and 12-year-olds engaged</li>
  <li><strong>Full Answer Key AND step-by-step Worked Solutions</strong> at the back — see exactly
      how every question is solved, not just the final answer</li>
  <li>Aligned with <strong>CBSE, ICSE and international</strong> Grade 6 curricula</li>
  <li>A4 PDF — instant download, print as many times as you need</li>
</ul>
<p><strong>What this book covers:</strong> ${b.topics}.</p>
<p>This book follows the free
<a href="${CLASS6}/${b.chap}" target="_blank" rel="noopener">Vidaara Grade 6 ${b.ch} study
material</a> so children can learn the concept free online and then practise it on paper. See all
chapters on the <a href="${CLASS6}" target="_blank" rel="noopener">Class 6 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '─'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/grade-6-worksheets-${b.chap}.jpg`);
    console.log('study link  ' + `${CLASS6}/${b.chap}`);
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
      `${IMG}/grade-6-worksheets-${b.chap}.jpg`, b.pc, 'Grade 6', 'CBSE/ICSE',
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
  console.log('Next: ensure data/download-urls.json has the grade-6 links and run');
  console.log('  node scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
