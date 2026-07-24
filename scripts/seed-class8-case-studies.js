/**
 * seed-class8-case-studies.js
 *
 * Seeds the 22 chapter-wise Class 8 Maths Case Study e-books into the shop,
 * each with buy-intent SEO metadata (meta_title / meta_desc), a rich product
 * description and its own cover. Joins the existing "Case Studies Class 8"
 * category alongside the original 5 chapter PDFs and the full-set bundle.
 *
 * Idempotent — re-running updates existing rows matched on slug and never
 * touches the download link (that comes from the git-ignored
 * data/download-urls.json via scripts/import-download-urls.js).
 *
 *   node scripts/seed-class8-case-studies.js            (writes to the DB)
 *   node scripts/seed-class8-case-studies.js --dry-run  (prints, no DB needed)
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

const CAT = { name: 'Case Studies Class 8', slug: 'case-studies-class-8', sort: 13 };
const IMG = '/wp-content/uploads';
const PRICE = 7, ORIGINAL = 12, PAGES = 24;

// Every book: 10 case studies, 50 MCQs, full worked solutions, diagrams.
const BOOKS = [
  {
    ch: 'Number Systems', slug: 'number-systems',
    topics: 'integers and rational numbers, terminating and non-terminating decimals, the number line, and the properties of operations',
    covers: ['Integers and rational numbers', 'Terminating and repeating decimals', 'The number line',
             'Closure, commutativity and associativity', 'Identity and inverse elements'],
    metaTitle: 'Class 8 Number Systems Case Study Questions — Solved PDF',
    metaDesc: 'Number Systems case-study questions for Class 8 / Grade 8 Maths — 10 real-life cases, 50 MCQs, full solutions. CBSE & ICSE pattern. Instant PDF download.',
  },
  {
    ch: 'Rational Numbers', slug: 'rational-numbers',
    topics: 'equivalent rational numbers, fractions and decimals, the four operations, and word problems',
    covers: ['Equivalent rational numbers', 'Fractions and decimals', 'The four operations',
             'Properties of rational numbers', 'Daily-life word problems'],
    metaTitle: 'Class 8 Rational Numbers Case Study Questions — Solved PDF',
    metaDesc: 'Rational Numbers case-study questions for Class 8 / Grade 8 Maths — 10 solved cases and 50 MCQs on fractions, decimals and operations. Instant PDF download.',
  },
  {
    ch: 'Exponents, Powers and Standard Form', slug: 'exponents-and-powers',
    topics: 'the laws of exponents, zero and negative exponents, and scientific notation (standard form)',
    covers: ['Laws of exponents', 'Zero and negative exponents', 'Standard form',
             'Very large and very small numbers', 'Science applications'],
    metaTitle: 'Class 8 Exponents & Powers Case Studies — Solved PDF',
    metaDesc: 'Exponents and Powers case-study questions for Class 8 / Grade 8 Maths — 10 cases, 50 MCQs on the laws of exponents and scientific notation. Instant PDF.',
  },
  {
    ch: 'Squares, Square Roots, Cubes and Cube Roots', slug: 'squares-and-cubes',
    topics: 'perfect squares and cubes, roots by factorisation and division, and estimation',
    covers: ['Perfect squares and cubes', 'Square roots by prime factorisation', 'The long-division method',
             'Cube roots', 'Estimating roots'],
    metaTitle: 'Class 8 Squares, Cubes & Roots Case Studies — Solved PDF',
    metaDesc: 'Squares, square roots, cubes and cube roots case studies for Class 8 / Grade 8 Maths — 10 cases, 50 MCQs, every answer fully worked. Instant PDF download.',
  },
  {
    ch: 'Algebraic Expressions', slug: 'algebraic-expressions',
    topics: 'terms, coefficients and constants, like and unlike terms, simplification, and substitution',
    covers: ['Terms, coefficients and factors', 'Like and unlike terms', 'Simplifying expressions',
             'Substitution and evaluation', 'Expressions as formulas'],
    metaTitle: 'Class 8 Algebraic Expressions Case Studies — Solved PDF',
    metaDesc: 'Algebraic Expressions case-study questions for Class 8 / Grade 8 Maths — 10 real-world cases, 50 MCQs with step-by-step solutions. Instant PDF download.',
  },
  {
    ch: 'Linear Equations in One Variable', slug: 'linear-equations',
    topics: 'forming linear equations, the balancing and transposition methods, and word problems on ages, money and speed',
    covers: ['Forming an equation from words', 'The balancing method', 'Transposition',
             'Verification', 'Age, money, fraction and speed problems'],
    metaTitle: 'Class 8 Linear Equations Case Study Questions — Solved PDF',
    metaDesc: 'Linear Equations case-study questions for Class 8 / Grade 8 Maths — 10 cases and 50 MCQs on forming and solving equations, fully worked. Instant PDF.',
  },
  {
    ch: 'Factorisation and Identities', slug: 'factorisation-and-identities',
    topics: 'common factors and grouping, and the standard identities (a+b)², (a−b)² and a²−b²',
    covers: ['Common factors and grouping', 'The identity (a+b)²', 'The identity (a−b)²',
             'The difference of squares a²−b²', 'Fast mental multiplication'],
    metaTitle: 'Class 8 Factorisation & Identities Case Studies — PDF',
    metaDesc: 'Factorisation and algebraic identities case studies for Class 8 / Grade 8 Maths — 10 cases, 50 MCQs using (a+b)², (a−b)² and a²−b². Instant PDF download.',
  },
  {
    ch: 'Ratio, Proportion and Unitary Method', slug: 'ratio-and-proportion',
    topics: 'ratio and proportion, the unitary method, and direct and inverse proportion',
    covers: ['Simplifying ratios', 'Proportion and cross multiplication', 'The unitary method',
             'Direct proportion', 'Inverse proportion'],
    metaTitle: 'Class 8 Ratio & Proportion Case Study Questions — PDF',
    metaDesc: 'Ratio, Proportion and Unitary Method case studies for Class 8 / Grade 8 Maths — 10 cases, 50 MCQs with full solutions. CBSE & ICSE. Instant PDF download.',
  },
  {
    ch: 'Time and Work; Speed, Distance and Time', slug: 'time-work-speed-distance',
    topics: 'work as rate times time, efficiency and shared work, and speed, distance and time',
    covers: ['Work = rate × time', 'Working together', 'Speed = distance ÷ time',
             'Unit conversion (km/h to m/s)', 'Trains, pipes and journeys'],
    metaTitle: 'Class 8 Time & Work, Speed & Distance Case Studies — PDF',
    metaDesc: 'Time and Work, Speed, Distance and Time case studies for Class 8 / Grade 8 Maths — 10 cases, 50 MCQs, every solution worked out. Instant PDF download.',
  },
  {
    ch: 'Percentage, Profit, Loss and Discount', slug: 'percentage-profit-loss-discount',
    topics: 'percentage and percentage change, profit and loss, marked price, and successive discounts',
    covers: ['Percentage and percentage change', 'Profit and loss on cost price', 'Marked price and discount',
             'Successive discounts', 'Shopping and sales analysis'],
    metaTitle: 'Class 8 Percentage, Profit & Loss Case Studies — PDF',
    metaDesc: 'Percentage, Profit, Loss and Discount case studies for Class 8 / Grade 8 Maths — 10 shopping-style cases, 50 solved MCQs. Instant PDF download.',
  },
  {
    ch: 'Simple and Compound Interest', slug: 'simple-and-compound-interest',
    topics: 'the simple interest formula, compound interest year by year, and comparing the two',
    covers: ['The simple interest formula', 'Compound interest year by year', 'S.I. versus C.I.',
             'Half-yearly compounding', 'Savings, loans and instalments'],
    metaTitle: 'Class 8 Simple & Compound Interest Case Studies — PDF',
    metaDesc: 'Simple and Compound Interest case-study questions for Class 8 / Grade 8 Maths — 10 banking-style cases, 50 MCQs, fully solved. Instant PDF download.',
  },
  {
    ch: 'Mensuration', slug: 'mensuration',
    topics: 'perimeter and area of plane figures, the trapezium, and the surface area and volume of solids',
    covers: ['Area of a trapezium', 'Paths and borders', 'Surface area of cube and cuboid',
             'Volume of a cylinder', 'Real measurement problems'],
    metaTitle: 'Class 8 Mensuration Case Study Questions — Solved PDF',
    metaDesc: 'Mensuration case-study questions for Class 8 / Grade 8 Maths — 10 cases, 50 MCQs on area, surface area and volume, fully worked. Instant PDF download.',
  },
  {
    ch: 'Geometry: Lines and Angles', slug: 'lines-and-angles',
    topics: 'angle relationships — complementary, supplementary, vertically opposite — and parallel lines with a transversal',
    covers: ['Complementary and supplementary angles', 'Linear pairs', 'Vertically opposite angles',
             'Parallel lines and a transversal', 'Angles in real designs'],
    metaTitle: 'Class 8 Lines and Angles Case Study Questions — PDF',
    metaDesc: 'Lines and Angles case-study questions for Class 8 / Grade 8 geometry — 10 cases, 50 MCQs on angle pairs and parallel lines, solved. Instant PDF download.',
  },
  {
    ch: 'Triangles and Congruence', slug: 'triangles-and-congruence',
    topics: 'types of triangles, the congruence criteria SSS, SAS, ASA and RHS, and medians and altitudes',
    covers: ['The angle sum property', 'Exterior angles', 'SSS, SAS, ASA and RHS',
             'CPCT', 'Medians and altitudes'],
    metaTitle: 'Class 8 Triangles & Congruence Case Studies — Solved PDF',
    metaDesc: 'Triangles and Congruence case-study questions for Class 8 / Grade 8 geometry — 10 cases, 50 MCQs on SSS, SAS, ASA and RHS, fully solved. Instant PDF.',
  },
  {
    ch: 'Quadrilaterals and Polygons', slug: 'quadrilaterals-and-polygons',
    topics: 'the classification and properties of quadrilaterals, and the angle sum property of polygons',
    covers: ['The quadrilateral angle sum', 'Parallelogram properties', 'Rectangle, rhombus and square',
             'Polygon interior and exterior angles', 'Tiling and design'],
    metaTitle: 'Class 8 Quadrilaterals & Polygons Case Studies — PDF',
    metaDesc: 'Quadrilaterals and Polygons case-study questions for Class 8 / Grade 8 geometry — 10 cases, 50 MCQs on properties and angle sums. Instant PDF download.',
  },
  {
    ch: 'Practical Geometry and Constructions', slug: 'practical-geometry',
    topics: 'ruler-and-compass constructions of perpendiculars, bisectors, triangles and quadrilaterals',
    covers: ['Constructing triangles (SSS, SAS, ASA)', 'Perpendicular bisectors', 'Angle bisectors',
             'The 60° construction', 'Why a quadrilateral needs five measurements'],
    metaTitle: 'Class 8 Practical Geometry Case Study Questions — PDF',
    metaDesc: 'Practical Geometry and Constructions case studies for Class 8 / Grade 8 Maths — 10 ruler-and-compass cases with 50 solved MCQs. Instant PDF download.',
  },
  {
    ch: 'Comparing Quantities', slug: 'comparing-quantities',
    topics: 'an integrated revision of ratio, percentage, profit and loss, discount and simple interest',
    covers: ['Ratio, fraction and percentage together', 'Comparing prices and discounts', 'Budgets and pie charts',
             'Simple interest schemes', 'Reading comparison graphs'],
    metaTitle: 'Class 8 Comparing Quantities Case Studies — Solved PDF',
    metaDesc: 'Comparing Quantities case-study questions for Class 8 / Grade 8 Maths — 10 integrated cases, 50 MCQs across percentage, ratio and interest. Instant PDF.',
  },
  {
    ch: 'Introduction to Graphs', slug: 'introduction-to-graphs',
    topics: 'the Cartesian plane, plotting points, reading line graphs, and linear graphs',
    covers: ['The Cartesian plane and coordinates', 'Plotting points', 'Distance-time graphs',
             'Linear graphs through the origin', 'Reading trends'],
    metaTitle: 'Class 8 Introduction to Graphs Case Studies — Solved PDF',
    metaDesc: 'Introduction to Graphs case-study questions for Class 8 / Grade 8 Maths — 10 cases, 50 MCQs on coordinates, line graphs and trends. Instant PDF download.',
  },
  {
    ch: 'Data Handling', slug: 'data-handling',
    topics: 'organising and tabulating data, bar and pie charts, and mean, median and mode',
    covers: ['Frequency tables', 'Bar and double bar graphs', 'Pie charts',
             'Mean, median and mode', 'Choosing the right average'],
    metaTitle: 'Class 8 Data Handling Case Study Questions — Solved PDF',
    metaDesc: 'Data Handling case-study questions for Class 8 / Grade 8 Maths — 10 cases, 50 MCQs on graphs, mean, median and mode, fully solved. Instant PDF download.',
  },
  {
    ch: 'Probability', slug: 'probability',
    topics: 'probability as chance, and simple events with coins, dice, cards and spinners',
    covers: ['Coins and dice', 'Cards and spinners', 'Certain and impossible events',
             'The probability of "not happening"', 'Experiment versus expectation'],
    metaTitle: 'Class 8 Probability Case Study Questions — Solved PDF',
    metaDesc: 'Probability case-study questions for Class 8 / Grade 8 Maths — 10 cases, 50 MCQs on coins, dice, cards and spinners, fully solved. Instant PDF download.',
  },
  {
    ch: 'Mensuration — Advanced Topics', slug: 'mensuration-advanced',
    topics: 'combined and composite plane figures, and the surface area and volume of compound solids',
    covers: ['L-shaped and composite floors', 'Tracks with semicircular ends', 'Cut-outs and frames',
             'Compound solids (cuboid + cylinder)', 'Volumes by adding and subtracting'],
    metaTitle: 'Class 8 Advanced Mensuration Case Studies — Solved PDF',
    metaDesc: 'Advanced Mensuration case studies for Class 8 / Grade 8 Maths — 10 cases, 50 MCQs on composite figures and compound solids, solved. Instant PDF download.',
  },
  {
    ch: 'Direct and Inverse Proportion', slug: 'direct-and-inverse-proportion',
    topics: 'recognising direct and inverse proportion, with tables, graphs and scaling applications',
    covers: ['Recognising direct proportion', 'Recognising inverse proportion', 'Tables and graphs',
             'Speed-time and cost problems', 'Scale models and maps'],
    metaTitle: 'Class 8 Direct & Inverse Proportion Case Studies — PDF',
    metaDesc: 'Direct and Inverse Proportion case-study questions for Class 8 / Grade 8 Maths — 10 cases, 50 MCQs with full solutions. CBSE & ICSE. Instant PDF download.',
  },
];

const title = (b) => `Class 8 ${b.ch} Case Studies With Solutions`;

const shortDesc = (b) =>
  `10 case studies and 50 MCQs on ${b.ch} for Class 8, every question fully solved. ` +
  `Covers ${b.topics}. CBSE, ICSE and State Boards.`;

const description = (b) => `
<p>The <strong>Class 8 ${b.ch} Case Studies With Solutions</strong> e-book gives your child practice
in exactly the format schools now examine: a real-life situation to read, followed by questions that
test whether the concept has actually been understood.</p>
<ul>
  <li><strong>10 case studies</strong> on ${b.ch}, each set in a real Indian context and written in
      about 150 words</li>
  <li><strong>50 multiple-choice questions</strong> — five after every case study, graded from
      warm-up to exam level</li>
  <li><strong>A clear diagram with every case study</strong> — graphs, figures and tables drawn to
      scale, not decoration</li>
  <li><strong>Full worked solutions</strong> for all 50 questions, plus a one-look answer key</li>
  <li>Aligned with the <strong>CBSE, ICSE and State Board</strong> competency-based pattern; equally
      useful for Grade 8 students on international curricula</li>
  <li>${PAGES}-page PDF — instant download, print-ready</li>
</ul>
<p><strong>What this chapter covers:</strong> ${b.covers.join(' &middot; ')}.</p>
<p>Each case study fits on a single page together with its diagram and all five questions, so a
student never has to turn the page to see the data they are being asked about.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    const slug = `class-8-${b.slug}-case-studies-with-solutions`;
    console.log('\n' + '─'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + slug);
    console.log('cover       ' + `${IMG}/class-8-case-studies-${b.slug}.jpg`);
    console.log(`meta_title  ${b.metaTitle}   [${[...b.metaTitle].length}/70]`);
    console.log(`meta_desc   ${b.metaDesc}   [${[...b.metaDesc].length}/160]`);
  }
  console.log('\n' + BOOKS.length + ' products would be written into "' + CAT.name + '".');
}

async function run() {
  if (process.argv.includes('--dry-run')) return dryRun();
  const conn = await mysql.createConnection(cfg);

  await conn.query(`INSERT IGNORE INTO categories (name, slug, sort_order) VALUES (?,?,?)`,
    [CAT.name, CAT.slug, CAT.sort]);
  const [[cat]] = await conn.query(`SELECT id FROM categories WHERE slug=?`, [CAT.slug]);
  console.log(`Category "${CAT.name}" -> id ${cat.id}`);

  let added = 0, updated = 0;
  for (const b of BOOKS) {
    const slug = `class-8-${b.slug}-case-studies-with-solutions`;
    const [[existing]] = await conn.query(`SELECT id FROM products WHERE slug=?`, [slug]);
    const row = [
      title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
      `${IMG}/class-8-case-studies-${b.slug}.jpg`, PAGES, 'Grade 8', 'CBSE/ICSE',
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

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=? AND is_published=1`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated.`);
  console.log(`"${CAT.name}" now holds ${total.n} products.`);
  console.log('Next: ensure data/download-urls.json is on the server, then run scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
