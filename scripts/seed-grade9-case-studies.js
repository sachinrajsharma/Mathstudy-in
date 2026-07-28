/**
 * seed-grade9-case-studies.js
 *
 * Seeds the 24 chapter-wise "Class 9 Maths Case Studies" e-books into the
 * "Grade 9 Math" category (grade-9-math), each with globally-searchable SEO
 * metadata, a rich HTML description and its own cover. The chapter list mirrors
 * the free study material at vidaara.org/courses/math/class-9 exactly, and every
 * product deep-links to its OWN chapter study page (requirement: wire each e-book
 * to its respective Class 9 study page).
 *
 * Every book: 10 real-life CASE STUDIES (each a 125-145 word passage + a diagram
 * + 5 MCQs) = 50 MCQs, a complete answer key AND step-by-step detailed solutions
 * deferred to fresh pages. 13-15pp. Slug matches the 2 pre-existing case-study
 * products (number-system, polynomials) so they are UPDATED, not duplicated.
 *
 * PRICE: Rs 35 (was Rs 49). Seeded with price_locked=1 so the bulk repricer
 * (seed-bundles-pricing) does NOT revert them; the price columns are still guarded
 * with IF(price_locked=1,...) so a later admin price edit survives a re-seed.
 *
 * Idempotent. Never touches download_url (that comes from data/download-urls.json
 * via scripts/import-download-urls.js).
 *
 *   node scripts/seed-grade9-case-studies.js            (write to DB)
 *   node scripts/seed-grade9-case-studies.js --dry-run  (print only)
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

const CAT_SLUG = 'grade-9-math';
const CAT_NAME = 'Grade 9 Math';
const CAT_SORT = 9;
const IMG = '/wp-content/uploads';
const PRICE = 35, ORIGINAL = 49;
const CLASS9 = 'https://vidaara.org/courses/math/class-9';

// chap = class-9 study slug (product-slug fragment + study deep-link + cover file); pc = pages.
const BOOKS = [
  { ch: 'Number Systems', chap: 'number-system', pc: 13,
    topics: 'real numbers, rational and irrational numbers, decimal expansions, surds and rationalisation, and the laws of exponents',
    metaTitle: 'Class 9 Number Systems Case Study Questions PDF',
    metaDesc: 'Class 9 Number Systems case studies: 10 real-life case studies (50 MCQs) on surds, rationalisation and exponents, with answers and full solutions.' },
  { ch: 'Polynomials', chap: 'polynomials', pc: 13,
    topics: 'zeroes of a polynomial, the Remainder and Factor Theorems, algebraic identities and factorisation',
    metaTitle: 'Class 9 Polynomials Case Study Questions PDF',
    metaDesc: 'Class 9 Polynomials case studies: 10 real-life case studies (50 MCQs) on zeroes, Factor Theorem, identities and factorisation, with answers and full solutions.' },
  { ch: 'Coordinate Geometry', chap: 'coordinate-geometry', pc: 14,
    topics: 'the Cartesian plane, quadrants, plotting points and points on the axes',
    metaTitle: 'Class 9 Coordinate Geometry Case Study Questions PDF',
    metaDesc: 'Class 9 Coordinate Geometry case studies: 10 real-life case studies (50 MCQs) on the Cartesian plane, quadrants and plotting points, with full solutions.' },
  { ch: 'Linear Equations in Two Variables', chap: 'linear-equations-two-variables', pc: 14,
    topics: 'linear equations ax+by+c=0, their solutions, graphs and real-life modelling',
    metaTitle: 'Class 9 Linear Equations Case Study Questions PDF',
    metaDesc: 'Class 9 Linear Equations in Two Variables case studies: 10 real-life case studies (50 MCQs) on solutions and graphs, with answers and full solutions.' },
  { ch: "Introduction to Euclid's Geometry", chap: 'euclids-geometry', pc: 13,
    topics: "Euclid's definitions, axioms and postulates, and axiom-based reasoning",
    metaTitle: "Class 9 Euclid's Geometry Case Study Questions PDF",
    metaDesc: "Class 9 Introduction to Euclid's Geometry case studies: 10 real-life case studies (50 MCQs) on axioms and postulates, with answers and full solutions." },
  { ch: 'Lines and Angles', chap: 'lines-and-angles', pc: 14,
    topics: 'angle pairs, parallel lines cut by a transversal, and the triangle angle-sum property',
    metaTitle: 'Class 9 Lines and Angles Case Study Questions PDF',
    metaDesc: 'Class 9 Lines and Angles case studies: 10 real-life case studies (50 MCQs) on angle pairs and parallel-line transversals, with answers and full solutions.' },
  { ch: 'Triangles', chap: 'triangles', pc: 14,
    topics: 'triangle congruence (SSS, SAS, ASA, AAS, RHS), CPCT and triangle inequalities',
    metaTitle: 'Class 9 Triangles Case Study Questions PDF',
    metaDesc: 'Class 9 Triangles case studies: 10 real-life case studies (50 MCQs) on congruence criteria, CPCT and inequalities, with answers and full step-by-step solutions.' },
  { ch: 'Quadrilaterals', chap: 'quadrilaterals', pc: 14,
    topics: 'parallelogram properties, special parallelograms and the mid-point theorem',
    metaTitle: 'Class 9 Quadrilaterals Case Study Questions PDF',
    metaDesc: 'Class 9 Quadrilaterals case studies: 10 real-life case studies (50 MCQs) on parallelograms and the mid-point theorem, with answers and full solutions.' },
  { ch: 'Areas of Parallelograms and Triangles', chap: 'areas-parallelograms-triangles', pc: 13,
    topics: 'figures on the same base and between the same parallels and equal-area results',
    metaTitle: 'Class 9 Areas of Parallelograms & Triangles Case Studies',
    metaDesc: 'Class 9 Areas of Parallelograms and Triangles case studies: 10 real-life case studies (50 MCQs) on same-base same-parallels areas, with full solutions.' },
  { ch: 'Circles', chap: 'circles', pc: 14,
    topics: 'chords, arc angles, angles in a segment and cyclic quadrilaterals',
    metaTitle: 'Class 9 Circles Case Study Questions PDF',
    metaDesc: 'Class 9 Circles case studies: 10 real-life case studies (50 MCQs) on chords, arc angles and cyclic quadrilaterals, with answers and full step-by-step solutions.' },
  { ch: "Heron's Formula", chap: 'herons-formula', pc: 13,
    topics: "the semi-perimeter, Heron's formula and areas of triangles and real-life fields",
    metaTitle: "Class 9 Heron's Formula Case Study Questions PDF",
    metaDesc: "Class 9 Heron's Formula case studies: 10 real-life case studies (50 MCQs) on triangle and field areas, with answers and full step-by-step solutions." },
  { ch: 'Surface Areas and Volumes', chap: 'surface-areas-volumes', pc: 14,
    topics: 'surface area and volume of cuboids, cylinders, cones, spheres and hemispheres',
    metaTitle: 'Class 9 Surface Areas and Volumes Case Study Questions',
    metaDesc: 'Class 9 Surface Areas and Volumes case studies: 10 real-life case studies (50 MCQs) on cuboids, cylinders, cones and spheres, with full solutions.' },
  { ch: 'Statistics', chap: 'statistics', pc: 14,
    topics: 'frequency tables, bar graphs, histograms, and mean, median and mode',
    metaTitle: 'Class 9 Statistics Case Study Questions PDF',
    metaDesc: 'Class 9 Statistics case studies: 10 real-life case studies (50 MCQs) on frequency tables, histograms and mean, median and mode, with full solutions.' },
  { ch: 'Probability', chap: 'probability', pc: 15,
    topics: 'empirical (experimental) probability computed from observed frequency data',
    metaTitle: 'Class 9 Probability Case Study Questions PDF',
    metaDesc: 'Class 9 Probability case studies: 10 real-life case studies (50 MCQs) on empirical probability from real data tables, with answers and full solutions.' },
  { ch: 'Compound Interest', chap: 'compound-interest', pc: 13,
    topics: 'the compound interest formula, half-yearly compounding, growth and depreciation',
    metaTitle: 'Class 9 Compound Interest Case Study Questions PDF',
    metaDesc: 'Class 9 Compound Interest case studies: 10 real-life case studies (50 MCQs) on the CI formula, growth and depreciation, with answers and full solutions.' },
  { ch: 'Expansions', chap: 'expansions', pc: 14,
    topics: 'algebraic identities for squares and cubes and their applications',
    metaTitle: 'Class 9 Expansions Case Study Questions PDF',
    metaDesc: 'Class 9 Expansions case studies: 10 real-life case studies (50 MCQs) on algebraic identities for squares and cubes, with answers and full solutions.' },
  { ch: 'Factorisation', chap: 'factorisation', pc: 14,
    topics: 'grouping, middle-term splitting, the difference and sum of cubes and cubic factorisation',
    metaTitle: 'Class 9 Factorisation Case Study Questions PDF',
    metaDesc: 'Class 9 Factorisation case studies: 10 real-life case studies (50 MCQs) on grouping, middle-term splitting and cubes, with answers and full solutions.' },
  { ch: 'Simultaneous Linear Equations', chap: 'simultaneous-linear-equations', pc: 14,
    topics: 'solving a pair of equations by substitution, elimination, cross-multiplication and graphs',
    metaTitle: 'Class 9 Simultaneous Linear Equations Case Studies PDF',
    metaDesc: 'Class 9 Simultaneous Linear Equations case studies: 10 real-life case studies (50 MCQs) on substitution, elimination and graphs, with full solutions.' },
  { ch: 'Indices (Exponents)', chap: 'indices-exponents', pc: 14,
    topics: 'the laws of indices, fractional and negative exponents and exponential equations',
    metaTitle: 'Class 9 Indices & Exponents Case Study Questions PDF',
    metaDesc: 'Class 9 Indices (Exponents) case studies: 10 real-life case studies (50 MCQs) on the laws of indices and exponential equations, with full solutions.' },
  { ch: 'Logarithms', chap: 'logarithm', pc: 13,
    topics: 'log laws, exponential-log form, change of base and common logarithms',
    metaTitle: 'Class 9 Logarithms Case Study Questions PDF',
    metaDesc: 'Class 9 Logarithms case studies: 10 real-life case studies (50 MCQs) on log laws, change of base and common logs, with answers and full solutions.' },
  { ch: 'Mid-point Theorem', chap: 'midpoint-theorem', pc: 14,
    topics: 'the mid-point theorem, its converse, the medial triangle and intercepts',
    metaTitle: 'Class 9 Mid-point Theorem Case Study Questions PDF',
    metaDesc: 'Class 9 Mid-point Theorem case studies: 10 real-life case studies (50 MCQs) on the theorem, its converse and the medial triangle, with full solutions.' },
  { ch: 'Pythagoras Theorem', chap: 'pythagoras-theorem', pc: 14,
    topics: 'the Pythagoras theorem, its converse, triples and real-life applications',
    metaTitle: 'Class 9 Pythagoras Theorem Case Study Questions PDF',
    metaDesc: 'Class 9 Pythagoras Theorem case studies: 10 real-life case studies (50 MCQs) on the theorem, triples and real-life problems, with full solutions.' },
  { ch: 'Mensuration (Areas and Volumes)', chap: 'mensuration', pc: 13,
    topics: 'areas of plane figures and the surface area and volume of solids',
    metaTitle: 'Class 9 Mensuration Case Study Questions PDF',
    metaDesc: 'Class 9 Mensuration case studies: 10 real-life case studies (50 MCQs) on areas of plane figures and volumes of solids, with answers and full solutions.' },
  { ch: 'Trigonometry', chap: 'trigonometry', pc: 15,
    topics: 'trigonometric ratios, standard angles, complementary angles and identities',
    metaTitle: 'Class 9 Trigonometry Case Study Questions PDF',
    metaDesc: 'Class 9 Trigonometry case studies: 10 real-life case studies (50 MCQs) on trig ratios, standard angles and identities, with answers and full solutions.' },
];

const productSlug = (b) => `class-9-${b.chap}-case-studies-with-solutions`;
const title = (b) => `Class 9 ${b.ch} Case Studies With Solutions (10 Case Studies, 50 MCQs)`;

const shortDesc = (b) =>
  `10 real-life Class 9 ${b.ch} case studies -- each a passage with a diagram and 5 MCQs (50 in all) ` +
  `-- with a complete answer key and step-by-step detailed solutions. CBSE / ICSE, competency-based.`;

const description = (b) => `
<p>The <strong>Class 9 ${b.ch} Case Studies With Solutions</strong> e-book gives students
<strong>10 real-life case studies</strong> on ${b.ch} &mdash; exactly the competency-based,
case-study format that today's board exams reward.</p>
<ul>
  <li><strong>10 case studies</strong>, each a 125&ndash;145 word real-life scenario with a diagram,
      followed by <strong>5 MCQs</strong> &mdash; <strong>50 questions</strong> in all</li>
  <li>Questions test <strong>understanding through application and reasoning</strong>, not memorisation</li>
  <li>Difficulty builds from <strong>intermediate to advanced</strong> &mdash; ideal for the
      case-study / competency section of the exam</li>
  <li><strong>Full answer key AND step-by-step detailed solutions</strong> at the end, on separate
      pages so students can attempt every case study first</li>
  <li>Competency-based, <strong>NEP 2020</strong> aligned and NCERT terminology; A4 PDF &mdash;
      instant download, print as many times as you need</li>
</ul>
<p><strong>What these case studies cover:</strong> ${b.topics}.</p>
<p>Practise alongside the free
<a href="${CLASS9}/${b.chap}" target="_blank" rel="noopener">Class 9 ${b.ch} study material</a>
&mdash; learn the concept free online, then apply it. See every chapter on the
<a href="${CLASS9}" target="_blank" rel="noopener">Class 9 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '-'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/class-9-case-studies-${b.chap}.jpg`);
    console.log('study link  ' + `${CLASS9}/${b.chap}`);
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
         `${IMG}/class-9-case-studies-${b.chap}.jpg`, b.pc, 'Class 9', 'CBSE/ICSE',
         b.metaTitle, b.metaDesc, existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,price_locked,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,1,0)`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         `${IMG}/class-9-case-studies-${b.chap}.jpg`, b.pc, 'Class 9', 'CBSE/ICSE', b.metaTitle, b.metaDesc]);
      added++; console.log('  added    ' + slug);
    }
  }

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=?`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated. "${CAT_SLUG}" now holds ${total.n} products.`);
  console.log('Prices seeded at Rs ' + PRICE + '/' + ORIGINAL + ' with price_locked=1 (repricer will not change them).');
  console.log('Next: ensure data/download-urls.json has the class-9 case-study links and run scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
