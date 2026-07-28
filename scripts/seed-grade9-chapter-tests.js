/**
 * seed-grade9-chapter-tests.js
 *
 * Seeds the 24 chapter-wise "Class 9 Maths Chapter Tests" e-books into the
 * "Grade 9 Math" category (grade-9-math), each with globally-searchable SEO
 * metadata, a rich HTML description and its own cover. The chapter list mirrors
 * the free study material at vidaara.org/courses/math/class-9 exactly, and every
 * product deep-links to its OWN chapter study page (requirement: wire each e-book
 * to its respective Class 9 study page).
 *
 * Every book: 8 full CBSE/ICSE practice papers (40 marks / 90 min), Sections A-E,
 * ~152 exam-style questions, a case study with 5 MCQs in every paper, a complete
 * answer key AND step-by-step detailed solutions (deferred to fresh pages). 42-50pp.
 *
 * PRICE: Rs 33 (was Rs 47). Seeded with price_locked=1 so the bulk repricer
 * (seed-bundles-pricing) does NOT revert them; the price columns are still guarded
 * with IF(price_locked=1,...) so a later admin price edit survives a re-seed.
 *
 * Idempotent. Never touches download_url (that comes from data/download-urls.json
 * via scripts/import-download-urls.js).
 *
 *   node scripts/seed-grade9-chapter-tests.js            (write to DB)
 *   node scripts/seed-grade9-chapter-tests.js --dry-run  (print only)
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
const PRICE = 33, ORIGINAL = 47;
const CLASS9 = 'https://vidaara.org/courses/math/class-9';

// chap = class-9 study slug (product-slug fragment + study deep-link + cover file); pc = pages.
const BOOKS = [
  { ch: 'Number Systems', chap: 'number-system', pc: 47,
    topics: 'rational and irrational numbers, real numbers on the number line, terminating and recurring decimals, operations on real numbers, rationalisation, and the laws of exponents for real numbers',
    metaTitle: 'Class 9 Number Systems Practice Papers PDF (Solutions)',
    metaDesc: 'Class 9 Number Systems - 8 CBSE/ICSE papers (40 marks) on real numbers, surds, rationalisation and exponents, with full solutions.' },
  { ch: 'Polynomials', chap: 'polynomials', pc: 42,
    topics: 'degree and types of polynomials, zeroes of a polynomial, the Remainder and Factor Theorems, factorisation, and the algebraic identities',
    metaTitle: 'Class 9 Polynomials Practice Papers PDF (with Solutions)',
    metaDesc: 'Class 9 Polynomials - 8 CBSE/ICSE papers (40 marks) on zeroes, Factor and Remainder Theorems, identities and factorisation, with full solutions.' },
  { ch: 'Coordinate Geometry', chap: 'coordinate-geometry', pc: 50,
    topics: 'the Cartesian plane, quadrants and the sign of coordinates, abscissa and ordinate, plotting points, and points on the axes',
    metaTitle: 'Class 9 Coordinate Geometry Practice Papers PDF',
    metaDesc: 'Class 9 Coordinate Geometry - 8 CBSE/ICSE papers (40 marks) on the Cartesian plane, quadrants and plotting points, with full solutions.' },
  { ch: 'Linear Equations in Two Variables', chap: 'linear-equations-two-variables', pc: 43,
    topics: 'the form ax+by+c=0, solutions of a linear equation, drawing the graph of a linear equation, lines parallel to the axes, and real-life word problems',
    metaTitle: 'Class 9 Linear Equations in Two Variables Papers PDF',
    metaDesc: 'Class 9 Linear Equations in Two Variables - 8 CBSE papers (40 marks) on solutions, graphs and word problems, with full solutions.' },
  { ch: "Introduction to Euclid's Geometry", chap: 'euclids-geometry', pc: 48,
    topics: "Euclid's definitions, axioms and postulates, the five postulates, equivalent versions of the fifth postulate (Playfair), and axiom-based reasoning",
    metaTitle: "Class 9 Euclid's Geometry Practice Papers PDF",
    metaDesc: "Class 9 Introduction to Euclid's Geometry - 8 CBSE/ICSE papers (40 marks) on axioms, postulates and reasoning, with full solutions." },
  { ch: 'Lines and Angles', chap: 'lines-and-angles', pc: 50,
    topics: 'complementary, supplementary, adjacent, linear-pair and vertically opposite angles, parallel lines cut by a transversal, and the triangle angle-sum and exterior-angle results',
    metaTitle: 'Class 9 Lines and Angles Practice Papers PDF (Solutions)',
    metaDesc: 'Class 9 Lines and Angles - 8 CBSE/ICSE papers (40 marks) on angle pairs, parallel-line transversals and angle-sum, with full solutions.' },
  { ch: 'Triangles', chap: 'triangles', pc: 50,
    topics: 'the congruence criteria (SSS, SAS, ASA, AAS, RHS), CPCT, properties of isosceles triangles, and inequalities in a triangle',
    metaTitle: 'Class 9 Triangles Practice Papers PDF (Congruence)',
    metaDesc: 'Class 9 Triangles - 8 CBSE/ICSE papers (40 marks) on congruence criteria, CPCT, isosceles triangles and inequalities, with full solutions.' },
  { ch: 'Quadrilaterals', chap: 'quadrilaterals', pc: 50,
    topics: 'the angle-sum property, properties and tests for a parallelogram, special parallelograms and their diagonals, the Mid-point Theorem and the trapezium',
    metaTitle: 'Class 9 Quadrilaterals Practice Papers PDF (Solutions)',
    metaDesc: 'Class 9 Quadrilaterals - 8 CBSE/ICSE papers (40 marks) on parallelogram properties, special quadrilaterals and the mid-point theorem, with full solutions.' },
  { ch: 'Areas of Parallelograms and Triangles', chap: 'areas-parallelograms-triangles', pc: 50,
    topics: 'figures on the same base and between the same parallels, equal-area parallelograms and triangles, and the median dividing a triangle into two equal areas',
    metaTitle: 'Class 9 Areas of Parallelograms & Triangles Papers PDF',
    metaDesc: 'Class 9 Areas of Parallelograms and Triangles - 8 CBSE papers (40 marks) on same-base same-parallels area results, with full solutions.' },
  { ch: 'Circles', chap: 'circles', pc: 50,
    topics: 'chords and their distance from the centre, the perpendicular from the centre to a chord, angles subtended by arcs, angles in the same segment and in a semicircle, and cyclic quadrilaterals',
    metaTitle: 'Class 9 Circles Practice Papers PDF (with Solutions)',
    metaDesc: 'Class 9 Circles - 8 CBSE/ICSE papers (40 marks) on chords, arc angles, angles in a segment and cyclic quadrilaterals, with full solutions.' },
  { ch: "Heron's Formula", chap: 'herons-formula', pc: 42,
    topics: 'the semi-perimeter and Heron’s formula, the area of scalene, isosceles and equilateral triangles, and the area of quadrilaterals and composite real-life figures',
    metaTitle: "Class 9 Heron's Formula Practice Papers PDF (Solutions)",
    metaDesc: "Class 9 Heron's Formula - 8 CBSE/ICSE papers (40 marks) on triangle and quadrilateral areas and real-life fields, with full solutions." },
  { ch: 'Surface Areas and Volumes', chap: 'surface-areas-volumes', pc: 46,
    topics: 'the surface area and volume of cuboids and cubes, right circular cylinders and cones, spheres and hemispheres, and real-life capacity and cost problems',
    metaTitle: 'Class 9 Surface Areas and Volumes Practice Papers PDF',
    metaDesc: 'Class 9 Surface Areas and Volumes - 8 CBSE/ICSE papers (40 marks) on cuboids, cylinders, cones and spheres, with full solutions.' },
  { ch: 'Statistics', chap: 'statistics', pc: 49,
    topics: 'presentation of data, frequency distribution tables, bar graphs, histograms and frequency polygons, and the mean, median and mode of ungrouped data',
    metaTitle: 'Class 9 Statistics Practice Papers PDF (with Solutions)',
    metaDesc: 'Class 9 Statistics - 8 CBSE/ICSE papers (40 marks) on frequency tables, histograms, and mean, median and mode, with full solutions.' },
  { ch: 'Probability', chap: 'probability', pc: 50,
    topics: 'empirical (experimental) probability from observed data, computing probabilities from frequency tables, and the fact that probabilities lie between 0 and 1',
    metaTitle: 'Class 9 Probability Practice Papers PDF (with Solutions)',
    metaDesc: 'Class 9 Probability - 8 CBSE/ICSE papers (40 marks) on empirical probability from real data tables, with full solutions.' },
  { ch: 'Compound Interest', chap: 'compound-interest', pc: 43,
    topics: 'the compound interest formula, annual, half-yearly and quarterly compounding, the difference between compound and simple interest, and growth and depreciation',
    metaTitle: 'Class 9 Compound Interest Practice Papers PDF (ICSE)',
    metaDesc: 'Class 9 Compound Interest - 8 ICSE/CBSE papers (40 marks) on the CI formula, half-yearly compounding, growth and depreciation, with full solutions.' },
  { ch: 'Expansions', chap: 'expansions', pc: 43,
    topics: 'the algebraic identities for squares and cubes, expansions of (a+b+c)² and a³±b³, and using identities to evaluate numbers and simplify expressions',
    metaTitle: 'Class 9 Expansions Practice Papers PDF (Identities)',
    metaDesc: 'Class 9 Expansions - 8 ICSE/CBSE papers (40 marks) on algebraic identities for squares and cubes and their applications, with full solutions.' },
  { ch: 'Factorisation', chap: 'factorisation', pc: 42,
    topics: 'common factors and grouping, the difference of squares, splitting the middle term, the sum and difference of cubes, and factorising cubics with the Factor Theorem',
    metaTitle: 'Class 9 Factorisation Practice Papers PDF (with Solutions)',
    metaDesc: 'Class 9 Factorisation - 8 ICSE/CBSE papers (40 marks) on grouping, middle-term splitting and cubic factorisation, with full solutions.' },
  { ch: 'Simultaneous Linear Equations', chap: 'simultaneous-linear-equations', pc: 49,
    topics: 'solving a pair of linear equations by substitution, elimination, cross-multiplication and graphically, and word problems on ages, numbers, speed and cost',
    metaTitle: 'Class 9 Simultaneous Linear Equations Papers PDF',
    metaDesc: 'Class 9 Simultaneous Linear Equations - 8 ICSE/CBSE papers (40 marks) on substitution, elimination, graphs and word problems, with full solutions.' },
  { ch: 'Indices (Exponents)', chap: 'indices-exponents', pc: 48,
    topics: 'the laws of indices, zero, negative and fractional exponents, nth roots, simplifying expressions, and solving exponential equations',
    metaTitle: 'Class 9 Indices & Exponents Practice Papers PDF',
    metaDesc: 'Class 9 Indices (Exponents) - 8 ICSE/CBSE papers (40 marks) on the laws of indices, fractional exponents and exponential equations, with full solutions.' },
  { ch: 'Logarithms', chap: 'logarithm', pc: 47,
    topics: 'the definition of a logarithm, converting between exponential and log form, the laws of logarithms, change of base, and common logarithms',
    metaTitle: 'Class 9 Logarithms Practice Papers PDF (with Solutions)',
    metaDesc: 'Class 9 Logarithms - 8 ICSE/CBSE papers (40 marks) on log laws, exponential-log form, change of base and common logs, with full solutions.' },
  { ch: 'Mid-point Theorem', chap: 'midpoint-theorem', pc: 50,
    topics: 'the mid-point theorem and its converse, the medial triangle, the parallelogram formed by joining mid-points, and the equal-intercept theorem',
    metaTitle: 'Class 9 Mid-point Theorem Practice Papers PDF',
    metaDesc: 'Class 9 Mid-point Theorem - 8 ICSE/CBSE papers (40 marks) on the theorem, its converse, the medial triangle and intercepts, with full solutions.' },
  { ch: 'Pythagoras Theorem', chap: 'pythagoras-theorem', pc: 50,
    topics: 'the Pythagoras theorem and its converse, Pythagorean triples, finding unknown sides, and real-life applications such as ladders, diagonals and distances',
    metaTitle: 'Class 9 Pythagoras Theorem Practice Papers PDF',
    metaDesc: 'Class 9 Pythagoras Theorem - 8 ICSE/CBSE papers (40 marks) on the theorem, its converse, triples and real-life problems, with full solutions.' },
  { ch: 'Mensuration (Areas and Volumes)', chap: 'mensuration', pc: 46,
    topics: 'the perimeter and area of plane figures, the circle, sectors and paths, and the surface area and volume of cuboids, cylinders, cones and spheres',
    metaTitle: 'Class 9 Mensuration Practice Papers PDF (Areas, Volumes)',
    metaDesc: 'Class 9 Mensuration - 8 ICSE/CBSE papers (40 marks) on areas of plane figures and surface area and volume of solids, with full solutions.' },
  { ch: 'Trigonometry', chap: 'trigonometry', pc: 50,
    topics: 'the trigonometric ratios, values for the standard angles, ratios of complementary angles, and the fundamental trigonometric identities',
    metaTitle: 'Class 9 Trigonometry Practice Papers PDF (with Solutions)',
    metaDesc: 'Class 9 Trigonometry - 8 ICSE/CBSE papers (40 marks) on trig ratios, standard angles, complementary angles and identities, with full solutions.' },
];

const productSlug = (b) => `class-9-${b.chap}-chapter-tests`;
const title = (b) => `Class 9 ${b.ch} Chapter Tests (8 Practice Papers with Solutions)`;

const shortDesc = (b) =>
  `8 CBSE/ICSE practice papers on Class 9 ${b.ch} — 40 marks / 90 minutes each, ~152 exam-style ` +
  `questions with a case study per paper, complete answer keys and step-by-step detailed solutions.`;

const description = (b) => `
<p>The <strong>Class 9 ${b.ch} Chapter Tests</strong> e-book gives students <strong>8 full practice
papers</strong> on ${b.ch} — timed, exam-ready and marked exactly like the real thing.</p>
<ul>
  <li><strong>8 practice papers</strong>, each <strong>40 marks / 90 minutes</strong>, in the latest
      CBSE &amp; ICSE pattern with <strong>Sections A&ndash;E</strong></li>
  <li><strong>~152 exam-style questions per book</strong> &mdash; MCQs, assertion&ndash;reason,
      very-short / short / long answers, HOTS, and a <strong>case study with 5 MCQs</strong> in every paper</li>
  <li>Difficulty builds from <strong>intermediate to advanced</strong> &mdash; perfect for revision,
      unit tests and self-assessment</li>
  <li><strong>Full answer key AND step-by-step detailed solutions</strong> for every paper, kept on
      separate pages so students can attempt each test first</li>
  <li>Competency-based, <strong>NEP 2020</strong> aligned and NCERT terminology; A4 PDF &mdash;
      instant download, print as many times as you need</li>
</ul>
<p><strong>What these papers cover:</strong> ${b.topics}.</p>
<p>Practise alongside the free
<a href="${CLASS9}/${b.chap}" target="_blank" rel="noopener">Vidaara Class 9 ${b.ch} study
material</a> &mdash; learn the concept free online, then test yourself on paper. See every chapter on
the <a href="${CLASS9}" target="_blank" rel="noopener">Class 9 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '-'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/class-9-chapter-tests-${b.chap}.jpg`);
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
         `${IMG}/class-9-chapter-tests-${b.chap}.jpg`, b.pc, 'Class 9', 'CBSE/ICSE',
         b.metaTitle, b.metaDesc, existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,price_locked,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,1,0)`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         `${IMG}/class-9-chapter-tests-${b.chap}.jpg`, b.pc, 'Class 9', 'CBSE/ICSE', b.metaTitle, b.metaDesc]);
      added++; console.log('  added    ' + slug);
    }
  }

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=?`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated. "${CAT_SLUG}" now holds ${total.n} products.`);
  console.log('Prices seeded at Rs ' + PRICE + '/' + ORIGINAL + ' with price_locked=1 (repricer will not change them).');
  console.log('Next: ensure data/download-urls.json has the class-9 chapter-test links and run scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
