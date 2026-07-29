/**
 * seed-grade8-chapter-tests.js
 *
 * Seeds the 22 chapter-wise "Class 8 Maths Chapter Tests" e-books (8 practice
 * papers each) into the "Grade 8 Math" category (grade-8-math, created if
 * missing), each with globally-searchable SEO metadata, a rich HTML description
 * and its own cover. The chapter list mirrors the free study material at
 * vidaara.org/courses/math/class-8 exactly, and every product deep-links to its
 * OWN chapter study page.
 *
 * Every book: 8 CBSE/ICSE practice papers, 40 marks / 90 min each, Sections A-E
 * (8+5+3+2+1 = 19 questions/paper, ~152/book) with a case study (5 MCQs) per paper,
 * a complete answer key AND step-by-step detailed solutions deferred to fresh pages.
 *
 * PRICE: Rs 33 (was Rs 47). Seeded with price_locked=1 so the bulk repricer does
 * NOT revert them; price columns guarded with IF(price_locked=1,...).
 *
 * Idempotent. Never touches download_url (that comes from data/download-urls.json
 * via scripts/import-download-urls.js).
 *
 *   node scripts/seed-grade8-chapter-tests.js            (write to DB)
 *   node scripts/seed-grade8-chapter-tests.js --dry-run  (print only)
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
const PRICE = 33, ORIGINAL = 47;
const CLASS8 = 'https://vidaara.org/courses/math/class-8';

// chap = class-8 study slug (product-slug fragment + study deep-link + cover file); pc = pages.
const BOOKS = [
  { ch: 'Rational Numbers', chap: 'rational-numbers', pc: 47,
    topics: 'rational numbers on the number line, their properties, additive and multiplicative inverses, operations and standard form',
    metaTitle: 'Class 8 Rational Numbers Practice Papers PDF',
    metaDesc: 'Class 8 Rational Numbers chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Irrational Numbers', chap: 'irrational-numbers', pc: 42,
    topics: 'irrational numbers, square roots of non-perfect squares, decimal expansions and locating surds on the number line',
    metaTitle: 'Class 8 Irrational Numbers Practice Papers PDF',
    metaDesc: 'Class 8 Irrational Numbers chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Integers and Absolute Value', chap: 'integers-absolute-value', pc: 42,
    topics: 'integers on the number line, ordering, absolute value, the four operations and their properties',
    metaTitle: 'Class 8 Integers and Absolute Value Practice Papers',
    metaDesc: 'Class 8 Integers and Absolute Value chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Algebraic Expressions', chap: 'algebraic-expressions', pc: 43,
    topics: 'terms and coefficients, addition and multiplication of expressions, the standard identities and simple factorisation',
    metaTitle: 'Class 8 Algebraic Expressions Practice Papers PDF',
    metaDesc: 'Class 8 Algebraic Expressions chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Linear Equations', chap: 'linear-equations', pc: 42,
    topics: 'linear equations in one variable, solving by transposition, variable on both sides and word problems',
    metaTitle: 'Class 8 Linear Equations Practice Papers PDF',
    metaDesc: 'Class 8 Linear Equations chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Patterns and Sequences', chap: 'patterns-sequences', pc: 49,
    topics: 'number patterns and rules, the general term of a sequence, figurate numbers and pattern diagrams',
    metaTitle: 'Class 8 Patterns and Sequences Practice Papers PDF',
    metaDesc: 'Class 8 Patterns and Sequences chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Coordinate Geometry', chap: 'coordinate-geometry', pc: 44,
    topics: 'the Cartesian plane, plotting points, the four quadrants and reading coordinates',
    metaTitle: 'Class 8 Coordinate Geometry Practice Papers PDF',
    metaDesc: 'Class 8 Coordinate Geometry chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Basic Geometry', chap: 'basic-geometry', pc: 50,
    topics: 'lines and angles, pairs of angles, and parallel lines cut by a transversal',
    metaTitle: 'Class 8 Basic Geometry Practice Papers PDF',
    metaDesc: 'Class 8 Basic Geometry (lines and angles) chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Triangles', chap: 'triangles', pc: 50,
    topics: 'types of triangles, the angle-sum and exterior-angle properties, congruence and the Pythagoras property',
    metaTitle: 'Class 8 Triangles Practice Papers PDF',
    metaDesc: 'Class 8 Triangles chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Quadrilaterals', chap: 'quadrilaterals', pc: 50,
    topics: 'the angle-sum property and the properties of parallelograms, rectangles, rhombuses, squares, trapeziums and kites',
    metaTitle: 'Class 8 Quadrilaterals Practice Papers PDF',
    metaDesc: 'Class 8 Quadrilaterals chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Polygons', chap: 'polygons', pc: 49,
    topics: 'convex and regular polygons, diagonals, interior and exterior angle sums and tessellation',
    metaTitle: 'Class 8 Polygons Practice Papers PDF',
    metaDesc: 'Class 8 Polygons chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Circles', chap: 'circles', pc: 50,
    topics: 'the parts of a circle, circumference and area, and the length of an arc and area of a sector',
    metaTitle: 'Class 8 Circles Practice Papers PDF',
    metaDesc: 'Class 8 Circles chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Transformations', chap: 'transformations', pc: 50,
    topics: 'reflection, rotation, translation, line symmetry and rotational symmetry',
    metaTitle: 'Class 8 Transformations Practice Papers PDF',
    metaDesc: 'Class 8 Transformations chapter tests: 8 practice papers (40 marks each) on reflection, rotation and symmetry, with case studies and full solutions.' },
  { ch: 'Perimeter and Area', chap: 'perimeter-area', pc: 56,
    topics: 'the perimeter and area of plane figures, circles, and composite and shaded regions',
    metaTitle: 'Class 8 Perimeter and Area Practice Papers PDF',
    metaDesc: 'Class 8 Perimeter and Area chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Surface Area and Volume', chap: 'surface-area-volume', pc: 48,
    topics: 'the surface area and volume of the cube, cuboid and cylinder, and their nets and capacity',
    metaTitle: 'Class 8 Surface Area and Volume Practice Papers PDF',
    metaDesc: 'Class 8 Surface Area and Volume chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Data Representation', chap: 'data-representation', pc: 58,
    topics: 'frequency tables, bar graphs, double bar graphs, pie charts and histograms',
    metaTitle: 'Class 8 Data Representation Practice Papers PDF',
    metaDesc: 'Class 8 Data Representation (Handling) chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Measures of Central Tendency', chap: 'measures-central-tendency', pc: 48,
    topics: 'the mean, median, mode and range of ungrouped data and choosing the right average',
    metaTitle: 'Class 8 Measures of Central Tendency Practice Papers',
    metaDesc: 'Class 8 Measures of Central Tendency chapter tests: 8 practice papers (40 marks each) on mean, median and mode, with case studies and full solutions.' },
  { ch: 'Probability', chap: 'probability', pc: 45,
    topics: 'the classical definition of probability, certain and impossible events, and single-action experiments',
    metaTitle: 'Class 8 Probability Practice Papers PDF',
    metaDesc: 'Class 8 Probability chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Ratio, Proportion and Percentages', chap: 'ratio-proportion-percentages', pc: 42,
    topics: 'ratio, proportion, the unitary method, direct and inverse proportion and the basics of percentage',
    metaTitle: 'Class 8 Ratio and Proportion Practice Papers PDF',
    metaDesc: 'Class 8 Ratio, Proportion and Percentages chapter tests: 8 practice papers (40 marks each) with case studies and full solutions.' },
  { ch: 'Percentages', chap: 'percentages', pc: 45,
    topics: 'percentage conversions, percentage of a quantity, percentage increase and decrease and successive changes',
    metaTitle: 'Class 8 Percentages Practice Papers PDF',
    metaDesc: 'Class 8 Percentages chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Commercial Mathematics', chap: 'commercial-mathematics', pc: 47,
    topics: 'profit and loss, discount, sales tax, and simple and compound interest',
    metaTitle: 'Class 8 Commercial Mathematics Practice Papers PDF',
    metaDesc: 'Class 8 Commercial Mathematics chapter tests: 8 practice papers (40 marks each) on profit, loss, discount and interest, with full solutions.' },
  { ch: 'Logical Reasoning', chap: 'logical-reasoning', pc: 49,
    topics: 'number and letter series, analogies, coding-decoding, figure patterns and logical puzzles',
    metaTitle: 'Class 8 Logical Reasoning Practice Papers PDF',
    metaDesc: 'Class 8 Logical Reasoning chapter tests: 8 practice papers (40 marks each) on series, coding and puzzles, with case studies and full solutions.' },
];

const productSlug = (b) => `class-8-${b.chap}-chapter-practice-tests`;
const title = (b) => `Class 8 ${b.ch} Chapter Tests (8 Practice Papers with Solutions)`;

const shortDesc = (b) =>
  `8 CBSE/ICSE practice papers on Class 8 ${b.ch} — 40 marks / 90 minutes each, ~152 exam-style ` +
  `questions with a case study per paper, complete answer keys and step-by-step detailed solutions.`;

const description = (b) => `
<p>The <strong>Class 8 ${b.ch} Chapter Tests</strong> e-book gives students <strong>8 full practice
papers</strong> on ${b.ch} — timed, exam-ready and marked exactly like the real thing.</p>
<ul>
  <li><strong>8 practice papers</strong>, each <strong>40 marks / 90 minutes</strong>, in the latest
      CBSE &amp; ICSE pattern with <strong>Sections A&ndash;E</strong></li>
  <li><strong>~152 exam-style questions per book</strong> &mdash; MCQs, assertion&ndash;reason,
      very-short / short / long answers, HOTS, and a <strong>case study with 5 MCQs</strong> in every paper</li>
  <li>Difficulty builds from <strong>intermediate to advanced</strong> &mdash; perfect for term revision,
      unit tests, self-assessment and Olympiad preparation</li>
  <li><strong>Full answer key AND step-by-step detailed solutions</strong> for every paper, kept on
      separate pages so students can attempt each test first</li>
  <li>Competency-based, <strong>NEP 2020</strong> aligned and NCERT terminology; A4 PDF &mdash;
      instant download, print as many times as you need</li>
</ul>
<p><strong>What these papers cover:</strong> ${b.topics}.</p>
<p>Practise alongside the free
<a href="${CLASS8}/${b.chap}" target="_blank" rel="noopener">Class 8 ${b.ch} study material</a>
&mdash; learn the concept free online, then test yourself on paper. See every chapter on the
<a href="${CLASS8}" target="_blank" rel="noopener">Class 8 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '-'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/class-8-chapter-tests-${b.chap}.jpg`);
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
      await conn.query(
        `UPDATE products SET title=?,slug=?,description=?,short_desc=?,category_id=?,
         price=IF(price_locked=1,price,?),original_price=IF(price_locked=1,original_price,?),
         cover_image=?,page_count=?,grade=?,board=?,meta_title=?,meta_desc=?,
         is_published=1,price_locked=1 WHERE id=?`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         `${IMG}/class-8-chapter-tests-${b.chap}.jpg`, b.pc, 'Class 8', 'CBSE/ICSE',
         b.metaTitle, b.metaDesc, existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,price_locked,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,1,0)`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         `${IMG}/class-8-chapter-tests-${b.chap}.jpg`, b.pc, 'Class 8', 'CBSE/ICSE', b.metaTitle, b.metaDesc]);
      added++; console.log('  added    ' + slug);
    }
  }

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=?`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated. "${CAT_SLUG}" now holds ${total.n} products.`);
  console.log('Prices seeded at Rs ' + PRICE + '/' + ORIGINAL + ' with price_locked=1 (repricer will not change them).');
  console.log('Next: ensure data/download-urls.json has the class-8 chapter-test links and run scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
