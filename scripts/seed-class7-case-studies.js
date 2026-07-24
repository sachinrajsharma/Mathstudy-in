/**
 * seed-class7-case-studies.js
 *
 * Seeds the 13 chapter-wise Class 7 Maths Case Study e-books into the shop,
 * each with buy-intent SEO metadata (meta_title / meta_desc), a rich product
 * description and its own cover. Creates the "Case Studies Class 7" category if
 * it does not exist yet.
 *
 * Idempotent — safe to re-run; it updates existing rows matched on slug and
 * never touches the download link (that comes from the git-ignored
 * data/download-urls.json via scripts/import-download-urls.js).
 *
 *   node scripts/seed-class7-case-studies.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

const CAT = { name: 'Case Studies Class 7', slug: 'case-studies-class-7', sort: 12 };
const IMG = '/wp-content/uploads';
const PRICE = 7, ORIGINAL = 12;

// Every book: 10 case studies, 50 MCQs, full worked solutions, diagrams.
const BOOKS = [
  {
    ch: 'Data Handling', slug: 'data-handling', cover: 'data-handling', pages: 25,
    topics: 'organising data, mean, median, mode, bar graphs, double bar graphs and pie charts',
    covers: ['Collecting and organising data', 'Mean, median and mode', 'Bar graphs and double bar graphs',
             'Pie charts and central angles', 'Reading and interpreting graphs'],
    metaTitle: 'Class 7 Data Handling Case Study Questions — Solved PDF',
    metaDesc: 'Data Handling case-study questions for Class 7 Maths — 10 solved case studies and 50 MCQs on mean, median, mode, bar graphs and pie charts. Instant PDF.',
  },
  {
    ch: 'Simple Equations', slug: 'simple-equations', cover: 'simple-equations', pages: 24,
    topics: 'variables and constants, forming equations, solving them systematically and verifying the answer',
    covers: ['Variables, constants and expressions', 'Forming an equation from a word problem',
             'Solving by the balancing method', 'Verifying the solution', 'Real-life word problems'],
    metaTitle: 'Class 7 Simple Equations Case Study Questions — Solved PDF',
    metaDesc: 'Simple Equations case-study questions for Class 7 Maths — 10 case studies and 50 MCQs with step-by-step solutions. CBSE & ICSE pattern. Instant PDF download.',
  },
  {
    ch: 'Algebraic Expressions', slug: 'algebraic-expressions', cover: 'algebraic-expressions', pages: 24,
    topics: 'terms and coefficients, like and unlike terms, adding and subtracting expressions and using formulas',
    covers: ['Terms, coefficients and constants', 'Like and unlike terms',
             'Adding and subtracting expressions', 'Simplifying expressions', 'Using expressions as formulas'],
    metaTitle: 'Class 7 Algebraic Expressions Case Studies — Solved PDF',
    metaDesc: 'Algebraic Expressions case-study questions for Class 7 Maths — 10 case studies, 50 MCQs, all fully solved. Like terms, coefficients, formulas. Instant PDF.',
  },
  {
    ch: 'Lines and Angles', slug: 'lines-and-angles', cover: 'lines-and-angles', pages: 24,
    topics: 'complementary and supplementary angles, linear pairs, vertically opposite angles and parallel lines',
    covers: ['Types of angles', 'Complementary and supplementary angles', 'Linear pairs and angles at a point',
             'Vertically opposite angles', 'Parallel lines cut by a transversal'],
    metaTitle: 'Class 7 Lines and Angles Case Study Questions — Solved PDF',
    metaDesc: 'Lines and Angles case-study questions for Class 7 Maths — 10 case studies, 50 MCQs on linear pairs, vertically opposite and parallel-line angles. Instant PDF.',
  },
  {
    ch: 'Triangles and Their Properties', slug: 'triangles', cover: 'triangles', pages: 24,
    topics: 'the angle sum property, the exterior angle property, medians, altitudes and isosceles triangles',
    covers: ['Classification of triangles', 'The angle sum property', 'The exterior angle property',
             'Medians and altitudes', 'Isosceles and equilateral triangles'],
    metaTitle: 'Class 7 Triangles Case Study Questions — Solved PDF',
    metaDesc: 'Triangles case-study questions for Class 7 Maths — 10 case studies and 50 MCQs on angle sum, exterior angles, medians and altitudes, fully solved. Instant PDF.',
  },
  {
    ch: 'Congruence of Triangles', slug: 'congruence-of-triangles', cover: 'congruence-of-triangles', pages: 24,
    topics: 'congruent figures and the SSS, SAS, ASA and RHS criteria, with real applications',
    covers: ['What congruence means', 'The SSS criterion', 'The SAS criterion',
             'The ASA and RHS criteria', 'CPCT and practical applications'],
    metaTitle: 'Class 7 Congruence of Triangles Case Studies — Solved PDF',
    metaDesc: 'Congruence of Triangles case studies for Class 7 Maths — 10 case studies, 50 MCQs on SSS, SAS, ASA and RHS with full solutions. CBSE & ICSE. Instant PDF.',
  },
  {
    ch: 'Comparing Quantities', slug: 'comparing-quantities', cover: 'comparing-quantities', pages: 24,
    topics: 'ratio and percentage, increase and decrease per cent, profit and loss and simple interest',
    covers: ['Ratio and proportion', 'Percentage and its applications', 'Increase and decrease per cent',
             'Profit and loss', 'Simple interest'],
    metaTitle: 'Class 7 Comparing Quantities Case Studies — Solved PDF',
    metaDesc: 'Comparing Quantities case-study questions for Class 7 Maths — 10 case studies and 50 MCQs on percentage, profit and loss and simple interest. Instant PDF.',
  },
  {
    ch: 'Ratio and Proportion', slug: 'ratio-and-proportion', cover: 'ratio-and-proportion', pages: 24,
    topics: 'simplifying ratios, proportion, direct proportion and inverse proportion',
    covers: ['Meaning and simplification of ratios', 'Dividing an amount in a given ratio',
             'Proportion and cross multiplication', 'Direct proportion', 'Inverse proportion'],
    metaTitle: 'Class 7 Ratio and Proportion Case Studies — Solved PDF',
    metaDesc: 'Ratio and Proportion case-study questions for Class 7 Maths — 10 case studies, 50 MCQs on direct and inverse proportion, fully solved. ICSE & CBSE. Instant PDF.',
  },
  {
    ch: 'Simple Interest', slug: 'simple-interest', cover: 'simple-interest', pages: 24,
    topics: 'principal, rate and time, the simple interest formula and calculating the amount',
    covers: ['Principal, rate and time', 'The simple interest formula', 'Calculating the amount',
             'Converting months into years', 'Finding the rate or the principal'],
    metaTitle: 'Class 7 Simple Interest Case Study Questions — Solved PDF',
    metaDesc: 'Simple Interest case-study questions for Class 7 Maths — 10 case studies and 50 MCQs on principal, rate, time and amount, fully solved. ICSE. Instant PDF.',
  },
  {
    ch: 'Perimeter, Area and Mensuration', slug: 'perimeter-area-and-mensuration', cover: 'perimeter-area-mensuration', pages: 24,
    topics: 'perimeter and area of plane figures, circles, and the volume of a cube and cuboid',
    covers: ['Perimeter of plane figures', 'Area of rectangle, square and triangle',
             'Area of a parallelogram', 'Circumference and area of a circle', 'Volume of a cube and cuboid'],
    metaTitle: 'Class 7 Perimeter and Area Case Study Questions — PDF',
    metaDesc: 'Perimeter, Area and Mensuration case studies for Class 7 Maths — 10 case studies and 50 MCQs on area, circles and volume, fully solved. Instant PDF download.',
  },
  {
    ch: 'Exponents and Powers', slug: 'exponents-and-powers', cover: 'exponents-and-powers', pages: 24,
    topics: 'the meaning of exponents, the laws of exponents and writing numbers in standard form',
    covers: ['Meaning of exponents', 'The laws of exponents', 'Simplifying using the laws',
             'Large numbers in standard form', 'Small numbers and negative exponents'],
    metaTitle: 'Class 7 Exponents and Powers Case Studies — Solved PDF',
    metaDesc: 'Exponents and Powers case-study questions for Class 7 Maths — 10 case studies, 50 MCQs on the laws of exponents and standard form, fully solved. Instant PDF.',
  },
  {
    ch: 'Symmetry', slug: 'symmetry', cover: 'symmetry', pages: 24,
    topics: 'line symmetry, rotational symmetry, order of rotation and symmetry in letters and figures',
    covers: ['Line symmetry', 'Lines of symmetry in figures', 'Rotational symmetry',
             'Order of rotation and angle of rotation', 'Symmetry in letters, digits and designs'],
    metaTitle: 'Class 7 Symmetry Case Study Questions — Solved PDF',
    metaDesc: 'Symmetry case-study questions for Class 7 Maths — 10 case studies and 50 MCQs on line symmetry, rotational symmetry and order of rotation. Instant PDF.',
  },
  {
    ch: 'Visualising Solid Shapes', slug: 'visualising-solid-shapes', cover: 'visualising-solid-shapes', pages: 24,
    topics: 'faces, edges and vertices, nets of solids, different views of solids and Euler’s relation',
    covers: ['2-D and 3-D shapes', 'Faces, edges and vertices', 'Nets of solids',
             'Different views of a solid', 'Euler’s relation'],
    metaTitle: 'Class 7 Visualising Solid Shapes Case Studies — PDF',
    metaDesc: 'Visualising Solid Shapes case studies for Class 7 Maths — 10 case studies and 50 MCQs on faces, edges, vertices and nets, fully solved. Instant PDF download.',
  },
];

const title = (b) => `Class 7 ${b.ch} Case Studies With Solutions`;

const shortDesc = (b) =>
  `10 case studies and 50 MCQs on ${b.ch} for Class 7, every question fully solved. ` +
  `Covers ${b.topics}. CBSE, ICSE and State Boards.`;

const description = (b) => `
<p>The <strong>Class 7 ${b.ch} Case Studies With Solutions</strong> e-book gives your child
practice in exactly the format schools now examine: a real-life situation to read, followed by
questions that test whether the concept has actually been understood.</p>
<ul>
  <li><strong>10 case studies</strong> on ${b.ch}, each set in a real Indian context and written in
      about 150 words</li>
  <li><strong>50 multiple-choice questions</strong> — five after every case study, graded from
      warm-up to exam level</li>
  <li><strong>A clear diagram with every case study</strong> — graphs, figures and charts drawn to
      scale, not decoration</li>
  <li><strong>Full worked solutions</strong> for all 50 questions, plus a one-look answer key</li>
  <li>Aligned with the <strong>CBSE, ICSE and State Board</strong> competency-based pattern</li>
  <li>${b.pages}-page PDF — instant download, print-ready</li>
</ul>
<p><strong>What this chapter covers:</strong> ${b.covers.join(' &middot; ')}.</p>
<p>Each case study fits on a single page together with its questions, so a student never has to turn
the page to see the data they are being asked about.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

// --dry-run prints exactly what would be written, without touching the database.
// Useful on a machine that has no DB access (the production DB is server-side).
function dryRun() {
  for (const b of BOOKS) {
    const slug = `class-7-${b.slug}-case-studies-with-solutions`;
    console.log('\n' + '─'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + slug);
    console.log('cover       ' + `${IMG}/class-7-case-studies-${b.cover}.jpg`);
    console.log('price       Rs.' + PRICE + '  (was Rs.' + ORIGINAL + ')   ' + b.pages + ' pages');
    console.log(`meta_title  ${b.metaTitle}   [${b.metaTitle.length}/70]`);
    console.log(`meta_desc   ${b.metaDesc}   [${b.metaDesc.length}/160]`);
    console.log('short_desc  ' + shortDesc(b));
  }
  console.log('\n' + '─'.repeat(78));
  console.log(`${BOOKS.length} products would be written into category "${CAT.name}" (${CAT.slug}).`);
  console.log('Download links are NOT set here — run scripts/import-download-urls.js for that.');
}

async function run() {
  if (process.argv.includes('--dry-run')) return dryRun();
  const conn = await mysql.createConnection(cfg);

  // 1. category
  await conn.query(
    `INSERT IGNORE INTO categories (name, slug, sort_order) VALUES (?,?,?)`,
    [CAT.name, CAT.slug, CAT.sort]
  );
  const [[cat]] = await conn.query(`SELECT id FROM categories WHERE slug=?`, [CAT.slug]);
  console.log(`Category "${CAT.name}" -> id ${cat.id}`);

  // 2. products
  let added = 0, updated = 0;
  for (const b of BOOKS) {
    const slug = `class-7-${b.slug}-case-studies-with-solutions`;
    const [[existing]] = await conn.query(`SELECT id FROM products WHERE slug=?`, [slug]);
    const row = [
      title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
      `${IMG}/class-7-case-studies-${b.cover}.jpg`, b.pages, 'Grade 7', 'CBSE/ICSE',
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

  console.log(`\nDone — ${added} added, ${updated} updated (${BOOKS.length} Class 7 case-study books).`);
  console.log('Next: upload data/download-urls.json and run  node scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
