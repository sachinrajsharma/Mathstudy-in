/**
 * seed-class6-case-studies.js
 *
 * Seeds the 22 chapter-wise Class 6 Maths Case Study e-books into the shop,
 * each with buy-intent SEO metadata (meta_title / meta_desc), a rich product
 * description and its own cover. Creates the "Case Studies Class 6" category if
 * it does not exist yet.
 *
 * Idempotent — safe to re-run; it updates existing rows matched on slug and
 * never touches the download link (that comes from the git-ignored
 * data/download-urls.json via scripts/import-download-urls.js).
 *
 *   node scripts/seed-class6-case-studies.js            (write to DB)
 *   node scripts/seed-class6-case-studies.js --dry-run  (print only)
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

const CAT = { name: 'Case Studies Class 6', slug: 'case-studies-class-6', sort: 11 };
const IMG = '/wp-content/uploads';
const PRICE = 41, ORIGINAL = 69;

// Every book: 10 case studies, 50 MCQs, full worked solutions, one diagram per case study.
const BOOKS = [
  {
    ch: 'Knowing Our Numbers', slug: 'knowing-our-numbers', pages: 24,
    topics: 'place value up to crores, comparing and forming large numbers, rounding off, Roman numerals and estimation',
    covers: ['Indian and international place value', 'Comparing and ordering large numbers',
             'Forming numbers from given digits', 'Rounding off and estimation', 'Roman numerals up to 1000'],
    metaTitle: 'Class 6 Knowing Our Numbers Case Study Questions PDF',
    metaDesc: 'Knowing Our Numbers case study questions for Class 6 Maths — 10 solved case studies, 50 MCQs on place value, rounding and Roman numerals. Instant PDF.',
  },
  {
    ch: 'Whole Numbers', slug: 'whole-numbers', pages: 24,
    topics: 'the number line, predecessor and successor, properties of addition and multiplication, and number patterns',
    covers: ['Whole numbers on the number line', 'Predecessor and successor', 'Commutative and associative properties',
             'The distributive property in mental maths', 'Patterns in whole numbers'],
    metaTitle: 'Class 6 Whole Numbers Case Study Questions — Solved PDF',
    metaDesc: 'Whole Numbers case study questions for Class 6 Maths — 10 real-life case studies and 50 solved MCQs on number line, properties and patterns. PDF download.',
  },
  {
    ch: 'Integers', slug: 'integers', pages: 24,
    topics: 'negative numbers in daily life, the number line, ordering and comparing integers, and addition and subtraction',
    covers: ['Why negative numbers are needed', 'Integers on the number line', 'Comparing and ordering integers',
             'Adding and subtracting integers', 'Temperature, money and level word problems'],
    metaTitle: 'Class 6 Integers Case Study Questions — Solved PDF',
    metaDesc: 'Integers case study questions for Class 6 Maths — 10 case studies and 50 MCQs on negative numbers, number line and integer operations, fully solved. PDF.',
  },
  {
    ch: 'Factors and Multiples', slug: 'factors-and-multiples', pages: 24,
    topics: 'primes and composites, divisibility rules, prime factorisation, HCF and LCM with word problems',
    covers: ['Prime and composite numbers', 'Divisibility rules 2 to 11', 'Prime factorisation and factor trees',
             'HCF and LCM by prime factors', 'HCF x LCM = product of the numbers'],
    metaTitle: 'Class 6 Factors and Multiples Case Studies — Solved PDF',
    metaDesc: 'Factors and Multiples case study questions for Class 6 — 10 case studies, 50 MCQs on HCF, LCM, primes and divisibility rules with full solutions. PDF.',
  },
  {
    ch: 'Fractions', slug: 'fractions', pages: 24,
    topics: 'types of fractions, equivalent fractions, comparison, the four operations and word problems',
    covers: ['Proper, improper and mixed fractions', 'Equivalent fractions and lowest terms', 'Comparing fractions',
             'Adding, subtracting, multiplying and dividing', 'Fractions in daily-life word problems'],
    metaTitle: 'Class 6 Fractions Case Study Questions — Solved PDF',
    metaDesc: 'Fractions case study questions for Class 6 Maths — 10 real-life case studies and 50 MCQs on equivalent fractions and all four operations, solved. PDF.',
  },
  {
    ch: 'Decimals', slug: 'decimals', pages: 24,
    topics: 'tenths to thousandths, converting between fractions and decimals, comparison, operations, and money and measurement',
    covers: ['Decimal place value', 'Fractions to decimals and back', 'Comparing and ordering decimals',
             'The four operations with decimals', 'Decimals in money, length and weight'],
    metaTitle: 'Class 6 Decimals Case Study Questions — Solved PDF',
    metaDesc: 'Decimals case study questions for Class 6 Maths — 10 case studies and 50 solved MCQs on place value, comparing and decimal operations. Instant PDF.',
  },
  {
    ch: 'Ratio and Proportion', slug: 'ratio-and-proportion', pages: 24,
    topics: 'ratio as comparison, equivalent ratios, proportion and cross products, and the unitary method',
    covers: ['Ratio in simplest form', 'Equivalent ratios', 'Proportion and the cross-product check',
             'The unitary method', 'Sharing, cost and map-scale problems'],
    metaTitle: 'Class 6 Ratio and Proportion Case Studies — Solved PDF',
    metaDesc: 'Ratio and Proportion case study questions for Class 6 — 10 case studies, 50 MCQs on ratios, proportion and unitary method with full solutions. PDF.',
  },
  {
    ch: 'Percentage and Commercial Maths', slug: 'percentage-and-commercial-maths', pages: 24,
    topics: 'percent from fractions and decimals, percentage of a quantity, profit and loss, discount and simple interest',
    covers: ['Converting to and from percent', 'Percentage of a quantity', 'Profit and loss with percent',
             'Discount on marked price', 'Simple interest for one year'],
    metaTitle: 'Class 6 Percentage Case Study Questions — Solved PDF',
    metaDesc: 'Percentage case study questions for Class 6 Maths — 10 case studies and 50 MCQs on percent, profit and loss, discount and simple interest, solved. PDF.',
  },
  {
    ch: 'Sets', slug: 'sets', pages: 24,
    topics: 'well-defined collections, roster and set-builder form, types of sets, subsets and first Venn diagrams',
    covers: ['Roster and set-builder form', 'Empty, singleton, finite and infinite sets', 'Equal and equivalent sets',
             'Subsets and the universal set', 'Venn diagrams, union and intersection'],
    metaTitle: 'Class 6 Sets Case Study Questions — Solved PDF (ICSE)',
    metaDesc: 'Sets case study questions for Class 6 Maths — 10 case studies and 50 MCQs on set notation, subsets and Venn diagrams, ICSE pattern, fully solved. PDF.',
  },
  {
    ch: 'Introduction to Algebra', slug: 'introduction-to-algebra', pages: 24,
    topics: 'letters for numbers, writing expressions, terms and coefficients, like terms and matchstick patterns',
    covers: ['Variables and constants', 'Writing expressions from statements', 'Terms, coefficients and like terms',
             'Evaluating expressions', 'Patterns and perimeter formulas'],
    metaTitle: 'Class 6 Introduction to Algebra Case Studies — PDF',
    metaDesc: 'Algebra case study questions for Class 6 Maths — 10 case studies and 50 MCQs on variables, expressions and patterns with step-by-step solutions. PDF.',
  },
  {
    ch: 'Linear Equations', slug: 'linear-equations', pages: 24,
    topics: 'forming equations, trial and error, the balancing method and everyday word problems',
    covers: ['What an equation says', 'Solving by trial and error', 'The balancing method',
             'Equations of the form ax + b = c', 'Money, age and sharing word problems'],
    metaTitle: 'Class 6 Linear Equations Case Study Questions — PDF',
    metaDesc: 'Linear Equations case study questions for Class 6 Maths — 10 case studies and 50 MCQs solved by the balancing method, with verification steps. PDF.',
  },
  {
    ch: 'Basic Geometrical Ideas', slug: 'basic-geometrical-ideas', pages: 24,
    topics: 'points, lines, segments and rays, parallel and intersecting lines, curves, polygons and angles',
    covers: ['Point, line, segment and ray', 'Collinear points', 'Parallel and intersecting lines',
             'Open and closed curves and polygons', 'Angles, vertex, interior and exterior'],
    metaTitle: 'Class 6 Basic Geometrical Ideas Case Studies — PDF',
    metaDesc: 'Basic Geometrical Ideas case study questions for Class 6 — 10 case studies and 50 MCQs on lines, rays, curves, polygons and angles, fully solved. PDF.',
  },
  {
    ch: 'Understanding Elementary Shapes', slug: 'understanding-elementary-shapes', pages: 24,
    topics: 'measuring segments, the angle family, classifying triangles and quadrilaterals, and 3-D shapes',
    covers: ['Acute, right, obtuse and reflex angles', 'Classifying triangles by sides and angles',
             'Square, rectangle, rhombus and trapezium', 'Regular and irregular polygons',
             'Solids: faces, edges, vertices and nets'],
    metaTitle: 'Class 6 Elementary Shapes Case Study Questions — PDF',
    metaDesc: 'Understanding Elementary Shapes case studies for Class 6 — 10 case studies, 50 MCQs on angles, triangles, quadrilaterals and 3-D solids, solved. PDF.',
  },
  {
    ch: 'Lines and Angles', slug: 'lines-and-angles', pages: 24,
    topics: 'complementary and supplementary angles, linear pairs, vertically opposite angles and transversals',
    covers: ['Complementary and supplementary angles', 'Adjacent angles and linear pairs',
             'Vertically opposite angles', 'Parallel lines and a transversal', 'Corresponding and alternate angles'],
    metaTitle: 'Class 6 Lines and Angles Case Study Questions — PDF',
    metaDesc: 'Lines and Angles case study questions for Class 6 Maths — 10 case studies and 50 MCQs on angle pairs, parallel lines and transversals, solved. PDF.',
  },
  {
    ch: 'Symmetry', slug: 'symmetry', pages: 24,
    topics: 'line symmetry and the axis, symmetry of regular polygons, and rotational symmetry with order and angle',
    covers: ['Line symmetry and the fold test', 'Axes of regular polygons', 'Rotational symmetry and its order',
             'Angle of rotation', 'Symmetry in letters, rangoli and nature'],
    metaTitle: 'Class 6 Symmetry Case Study Questions — Solved PDF',
    metaDesc: 'Symmetry case study questions for Class 6 Maths — 10 case studies and 50 MCQs on line and rotational symmetry with clear diagrams, fully solved. PDF.',
  },
  {
    ch: 'Coordinate Geometry', slug: 'coordinate-geometry', pages: 24,
    topics: 'the Cartesian plane, axes, origin and quadrants, plotting points and reading coordinates',
    covers: ['The x-axis, y-axis and origin', 'Ordered pairs and plotting', 'The four quadrants and signs',
             'Points on the axes', 'Shapes drawn on the grid'],
    metaTitle: 'Class 6 Coordinate Geometry Case Studies — Solved PDF',
    metaDesc: 'Coordinate Geometry case study questions for Class 6 — 10 case studies and 50 MCQs on plotting points, axes and quadrants, IB pattern, solved. PDF.',
  },
  {
    ch: 'Practical Geometry', slug: 'practical-geometry', pages: 24,
    topics: 'circles and segments, the perpendicular bisector, standard angles with compass, and SSS, SAS, ASA triangles',
    covers: ['Circles with compass and rope', 'The perpendicular bisector', 'Constructing 60, 90 and 45 degrees',
             'The angle bisector', 'Triangles by SSS, SAS and ASA'],
    metaTitle: 'Class 6 Practical Geometry Case Studies — Solved PDF',
    metaDesc: 'Practical Geometry case study questions for Class 6 — 10 construction case studies and 50 MCQs on bisectors, angles and triangles, fully solved. PDF.',
  },
  {
    ch: 'Perimeter and Area', slug: 'perimeter-and-area', pages: 24,
    topics: 'perimeter of rectilinear figures, areas of rectangles and squares, and composite shapes',
    covers: ['Perimeter of rectangles and squares', 'Area counted in unit squares', 'Area of rectangle and square',
             'L-shaped and composite figures', 'Fencing, tiling and cost problems'],
    metaTitle: 'Class 6 Perimeter and Area Case Studies — Solved PDF',
    metaDesc: 'Perimeter and Area case study questions for Class 6 — 10 case studies and 50 MCQs on fencing, tiling and composite figures with full solutions. PDF.',
  },
  {
    ch: 'Surface Area and Volume', slug: 'surface-area-and-volume', pages: 24,
    topics: 'volume of cubes and cuboids, first surface areas, and litres to cubic centimetres',
    covers: ['Volume in cubic units', 'Volume of cube and cuboid', 'Surface area of cube and cuboid',
             'Litres and cubic centimetres', 'Tanks, cartons and capacity problems'],
    metaTitle: 'Class 6 Surface Area and Volume Case Studies — PDF',
    metaDesc: 'Surface Area and Volume case study questions for Class 6 — 10 case studies and 50 MCQs on cubes, cuboids and capacity, fully solved. Instant PDF.',
  },
  {
    ch: 'Organising Data', slug: 'organising-data', pages: 24,
    topics: 'tally marks, frequency tables, pictographs and bar graphs with a proper scale',
    covers: ['Tally marks in bundles of five', 'Frequency tables', 'Pictographs with a key',
             'Bar graphs and choosing a scale', 'Double bar graphs'],
    metaTitle: 'Class 6 Data Handling Case Study Questions — Solved PDF',
    metaDesc: 'Organising Data case study questions for Class 6 Maths — 10 case studies and 50 MCQs on tally marks, pictographs and bar graphs, fully solved. PDF.',
  },
  {
    ch: 'Mean, Median and Mode', slug: 'mean-median-mode', pages: 24,
    topics: 'the arithmetic mean, the median of ordered data, the mode, and choosing the right average',
    covers: ['The arithmetic mean', 'The median of ordered data', 'The mode and bimodal data',
             'Outliers and which average to trust', 'Averages in sport, weather and daily life'],
    metaTitle: 'Class 6 Mean Median Mode Case Studies — Solved PDF',
    metaDesc: 'Mean, Median and Mode case study questions for Class 6 — 10 case studies and 50 MCQs on averages, outliers and real data with full solutions. PDF.',
  },
  {
    ch: 'Probability', slug: 'probability', pages: 24,
    topics: 'the language of chance, certain and impossible events, favourable outcomes, and coins, dice and spinners',
    covers: ['Certain, impossible and equally likely', 'Favourable outcomes over total', 'Coins, dice and spinners',
             'Experimental probability', 'The 0-to-1 likelihood ladder'],
    metaTitle: 'Class 6 Probability Case Study Questions — Solved PDF',
    metaDesc: 'Probability case study questions for Class 6 Maths — 10 case studies and 50 MCQs on chance, dice, spinners and experiments, fully solved. Instant PDF.',
  },
];

const title = (b) => `Class 6 ${b.ch} Case Studies With Solutions`;

const shortDesc = (b) =>
  `10 case studies and 50 MCQs on ${b.ch} for Class 6, every question fully solved. ` +
  `Covers ${b.topics}. CBSE, ICSE and State Boards.`;

const description = (b) => `
<p>The <strong>Class 6 ${b.ch} Case Studies With Solutions</strong> e-book gives your child
practice in exactly the format schools now examine: a real-life situation to read, followed by
questions that test whether the concept has actually been understood.</p>
<ul>
  <li><strong>10 case studies</strong> on ${b.ch}, each set in a real Indian context and written in
      about 150 words</li>
  <li><strong>50 multiple-choice questions</strong> — five after every case study, graded from
      warm-up to exam level</li>
  <li><strong>A clear diagram with every case study</strong> — figures, charts and number lines
      drawn to scale, not decoration</li>
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
function dryRun() {
  for (const b of BOOKS) {
    const slug = `class-6-${b.slug}-case-studies-with-solutions`;
    console.log('\n' + '─'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + slug);
    console.log('cover       ' + `${IMG}/class-6-case-studies-${b.slug}.jpg`);
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
    const slug = `class-6-${b.slug}-case-studies-with-solutions`;
    const [[existing]] = await conn.query(`SELECT id FROM products WHERE slug=?`, [slug]);
    const row = [
      title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
      `${IMG}/class-6-case-studies-${b.slug}.jpg`, b.pages, 'Grade 6', 'CBSE/ICSE',
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
  console.log(`\nDone — ${added} added, ${updated} updated.`);
  console.log(`"${CAT.name}" now holds ${total.n} products.`);
  console.log('Next: ensure data/download-urls.json has the class-6 links and run');
  console.log('  node scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
