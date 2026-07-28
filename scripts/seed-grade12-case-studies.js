/**
 * seed-grade12-case-studies.js
 *
 * Seeds the 15 chapter-wise "Class 12 Maths Case Studies" e-books into a
 * "Grade 12 Math" category (grade-12-math, created if missing), each with
 * globally-searchable SEO metadata, a rich HTML description and its own cover.
 * The chapter list mirrors the free study material at
 * vidaara.org/courses/math/class-12 exactly, and every product deep-links to its
 * OWN chapter study page (requirement: wire each e-book to its Class 12 study page).
 *
 * Every book: 10 real-life CASE STUDIES (each a 125-145 word passage + a diagram
 * + 5 MCQs) = 50 MCQs, a complete answer key AND step-by-step detailed solutions
 * deferred to fresh pages. 13-15pp.
 *
 * PRICE: Rs 35 (was Rs 49). Seeded with price_locked=1 so the bulk repricer
 * (seed-bundles-pricing) does NOT revert them; the price columns are still guarded
 * with IF(price_locked=1,...) so a later admin price edit survives a re-seed.
 *
 * Idempotent. Never touches download_url (that comes from data/download-urls.json
 * via scripts/import-download-urls.js).
 *
 *   node scripts/seed-grade12-case-studies.js            (write to DB)
 *   node scripts/seed-grade12-case-studies.js --dry-run  (print only)
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
const PRICE = 35, ORIGINAL = 49;
const CLASS12 = 'https://vidaara.org/courses/math/class-12';

// chap = class-12 study slug (product-slug fragment + study deep-link + cover file); pc = pages.
const BOOKS = [
  { ch: 'Relations and Functions', chap: 'relations-and-functions', pc: 14,
    topics: 'types of relations (reflexive, symmetric, transitive and equivalence relations with their classes), one-one and onto functions, bijections, the composition of functions and invertible functions',
    metaTitle: 'Class 12 Relations and Functions Case Studies PDF',
    metaDesc: 'Class 12 Relations and Functions case studies: 10 scenarios, 50 MCQs on equivalence relations, one-one, onto and inverse functions, with full solutions.' },
  { ch: 'Inverse Trigonometric Functions', chap: 'inverse-trigonometric-functions', pc: 14,
    topics: 'the principal value branches, domains and ranges of inverse trigonometric functions and their standard properties and identities',
    metaTitle: 'Class 12 Inverse Trigonometric Functions Case Studies',
    metaDesc: 'Class 12 Inverse Trigonometric Functions case studies: 10 scenarios, 50 MCQs on principal values, domains, ranges and identities, with full solutions.' },
  { ch: 'Matrices', chap: 'matrices', pc: 14,
    topics: 'the order and types of matrices, addition and scalar multiplication, matrix multiplication, the transpose, symmetric and skew-symmetric matrices and the inverse by elementary operations',
    metaTitle: 'Class 12 Matrices Case Study Questions PDF',
    metaDesc: 'Class 12 Matrices case studies: 10 scenarios, 50 MCQs on matrix operations, transpose, symmetric matrices and inverses, with answers and full solutions.' },
  { ch: 'Determinants', chap: 'determinants', pc: 15,
    topics: 'the properties of determinants, area of a triangle, minors and cofactors, the adjoint and inverse of a matrix and solving systems of linear equations',
    metaTitle: 'Class 12 Determinants Case Study Questions PDF',
    metaDesc: 'Class 12 Determinants case studies: 10 real-life case studies (50 MCQs) on properties, area, adjoint, inverse and solving linear systems, with full solutions.' },
  { ch: 'Continuity and Differentiability', chap: 'continuity-and-differentiability', pc: 15,
    topics: 'continuity and differentiability, the chain rule, derivatives of implicit, logarithmic, exponential, inverse-trigonometric and parametric functions, second-order derivatives and the Mean Value theorems',
    metaTitle: 'Class 12 Continuity and Differentiability Case Studies',
    metaDesc: 'Class 12 Continuity and Differentiability case studies: 10 real-life case studies (50 MCQs) on continuity, chain rule and derivatives, with full solutions.' },
  { ch: 'Application of Derivatives', chap: 'application-of-derivatives', pc: 14,
    topics: 'rates of change, increasing and decreasing functions, tangents and normals, approximations and maxima and minima with real optimisation problems',
    metaTitle: 'Class 12 Application of Derivatives Case Studies PDF',
    metaDesc: 'Class 12 Application of Derivatives case studies: 10 real-life case studies (50 MCQs) on rates of change, tangents, maxima and minima, with full solutions.' },
  { ch: 'Integrals', chap: 'integrals', pc: 14,
    topics: 'integration by substitution, by parts and by partial fractions, the standard forms, definite integrals, the fundamental theorem of calculus and its properties',
    metaTitle: 'Class 12 Integrals Case Study Questions PDF',
    metaDesc: 'Class 12 Integrals case studies: 10 real-life case studies (50 MCQs) on substitution, by parts, partial fractions and definite integrals, with full solutions.' },
  { ch: 'Application of Integrals', chap: 'application-of-integrals', pc: 15,
    topics: 'the area under a curve, the area bounded between a curve and a line and the area between two curves using definite integrals',
    metaTitle: 'Class 12 Application of Integrals Case Studies PDF',
    metaDesc: 'Class 12 Application of Integrals case studies: 10 real-life case studies (50 MCQs) on area under curves and area between two curves, with full solutions.' },
  { ch: 'Differential Equations', chap: 'differential-equations', pc: 15,
    topics: 'the order and degree of a differential equation, forming a differential equation, variable separable, homogeneous and linear differential equations and real growth and decay applications',
    metaTitle: 'Class 12 Differential Equations Case Studies PDF',
    metaDesc: 'Class 12 Differential Equations case studies: 10 scenarios, 50 MCQs on order, degree, variable separable and linear equations, with full solutions.' },
  { ch: 'Vector Algebra', chap: 'vector-algebra', pc: 14,
    topics: 'the magnitude and direction cosines of a vector, the addition of vectors, the scalar (dot) and vector (cross) products, projections and the scalar triple product',
    metaTitle: 'Class 12 Vector Algebra Case Study Questions PDF',
    metaDesc: 'Class 12 Vector Algebra case studies: 10 scenarios, 50 MCQs on dot product, cross product, projections and the triple product, with full solutions.' },
  { ch: 'Three-Dimensional Geometry', chap: 'three-dimensional-geometry', pc: 13,
    topics: 'direction cosines and ratios, the equations of a line and a plane, the angle between lines and planes, the shortest distance between skew lines and coplanarity',
    metaTitle: 'Class 12 Three Dimensional Geometry Case Studies PDF',
    metaDesc: 'Class 12 Three-Dimensional Geometry case studies: 10 real-life case studies (50 MCQs) on lines, planes, angles and shortest distance, with full solutions.' },
  { ch: 'Linear Programming', chap: 'linear-programming', pc: 14,
    topics: 'formulating a linear programming problem, graphing the feasible region, the corner-point method and bounded and unbounded solutions',
    metaTitle: 'Class 12 Linear Programming Case Study Questions PDF',
    metaDesc: 'Class 12 Linear Programming case studies: 10 real-life case studies (50 MCQs) on formulation, feasible regions and the corner-point method, with full solutions.' },
  { ch: 'Probability', chap: 'probability', pc: 14,
    topics: 'conditional probability, the multiplication theorem, independent events, the total probability theorem, Bayes theorem, random variables and the binomial distribution',
    metaTitle: 'Class 12 Probability Case Study Questions PDF',
    metaDesc: 'Class 12 Probability case studies: 10 scenarios, 50 MCQs on conditional probability, Bayes theorem and the binomial distribution, with full solutions.' },
  { ch: 'Application of Calculus (Commerce)', chap: 'application-of-calculus-commerce', pc: 15,
    topics: 'total, average and marginal cost and revenue, profit maximisation, price elasticity of demand and break-even analysis using calculus',
    metaTitle: 'Class 12 Application of Calculus Commerce Case Studies',
    metaDesc: 'Class 12 Application of Calculus (Commerce) case studies: 10 scenarios, 50 MCQs on marginal cost, revenue, profit and elasticity, with full solutions.' },
  { ch: 'Linear Regression', chap: 'linear-regression', pc: 14,
    topics: 'bivariate data and scatter diagrams, the two lines of regression, the regression coefficients, the correlation coefficient and predicting values',
    metaTitle: 'Class 12 Linear Regression Case Study Questions PDF',
    metaDesc: 'Class 12 Linear Regression case studies: 10 scenarios, 50 MCQs on scatter diagrams, regression lines and coefficients, with answers and full solutions.' },
];

const productSlug = (b) => `class-12-${b.chap}-case-studies-with-solutions`;
const title = (b) => `Class 12 ${b.ch} Case Studies With Solutions (10 Case Studies, 50 MCQs)`;

const shortDesc = (b) =>
  `10 real-life Class 12 ${b.ch} case studies -- each a passage with a diagram and 5 MCQs (50 in all) ` +
  `-- with a complete answer key and step-by-step detailed solutions. CBSE / ICSE / ISC, competency-based.`;

const description = (b) => `
<p>The <strong>Class 12 ${b.ch} Case Studies With Solutions</strong> e-book gives students
<strong>10 real-life case studies</strong> on ${b.ch} &mdash; exactly the competency-based,
case-study format that today's board and entrance exams reward.</p>
<ul>
  <li><strong>10 case studies</strong>, each a 125&ndash;145 word real-life scenario with a diagram,
      followed by <strong>5 MCQs</strong> &mdash; <strong>50 questions</strong> in all</li>
  <li>Questions test <strong>understanding through application and reasoning</strong>, not memorisation</li>
  <li>Difficulty builds from <strong>intermediate to advanced</strong> &mdash; ideal for Class 12 board exams
      and a strong foundation for JEE, CUET and other competitive tests</li>
  <li><strong>Full answer key AND step-by-step detailed solutions</strong> at the end, on separate
      pages so students can attempt every case study first</li>
  <li>Competency-based, <strong>NEP 2020</strong> aligned and NCERT terminology; A4 PDF &mdash;
      instant download, print as many times as you need</li>
</ul>
<p><strong>What these case studies cover:</strong> ${b.topics}.</p>
<p>Practise alongside the free
<a href="${CLASS12}/${b.chap}" target="_blank" rel="noopener">Class 12 ${b.ch} study material</a>
&mdash; learn the concept free online, then apply it. See every chapter on the
<a href="${CLASS12}" target="_blank" rel="noopener">Class 12 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '-'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/class-12-case-studies-${b.chap}.jpg`);
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
         `${IMG}/class-12-case-studies-${b.chap}.jpg`, b.pc, 'Class 12', 'CBSE/ICSE/ISC',
         b.metaTitle, b.metaDesc, existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,price_locked,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,1,0)`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         `${IMG}/class-12-case-studies-${b.chap}.jpg`, b.pc, 'Class 12', 'CBSE/ICSE/ISC', b.metaTitle, b.metaDesc]);
      added++; console.log('  added    ' + slug);
    }
  }

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=?`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated. "${CAT_SLUG}" now holds ${total.n} products.`);
  console.log('Prices seeded at Rs ' + PRICE + '/' + ORIGINAL + ' with price_locked=1 (repricer will not change them).');
  console.log('Next: ensure data/download-urls.json has the class-12 case-study links and run scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
