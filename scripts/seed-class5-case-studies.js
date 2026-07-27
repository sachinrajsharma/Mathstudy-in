/**
 * seed-class5-case-studies.js
 *
 * Seeds the 18 chapter-wise Class 5 Maths Case Study e-books into the shop,
 * each with buy-intent SEO metadata (meta_title / meta_desc), a rich product
 * description and its own cover. Creates the "Case Studies Class 5" category if
 * it does not exist yet. Books 1-14 carry the NCERT chapter names in NCERT
 * order; books 15-18 are the ICSE-only chapters (Basic Operations, Time, Money,
 * Word Problems).
 *
 * Idempotent — safe to re-run; it updates existing rows matched on slug and
 * never touches the download link (that comes from the git-ignored
 * data/download-urls.json via scripts/import-download-urls.js).
 *
 *   node scripts/seed-class5-case-studies.js            (write to DB)
 *   node scripts/seed-class5-case-studies.js --dry-run  (print only)
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

const CAT = { name: 'Case Studies Class 5', slug: 'case-studies-class-5', sort: 10 };
const IMG = '/wp-content/uploads';
const PRICE = 41, ORIGINAL = 69;

// Every book: 10 case studies, 50 MCQs, full worked solutions, one diagram per case study.
// `ncert` is the NCERT chapter number (null = ICSE-only chapter).
const BOOKS = [
  {
    ch: 'The Fish Tale', slug: 'the-fish-tale', ncert: 1, pages: 24,
    topics: 'large numbers up to crores, the Indian and international systems, comparing and ordering, rounding off, Roman numerals and estimation',
    covers: ['Place value up to crores', 'Indian and international number systems', 'Comparing and ordering large numbers',
             'Rounding off and estimation in daily life', 'Roman numerals'],
    metaTitle: 'Class 5 Maths The Fish Tale Case Study Questions PDF',
    metaDesc: 'The Fish Tale (NCERT Class 5 Maths Chapter 1) case study questions — 10 solved case studies, 50 MCQs on large numbers, place value and estimation. PDF.',
  },
  {
    ch: 'Shapes and Angles', slug: 'shapes-and-angles', ncert: 2, pages: 24,
    topics: 'lines, rays and segments, acute, right, obtuse and reflex angles, using a protractor, clock-hand angles, triangles, quadrilaterals and polygons',
    covers: ['Points, lines, rays and segments', 'Acute, right, obtuse and reflex angles', 'Measuring angles with a protractor',
             'Angles made by clock hands and everyday objects', 'Triangles, quadrilaterals and polygons'],
    metaTitle: 'Class 5 Shapes and Angles Case Study Questions PDF',
    metaDesc: 'Shapes and Angles case study questions for Class 5 Maths — 10 case studies and 50 MCQs on angle types, protractor use and polygons, fully solved. PDF.',
  },
  {
    ch: 'How Many Squares?', slug: 'how-many-squares', ncert: 3, pages: 24,
    topics: 'counting unit squares, area on squared paper, perimeter on grids, irregular figures with half squares, and same-perimeter different-area puzzles',
    covers: ['Area by counting unit squares', 'Perimeter of shapes drawn on grids', 'Irregular figures and half squares',
             'Same area, different perimeter (and the reverse)', 'Tiling and footprint activities'],
    metaTitle: 'Class 5 How Many Squares Case Study Questions PDF',
    metaDesc: 'How Many Squares? case study questions for Class 5 Maths — 10 case studies and 50 MCQs on area and perimeter with grids, fully solved. Instant PDF.',
  },
  {
    ch: 'Parts and Wholes', slug: 'parts-and-wholes', ncert: 4, pages: 24,
    topics: 'halves, thirds and quarters, equivalent fractions, comparing fractions, addition and subtraction, and fraction of a quantity',
    covers: ['Halves, thirds and quarters of shapes and collections', 'Proper, improper and mixed fractions',
             'Equivalent fractions and simplest form', 'Comparing, adding and subtracting fractions', 'Fraction of a quantity'],
    metaTitle: 'Class 5 Parts and Wholes (Fractions) Case Studies PDF',
    metaDesc: 'Parts and Wholes case study questions for Class 5 Maths — 10 fraction case studies and 50 solved MCQs on halves, quarters and equivalent fractions. PDF.',
  },
  {
    ch: 'Does It Look the Same?', slug: 'does-it-look-the-same', ncert: 5, pages: 24,
    topics: 'lines of symmetry, mirror images, completing symmetric figures, symmetry in letters and nature, and half and quarter turns',
    covers: ['Line symmetry and the fold test', 'Mirror images and reflections', 'Completing symmetric figures on grids',
             'Symmetry in letters, leaves and rangoli', 'Half-turn and quarter-turn rotations'],
    metaTitle: 'Class 5 Does It Look the Same Symmetry Case Studies PDF',
    metaDesc: 'Does It Look the Same? case study questions for Class 5 Maths — 10 symmetry case studies, 50 MCQs on mirror images, turns and patterns, solved. PDF.',
  },
  {
    ch: "Be My Multiple, I'll Be Your Factor", slug: 'be-my-multiple-ill-be-your-factor', ncert: 6, pages: 24,
    topics: 'factors and multiples, even and odd, prime and composite numbers, divisibility rules, common factors and multiples, HCF and LCM',
    covers: ['Factors and multiples in real life', 'Prime and composite numbers', 'Divisibility rules for 2, 3, 5, 9 and 10',
             'Common factors and common multiples', 'HCF and LCM by listing'],
    metaTitle: "Class 5 Be My Multiple I'll Be Your Factor Case Studies",
    metaDesc: "Be My Multiple, I'll Be Your Factor case studies for Class 5 Maths — 10 case studies, 50 MCQs on factors, multiples, primes, HCF and LCM, solved. PDF.",
  },
  {
    ch: 'Can You See the Pattern?', slug: 'can-you-see-the-pattern', ncert: 7, pages: 24,
    topics: 'number patterns, skip counting, growing patterns, turning patterns in borders, calendar patterns and magic squares',
    covers: ['Number patterns and their rules', 'Skip counting and growing patterns', 'Turning patterns in borders and motifs',
             'Calendar and multiplication-table patterns', 'Magic squares and triangular numbers'],
    metaTitle: 'Class 5 Can You See the Pattern Case Study Questions',
    metaDesc: 'Can You See the Pattern? case study questions for Class 5 Maths — 10 case studies and 50 MCQs on number patterns and magic squares, fully solved. PDF.',
  },
  {
    ch: 'Mapping Your Way', slug: 'mapping-your-way', ncert: 8, pages: 24,
    topics: 'reading maps, compass directions, grid references, scale and real distances, and choosing the best route',
    covers: ['Reading simple maps and landmarks', 'The compass directions N, S, E, W', 'Grid references like B3 and D5',
             'Scale: from map distance to real distance', 'Comparing and planning routes'],
    metaTitle: 'Class 5 Mapping Your Way Case Study Questions PDF',
    metaDesc: 'Mapping Your Way case study questions for Class 5 Maths — 10 map-reading case studies, 50 MCQs on directions, scale and grids, fully solved. PDF.',
  },
  {
    ch: 'Boxes and Sketches', slug: 'boxes-and-sketches', ncert: 9, pages: 24,
    topics: 'solid shapes, faces, edges and vertices, nets of cubes and cuboids, dice, and top, front and side views',
    covers: ['Cubes, cuboids, cylinders, cones and spheres', 'Faces, edges and vertices', 'Nets that fold into boxes (and nets that fail)',
             'Dice and the opposite-faces rule', 'Top, front and side views'],
    metaTitle: 'Class 5 Boxes and Sketches Case Study Questions PDF',
    metaDesc: 'Boxes and Sketches case study questions for Class 5 Maths — 10 case studies and 50 MCQs on 3-D shapes, nets, faces, edges and views, solved. PDF.',
  },
  {
    ch: 'Tenths and Hundredths', slug: 'tenths-and-hundredths', ncert: 10, pages: 24,
    topics: 'decimal notation for tenths and hundredths, decimals from fractions, comparing decimals, addition and subtraction, and money, length and temperature',
    covers: ['Tenths and hundredths on the number line', 'Fractions to decimals and back', 'Comparing decimals correctly',
             'Adding and subtracting with column alignment', 'Decimals in money, length, weight and temperature'],
    metaTitle: 'Class 5 Tenths and Hundredths Case Study Questions',
    metaDesc: 'Tenths and Hundredths case study questions for Class 5 Maths — 10 decimal case studies and 50 solved MCQs on money, length and weight. Instant PDF.',
  },
  {
    ch: 'Area and Its Boundary', slug: 'area-and-its-boundary', ncert: 11, pages: 24,
    topics: 'perimeter of rectangles and squares, area by length times breadth, fencing and tiling costs, composite figures, and same-area different-boundary puzzles',
    covers: ['Perimeter of rectangles and squares', 'Area = length x breadth', 'Fencing, ribbon and framing costs',
             'Carpeting and tiling bills', 'L-shaped and composite figures'],
    metaTitle: 'Class 5 Area and Its Boundary Case Study Questions',
    metaDesc: 'Area and Its Boundary case study questions for Class 5 Maths — 10 case studies, 50 MCQs on area, perimeter, fencing and tiling costs, solved. PDF.',
  },
  {
    ch: 'Smart Charts', slug: 'smart-charts', ncert: 12, pages: 24,
    topics: 'tally marks, frequency tables, pictographs with a key, bar graphs with a scale, and drawing conclusions from data',
    covers: ['Collecting data with tally marks', 'Frequency tables', 'Pictographs where one symbol stands for many',
             'Bar graphs and reading the scale', 'Most, least and how-many-more questions'],
    metaTitle: 'Class 5 Smart Charts Case Study Questions — Solved PDF',
    metaDesc: 'Smart Charts case study questions for Class 5 Maths — 10 data-handling case studies, 50 MCQs on tally marks, pictographs and bar graphs, solved. PDF.',
  },
  {
    ch: 'Ways to Multiply and Divide', slug: 'ways-to-multiply-and-divide', ncert: 13, pages: 24,
    topics: 'long multiplication, multiplying by 10, 100 and 1000, division with remainders, checking by multiplying back, unit cost and rate problems',
    covers: ['Long multiplication step by step', 'Multiplying by 10, 100 and 1,000', 'Division by one- and two-digit numbers',
             'Quotient, remainder and the check rule', 'Unit cost, rates and equal sharing'],
    metaTitle: 'Class 5 Ways to Multiply and Divide Case Studies PDF',
    metaDesc: 'Ways to Multiply and Divide case studies for Class 5 Maths — 10 case studies, 50 MCQs on long multiplication, division and remainders, solved. PDF.',
  },
  {
    ch: 'How Big? How Heavy?', slug: 'how-big-how-heavy', ncert: 14, pages: 24,
    topics: 'units of length, weight and capacity, conversions between mm, cm, m and km, g and kg, mL and L, estimation, and volume sense with unit cubes',
    covers: ['Length: mm, cm, m and km conversions', 'Weight: grams, kilograms and the quintal', 'Capacity: millilitres and litres',
             'Reading scales, jugs and balances', 'Volume sense by counting unit cubes'],
    metaTitle: 'Class 5 How Big How Heavy Case Study Questions PDF',
    metaDesc: 'How Big? How Heavy? case study questions for Class 5 Maths — 10 measurement case studies, 50 MCQs on length, weight and capacity units, solved. PDF.',
  },
  {
    ch: 'Basic Operations', slug: 'basic-operations', ncert: null, pages: 24,
    topics: 'column addition and subtraction of large numbers, the DMAS order of operations, mental-maths tricks, number machines and multi-step problems',
    covers: ['Column addition and subtraction with carrying and borrowing', 'The DMAS order of operations',
             'Mental maths: compensation and making tens', 'Number machines and missing numbers', 'Multi-step daily-life problems'],
    metaTitle: 'Class 5 Basic Operations Case Study Questions (ICSE)',
    metaDesc: 'Basic Operations case study questions for Class 5 Maths — 10 case studies, 50 MCQs on addition, subtraction, DMAS and mental maths, solved. PDF.',
  },
  {
    ch: 'Time', slug: 'time', ncert: null, pages: 24,
    topics: 'reading analog clocks, a.m. and p.m., the 24-hour clock, elapsed time, timetables, the calendar and leap years',
    covers: ['Quarter past, half past and quarter to', 'The 24-hour clock and conversions', 'Elapsed time: start, duration, end',
             'Railway and school timetables', 'Calendar work and leap years'],
    metaTitle: 'Class 5 Time Case Study Questions — Solved PDF',
    metaDesc: 'Time case study questions for Class 5 Maths — 10 case studies and 50 MCQs on reading clocks, 24-hour time, calendars and elapsed time, solved. PDF.',
  },
  {
    ch: 'Money', slug: 'money', ncert: null, pages: 24,
    topics: 'rupees and paise, shopping bills, giving change, unit price and best buys, simple profit and loss, discounts and pocket-money budgeting',
    covers: ['Rupees and paise notation', 'Shopping bills: quantity x rate', 'Counting and checking change',
             'Unit price and the best buy', 'Profit, loss, discount and budgeting'],
    metaTitle: 'Class 5 Money Case Study Questions — Solved PDF',
    metaDesc: 'Money case study questions for Class 5 Maths — 10 case studies and 50 MCQs on bills, change, profit and loss and budgeting, fully solved. PDF.',
  },
  {
    ch: 'Word Problems', slug: 'word-problems', ncert: null, pages: 24,
    topics: 'multi-step problems mixing all four operations, choosing the right operation, spotting extra information, working backwards, number riddles and logical reasoning',
    covers: ['The read-plan-solve-check method', 'Choosing the right operation', 'Problems with extra information',
             'Working backwards and number riddles', 'Logical reasoning: ordering and elimination'],
    metaTitle: 'Class 5 Maths Word Problems Case Studies — Solved PDF',
    metaDesc: 'Word Problems case studies for Class 5 Maths — 10 multi-step case studies and 50 MCQs with logical reasoning and full solutions. Instant PDF download.',
  },
];

const title = (b) => `Class 5 ${b.ch} Case Studies With Solutions`;

const shortDesc = (b) =>
  `10 case studies and 50 MCQs on ${b.ch} for Class 5, every question fully solved. ` +
  `Covers ${b.topics}. CBSE, ICSE and State Boards.`;

const description = (b) => `
<p>The <strong>Class 5 ${b.ch} Case Studies With Solutions</strong> e-book gives your child
practice in exactly the format schools now examine: a real-life situation to read, followed by
questions that test whether the concept has actually been understood.${b.ncert
  ? ` It follows <strong>NCERT Class 5 Maths Chapter ${b.ncert} — ${b.ch}</strong>, and works
equally well for ICSE and State Board students.`
  : ` This chapter follows the <strong>ICSE Class 5 Maths</strong> syllabus and is equally useful
as extra practice for CBSE and State Board students.`}</p>
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
    const slug = `class-5-${b.slug}-case-studies-with-solutions`;
    console.log('\n' + '─'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + slug);
    console.log('cover       ' + `${IMG}/class-5-case-studies-${b.slug}.jpg`);
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
    const slug = `class-5-${b.slug}-case-studies-with-solutions`;
    const [[existing]] = await conn.query(`SELECT id FROM products WHERE slug=?`, [slug]);
    const row = [
      title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
      `${IMG}/class-5-case-studies-${b.slug}.jpg`, b.pages, 'Grade 5', 'CBSE/ICSE',
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
  console.log(`\nDone — ${added} added, ${updated} updated.`);
  console.log(`"${CAT.name}" now holds ${total.n} products.`);
  console.log('Next: ensure data/download-urls.json has the class-5 links and run');
  console.log('  node scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
