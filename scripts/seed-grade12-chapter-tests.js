/**
 * seed-grade12-chapter-tests.js
 *
 * Seeds the 15 chapter-wise "Class 12 Maths Chapter Tests" e-books (8 practice
 * papers each) into the "Grade 12 Math" category (grade-12-math, created if
 * missing), each with globally-searchable SEO metadata, a rich HTML description
 * and its own cover. The chapter list mirrors the free study material at
 * vidaara.org/courses/math/class-12 exactly, and every product deep-links to its
 * OWN chapter study page (requirement: wire each e-book to its Class 12 study page).
 *
 * Every book: 8 CBSE/ICSE practice papers, 40 marks / 90 min each, Sections A-E
 * (8+5+3+2+1 = 19 questions/paper, ~152/book) with a case study (5 MCQs) per paper,
 * a complete answer key AND step-by-step detailed solutions deferred to fresh pages.
 *
 * PRICE: Rs 33 (was Rs 47). Seeded with price_locked=1 so the bulk repricer
 * (seed-bundles-pricing) does NOT revert them; the price columns are still guarded
 * with IF(price_locked=1,...) so a later admin price edit survives a re-seed.
 *
 * Idempotent. Never touches download_url (that comes from data/download-urls.json
 * via scripts/import-download-urls.js).
 *
 *   node scripts/seed-grade12-chapter-tests.js            (write to DB)
 *   node scripts/seed-grade12-chapter-tests.js --dry-run  (print only)
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

const CAT_SLUG = 'grade-12-math';
const CAT_NAME = 'Grade 12 Math';
const CAT_SORT = 12;
const IMG = '/wp-content/uploads';
const PRICE = 33, ORIGINAL = 47;
const CLASS12 = 'https://vidaara.org/courses/math/class-12';

// chap = class-12 study slug (product-slug fragment + study deep-link + cover file); pc = pages.
const BOOKS = [
  { ch: 'Relations and Functions', chap: 'relations-and-functions', pc: 45,
    topics: 'types of relations (reflexive, symmetric, transitive and equivalence relations with their classes), one-one and onto functions, bijections, composition of functions and invertible functions',
    metaTitle: 'Class 12 Relations and Functions Practice Papers PDF',
    metaDesc: 'Class 12 Relations and Functions chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Inverse Trigonometric Functions', chap: 'inverse-trigonometric-functions', pc: 48,
    topics: 'principal value branches, domains and ranges of inverse trigonometric functions and their standard properties and identities',
    metaTitle: 'Class 12 Inverse Trigonometric Functions Practice Papers',
    metaDesc: 'Class 12 Inverse Trigonometric Functions chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Matrices', chap: 'matrices', pc: 57,
    topics: 'order and types of matrices, addition and scalar multiplication, matrix multiplication, transpose, symmetric and skew-symmetric matrices and the inverse by elementary operations',
    metaTitle: 'Class 12 Matrices Practice Papers PDF',
    metaDesc: 'Class 12 Matrices chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Determinants', chap: 'determinants', pc: 56,
    topics: 'properties of determinants, area of a triangle, minors and cofactors, the adjoint and inverse of a matrix and solving systems of linear equations',
    metaTitle: 'Class 12 Determinants Practice Papers PDF',
    metaDesc: 'Class 12 Determinants chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Continuity and Differentiability', chap: 'continuity-and-differentiability', pc: 50,
    topics: 'continuity, differentiability, the chain rule, derivatives of implicit, logarithmic, exponential, inverse-trigonometric and parametric functions, second-order derivatives and the Mean Value theorems',
    metaTitle: 'Class 12 Continuity and Differentiability Practice Papers',
    metaDesc: 'Class 12 Continuity and Differentiability chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Application of Derivatives', chap: 'application-of-derivatives', pc: 43,
    topics: 'rates of change, increasing and decreasing functions, tangents and normals, approximations and maxima and minima with real optimisation problems',
    metaTitle: 'Class 12 Application of Derivatives Practice Papers PDF',
    metaDesc: 'Class 12 Application of Derivatives chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Integrals', chap: 'integrals', pc: 50,
    topics: 'integration by substitution, by parts and by partial fractions, standard forms, definite integrals, the fundamental theorem of calculus and its properties',
    metaTitle: 'Class 12 Integrals Practice Papers PDF',
    metaDesc: 'Class 12 Integrals chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Application of Integrals', chap: 'application-of-integrals', pc: 47,
    topics: 'the area under a curve, the area bounded between a curve and a line and the area between two curves using definite integrals',
    metaTitle: 'Class 12 Application of Integrals Practice Papers PDF',
    metaDesc: 'Class 12 Application of Integrals chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Differential Equations', chap: 'differential-equations', pc: 50,
    topics: 'order and degree, forming a differential equation, variable separable, homogeneous and linear differential equations and real growth and decay applications',
    metaTitle: 'Class 12 Differential Equations Practice Papers PDF',
    metaDesc: 'Class 12 Differential Equations chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Vector Algebra', chap: 'vector-algebra', pc: 44,
    topics: 'magnitude and direction cosines, addition of vectors, the scalar (dot) and vector (cross) products, projections and the scalar triple product',
    metaTitle: 'Class 12 Vector Algebra Practice Papers PDF',
    metaDesc: 'Class 12 Vector Algebra chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Three-Dimensional Geometry', chap: 'three-dimensional-geometry', pc: 47,
    topics: 'direction cosines and ratios, the equations of a line and a plane, the angle between lines and planes, the shortest distance between skew lines and coplanarity',
    metaTitle: 'Class 12 Three Dimensional Geometry Practice Papers PDF',
    metaDesc: 'Class 12 Three-Dimensional Geometry chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Linear Programming', chap: 'linear-programming', pc: 46,
    topics: 'formulating a linear programming problem, graphing the feasible region, the corner-point method and bounded and unbounded solutions',
    metaTitle: 'Class 12 Linear Programming Practice Papers PDF',
    metaDesc: 'Class 12 Linear Programming chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Probability', chap: 'probability', pc: 50,
    topics: 'conditional probability, the multiplication theorem, independent events, the total probability theorem, Bayes theorem, random variables and the binomial distribution',
    metaTitle: 'Class 12 Probability Practice Papers PDF',
    metaDesc: 'Class 12 Probability chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Application of Calculus (Commerce)', chap: 'application-of-calculus-commerce', pc: 49,
    topics: 'total, average and marginal cost and revenue, profit maximisation, price elasticity of demand and break-even analysis using calculus',
    metaTitle: 'Class 12 Application of Calculus Commerce Practice Papers',
    metaDesc: 'Class 12 Application of Calculus (Commerce) chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Linear Regression', chap: 'linear-regression', pc: 43,
    topics: 'bivariate data and scatter diagrams, the two lines of regression, the regression coefficients, the correlation coefficient and predicting values',
    metaTitle: 'Class 12 Linear Regression Practice Papers PDF',
    metaDesc: 'Class 12 Linear Regression chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
];

const productSlug = (b) => `class-12-${b.chap}-chapter-practice-tests`;
const title = (b) => `Class 12 ${b.ch} Chapter Tests (8 Practice Papers with Solutions)`;

const shortDesc = (b) =>
  `8 CBSE/ICSE practice papers on Class 12 ${b.ch} — 40 marks / 90 minutes each, ~152 exam-style ` +
  `questions with a case study per paper, complete answer keys and step-by-step detailed solutions.`;

const description = (b) => `
<p>The <strong>Class 12 ${b.ch} Chapter Tests</strong> e-book gives students <strong>8 full practice
papers</strong> on ${b.ch} — timed, exam-ready and marked exactly like the real thing.</p>
<ul>
  <li><strong>8 practice papers</strong>, each <strong>40 marks / 90 minutes</strong>, in the latest
      CBSE &amp; ICSE pattern with <strong>Sections A&ndash;E</strong></li>
  <li><strong>~152 exam-style questions per book</strong> &mdash; MCQs, assertion&ndash;reason,
      very-short / short / long answers, HOTS, and a <strong>case study with 5 MCQs</strong> in every paper</li>
  <li>Difficulty builds from <strong>intermediate to advanced</strong> &mdash; perfect for board revision,
      unit tests, self-assessment and a strong base for JEE &amp; CUET</li>
  <li><strong>Full answer key AND step-by-step detailed solutions</strong> for every paper, kept on
      separate pages so students can attempt each test first</li>
  <li>Competency-based, <strong>NEP 2020</strong> aligned and NCERT terminology; A4 PDF &mdash;
      instant download, print as many times as you need</li>
</ul>
<p><strong>What these papers cover:</strong> ${b.topics}.</p>
<p>Practise alongside the free
<a href="${CLASS12}/${b.chap}" target="_blank" rel="noopener">Class 12 ${b.ch} study material</a>
&mdash; learn the concept free online, then test yourself on paper. See every chapter on the
<a href="${CLASS12}" target="_blank" rel="noopener">Class 12 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '-'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/class-12-chapter-tests-${b.chap}.jpg`);
    console.log('study link  ' + `${CLASS12}/${b.chap}`);
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
         `${IMG}/class-12-chapter-tests-${b.chap}.jpg`, b.pc, 'Class 12', 'CBSE/ICSE',
         b.metaTitle, b.metaDesc, existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,price_locked,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,1,0)`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         `${IMG}/class-12-chapter-tests-${b.chap}.jpg`, b.pc, 'Class 12', 'CBSE/ICSE', b.metaTitle, b.metaDesc]);
      added++; console.log('  added    ' + slug);
    }
  }

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=?`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated. "${CAT_SLUG}" now holds ${total.n} products.`);
  console.log('Prices seeded at Rs ' + PRICE + '/' + ORIGINAL + ' with price_locked=1 (repricer will not change them).');
  console.log('Next: ensure data/download-urls.json has the class-12 chapter-test links and run scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
