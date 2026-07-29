/**
 * seed-grade10-chapter-tests.js
 *
 * Seeds the 20 chapter-wise "Class 10 Maths Chapter Tests" e-books (8 practice
 * papers each) into the "Grade 10 Math" category (grade-10-math, created if
 * missing), each with globally-searchable SEO metadata, a rich HTML description
 * and its own cover. The chapter list mirrors the free study material at
 * vidaara.org/courses/math/class-10 exactly, and every product deep-links to its
 * OWN chapter study page.
 *
 * Every book: 8 CBSE/ICSE practice papers, 40 marks / 90 min each, Sections A-E
 * (8+5+3+2+1 = 19 questions/paper, ~152/book) with a case study (5 MCQs) per paper,
 * a complete answer key AND step-by-step detailed solutions deferred to fresh pages.
 * Books 14-20 are the ICSE/ISC-stream chapters.
 *
 * PRICE: Rs 33 (was Rs 47). Seeded with price_locked=1 so the bulk repricer does
 * NOT revert them; price columns guarded with IF(price_locked=1,...).
 *
 * Idempotent. Never touches download_url (that comes from data/download-urls.json
 * via scripts/import-download-urls.js).
 *
 *   node scripts/seed-grade10-chapter-tests.js            (write to DB)
 *   node scripts/seed-grade10-chapter-tests.js --dry-run  (print only)
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

const CAT_SLUG = 'grade-10-math';
const CAT_NAME = 'Grade 10 Math';
const CAT_SORT = 10;
const IMG = '/wp-content/uploads';
const PRICE = 33, ORIGINAL = 47;
const CLASS10 = 'https://vidaara.org/courses/math/class-10';

// chap = class-10 study slug (product-slug fragment + study deep-link + cover file); pc = pages.
const BOOKS = [
  { ch: 'Number Systems', chap: 'number-systems', pc: 47,
    topics: "Euclid's division lemma, the Fundamental Theorem of Arithmetic, HCF and LCM by prime factorisation, proving irrationality of surds, and terminating and non-terminating recurring decimals",
    metaTitle: 'Class 10 Real Numbers Practice Papers PDF',
    metaDesc: 'Class 10 Number Systems (Real Numbers) chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Polynomials', chap: 'polynomials', pc: 45,
    topics: 'the geometrical meaning of the zeroes of a polynomial, the relationship between the zeroes and coefficients, and the division algorithm for polynomials',
    metaTitle: 'Class 10 Polynomials Practice Papers PDF',
    metaDesc: 'Class 10 Polynomials chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Pair of Linear Equations in Two Variables', chap: 'pair-linear-equations', pc: 43,
    topics: 'the graphical method and nature of solutions, and the substitution, elimination and cross-multiplication methods with real-life word problems',
    metaTitle: 'Class 10 Pair of Linear Equations Practice Papers',
    metaDesc: 'Class 10 Pair of Linear Equations in Two Variables chapter tests: 8 practice papers (40 marks each) with case studies and full solutions.' },
  { ch: 'Quadratic Equations', chap: 'quadratic-equations', pc: 44,
    topics: 'solving by factorisation and the quadratic formula, the discriminant and nature of roots, and word problems reducible to quadratic equations',
    metaTitle: 'Class 10 Quadratic Equations Practice Papers PDF',
    metaDesc: 'Class 10 Quadratic Equations chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Arithmetic Progressions', chap: 'arithmetic-progressions', pc: 49,
    topics: 'the nth term and the sum of n terms of an AP, and real-life problems on savings, salaries, seating and installments',
    metaTitle: 'Class 10 Arithmetic Progressions Practice Papers PDF',
    metaDesc: 'Class 10 Arithmetic Progressions chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Coordinate Geometry', chap: 'coordinate-geometry', pc: 43,
    topics: 'the distance formula and the section formula with applications to collinearity, triangles and quadrilaterals',
    metaTitle: 'Class 10 Coordinate Geometry Practice Papers PDF',
    metaDesc: 'Class 10 Coordinate Geometry chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Triangles', chap: 'triangles', pc: 48,
    topics: 'the Basic Proportionality Theorem, the criteria for similarity of triangles, the ratio of areas of similar triangles and the Pythagoras theorem',
    metaTitle: 'Class 10 Triangles Practice Papers PDF',
    metaDesc: 'Class 10 Triangles (similarity) chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Circles', chap: 'circles', pc: 49,
    topics: 'the tangent to a circle, the tangent perpendicular to the radius, the equal lengths of tangents from an external point and their applications',
    metaTitle: 'Class 10 Circles Practice Papers PDF',
    metaDesc: 'Class 10 Circles (tangents) chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Trigonometry', chap: 'trigonometry', pc: 44,
    topics: 'trigonometric ratios and ratios of specific angles, trigonometric identities, complementary angles, and heights and distances',
    metaTitle: 'Class 10 Trigonometry Practice Papers PDF',
    metaDesc: 'Class 10 Trigonometry chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Areas Related to Circles', chap: 'areas-related-to-circles', pc: 49,
    topics: 'the circumference and area of a circle, the length of an arc, the area of a sector and segment, and areas of combinations of plane figures',
    metaTitle: 'Class 10 Areas Related to Circles Practice Papers',
    metaDesc: 'Class 10 Areas Related to Circles chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Mensuration', chap: 'mensuration', pc: 50,
    topics: 'the surface area and volume of combinations of solids, the conversion of one solid into another, and the frustum of a cone',
    metaTitle: 'Class 10 Mensuration Practice Papers PDF',
    metaDesc: 'Class 10 Mensuration (Surface Areas and Volumes) chapter tests: 8 practice papers (40 marks each) with case studies and full solutions.' },
  { ch: 'Statistics', chap: 'statistics', pc: 50,
    topics: 'the mean, mode and median of grouped data by the direct, assumed-mean and step-deviation methods',
    metaTitle: 'Class 10 Statistics Practice Papers PDF',
    metaDesc: 'Class 10 Statistics chapter tests: 8 CBSE practice papers (40 marks each) on grouped data, with case studies, answer keys and full solutions.' },
  { ch: 'Probability', chap: 'probability', pc: 49,
    topics: 'the classical (theoretical) definition of probability, the complement rule, and single-event experiments with dice, coins, cards and balls',
    metaTitle: 'Class 10 Probability Practice Papers PDF',
    metaDesc: 'Class 10 Probability chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Factorization', chap: 'factorization', pc: 43,
    topics: 'the Remainder Theorem and Factor Theorem, and factorising quadratic and cubic polynomials',
    metaTitle: 'Class 10 Factorisation Practice Papers PDF (ICSE)',
    metaDesc: 'ICSE Class 10 Factorisation chapter tests: 8 practice papers (40 marks each) on the remainder and factor theorems, with case studies and full solutions.' },
  { ch: 'Matrices', chap: 'matrices', pc: 50,
    topics: 'the order and types of matrices, addition, subtraction and scalar multiplication, matrix multiplication and the transpose',
    metaTitle: 'Class 10 Matrices Practice Papers PDF (ICSE)',
    metaDesc: 'ICSE Class 10 Matrices chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Ratio and Proportion', chap: 'ratio-and-proportion', pc: 46,
    topics: 'ratios and proportion, continued proportion and mean proportional, and the properties of componendo and dividendo',
    metaTitle: 'Class 10 Ratio and Proportion Practice Papers (ICSE)',
    metaDesc: 'ICSE Class 10 Ratio and Proportion chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Banking', chap: 'banking', pc: 47,
    topics: 'recurring deposit accounts, computing the interest and maturity value, and finding the monthly deposit, rate or time',
    metaTitle: 'Class 10 Banking Practice Papers PDF (ICSE)',
    metaDesc: 'ICSE Class 10 Banking (recurring deposit) chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Shares and Dividends', chap: 'shares-and-dividends', pc: 49,
    topics: 'nominal and market value, shares at par, premium and discount, dividend and income, and the percentage return on investment',
    metaTitle: 'Class 10 Shares and Dividends Practice Papers (ICSE)',
    metaDesc: 'ICSE Class 10 Shares and Dividends chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Linear Inequations', chap: 'linear-inequations', pc: 42,
    topics: 'solving linear inequations in one variable over a replacement set, the sign-flip rule, and representing solutions on a number line',
    metaTitle: 'Class 10 Linear Inequations Practice Papers (ICSE)',
    metaDesc: 'ICSE Class 10 Linear Inequations in one variable chapter tests: 8 practice papers (40 marks each) with case studies and full solutions.' },
  { ch: 'Loci', chap: 'loci', pc: 50,
    topics: 'the locus of a point equidistant from two points or two lines, loci at a fixed distance, and combining locus conditions',
    metaTitle: 'Class 10 Loci Practice Papers PDF (ICSE)',
    metaDesc: 'ICSE Class 10 Loci chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
];

const productSlug = (b) => `class-10-${b.chap}-chapter-practice-tests`;
const title = (b) => `Class 10 ${b.ch} Chapter Tests (8 Practice Papers with Solutions)`;

const shortDesc = (b) =>
  `8 CBSE/ICSE practice papers on Class 10 ${b.ch} — 40 marks / 90 minutes each, ~152 exam-style ` +
  `questions with a case study per paper, complete answer keys and step-by-step detailed solutions.`;

const description = (b) => `
<p>The <strong>Class 10 ${b.ch} Chapter Tests</strong> e-book gives students <strong>8 full practice
papers</strong> on ${b.ch} — timed, exam-ready and marked exactly like the real thing.</p>
<ul>
  <li><strong>8 practice papers</strong>, each <strong>40 marks / 90 minutes</strong>, in the latest
      CBSE &amp; ICSE pattern with <strong>Sections A&ndash;E</strong></li>
  <li><strong>~152 exam-style questions per book</strong> &mdash; MCQs, assertion&ndash;reason,
      very-short / short / long answers, HOTS, and a <strong>case study with 5 MCQs</strong> in every paper</li>
  <li>Difficulty builds from <strong>intermediate to advanced</strong> &mdash; perfect for board revision,
      unit tests, self-assessment and a strong base for competitive exams</li>
  <li><strong>Full answer key AND step-by-step detailed solutions</strong> for every paper, kept on
      separate pages so students can attempt each test first</li>
  <li>Competency-based, <strong>NEP 2020</strong> aligned and NCERT terminology; A4 PDF &mdash;
      instant download, print as many times as you need</li>
</ul>
<p><strong>What these papers cover:</strong> ${b.topics}.</p>
<p>Practise alongside the free
<a href="${CLASS10}/${b.chap}" target="_blank" rel="noopener">Class 10 ${b.ch} study material</a>
&mdash; learn the concept free online, then test yourself on paper. See every chapter on the
<a href="${CLASS10}" target="_blank" rel="noopener">Class 10 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '-'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/class-10-chapter-tests-${b.chap}.jpg`);
    console.log('study link  ' + `${CLASS10}/${b.chap}`);
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
         `${IMG}/class-10-chapter-tests-${b.chap}.jpg`, b.pc, 'Class 10', 'CBSE/ICSE',
         b.metaTitle, b.metaDesc, existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,price_locked,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,1,0)`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         `${IMG}/class-10-chapter-tests-${b.chap}.jpg`, b.pc, 'Class 10', 'CBSE/ICSE', b.metaTitle, b.metaDesc]);
      added++; console.log('  added    ' + slug);
    }
  }

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=?`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated. "${CAT_SLUG}" now holds ${total.n} products.`);
  console.log('Prices seeded at Rs ' + PRICE + '/' + ORIGINAL + ' with price_locked=1 (repricer will not change them).');
  console.log('Next: ensure data/download-urls.json has the class-10 chapter-test links and run scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
