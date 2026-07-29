/**
 * seed-grade11-chapter-tests.js
 *
 * Seeds the 16 chapter-wise "Class 11 Maths Chapter Tests" e-books (8 practice
 * papers each) into the "Grade 11 Math" category (grade-11-math, created if
 * missing), each with globally-searchable SEO metadata, a rich HTML description
 * and its own cover. The chapter list mirrors the free study material at
 * vidaara.org/courses/math/class-11 exactly, and every product deep-links to its
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
 *   node scripts/seed-grade11-chapter-tests.js            (write to DB)
 *   node scripts/seed-grade11-chapter-tests.js --dry-run  (print only)
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

const CAT_SLUG = 'grade-11-math';
const CAT_NAME = 'Grade 11 Math';
const CAT_SORT = 11;
const IMG = '/wp-content/uploads';
const PRICE = 33, ORIGINAL = 47;
const CLASS11 = 'https://vidaara.org/courses/math/class-11';

// chap = class-11 study slug (product-slug fragment + study deep-link + cover file); pc = pages.
const BOOKS = [
  { ch: 'Sets', chap: 'sets', pc: 44,
    topics: 'sets and their representations, the empty, finite and infinite sets, subsets and the power set, Venn diagrams, union, intersection and complement, De Morgan’s laws and inclusion-exclusion counting',
    metaTitle: 'Class 11 Sets Practice Papers PDF',
    metaDesc: 'Class 11 Sets chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Relations and Functions', chap: 'relations-and-functions', pc: 43,
    topics: 'the Cartesian product of sets, relations, functions, domain and range and the algebra of real functions',
    metaTitle: 'Class 11 Relations and Functions Practice Papers PDF',
    metaDesc: 'Class 11 Relations and Functions chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Trigonometric Functions', chap: 'trigonometric-functions', pc: 43,
    topics: 'radian and degree measure, trigonometric functions and their signs, identities, the sum and difference formulas and trigonometric equations',
    metaTitle: 'Class 11 Trigonometric Functions Practice Papers PDF',
    metaDesc: 'Class 11 Trigonometric Functions chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Complex Numbers and Quadratic Equations', chap: 'complex-numbers-and-quadratic-equations', pc: 43,
    topics: 'the algebra of complex numbers, modulus and argument, the Argand plane, polar form and quadratic equations with complex roots',
    metaTitle: 'Class 11 Complex Numbers Practice Papers PDF',
    metaDesc: 'Class 11 Complex Numbers and Quadratic Equations chapter tests: 8 practice papers (40 marks each) with case studies and full solutions.' },
  { ch: 'Linear Inequalities', chap: 'linear-inequalities', pc: 43,
    topics: 'solving linear inequalities in one variable, on the number line, and linear inequalities in two variables with their graphical feasible region',
    metaTitle: 'Class 11 Linear Inequalities Practice Papers PDF',
    metaDesc: 'Class 11 Linear Inequalities chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Permutations and Combinations', chap: 'permutations-and-combinations', pc: 45,
    topics: 'the fundamental principle of counting, factorial notation, permutations (with repetition and restrictions) and combinations',
    metaTitle: 'Class 11 Permutations and Combinations Practice Papers',
    metaDesc: 'Class 11 Permutations and Combinations chapter tests: 8 practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Binomial Theorem', chap: 'binomial-theorem', pc: 45,
    topics: 'the binomial theorem for a positive integral index, the general and middle terms, term independent of x and the properties of binomial coefficients',
    metaTitle: 'Class 11 Binomial Theorem Practice Papers PDF',
    metaDesc: 'Class 11 Binomial Theorem chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Sequences and Series', chap: 'sequences-and-series', pc: 46,
    topics: 'arithmetic and geometric progressions, their nth terms and sums, arithmetic and geometric means, the infinite GP and the special series',
    metaTitle: 'Class 11 Sequences and Series Practice Papers PDF',
    metaDesc: 'Class 11 Sequences and Series chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Straight Lines', chap: 'straight-lines', pc: 46,
    topics: 'the slope of a line, the angle between two lines, the various forms of the equation of a line and the distance of a point from a line',
    metaTitle: 'Class 11 Straight Lines Practice Papers PDF',
    metaDesc: 'Class 11 Straight Lines chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Conic Sections', chap: 'conic-sections', pc: 44,
    topics: 'the circle, parabola, ellipse and hyperbola and their foci, directrix, eccentricity and latus rectum',
    metaTitle: 'Class 11 Conic Sections Practice Papers PDF',
    metaDesc: 'Class 11 Conic Sections chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Introduction to Three Dimensional Geometry', chap: 'introduction-to-three-dimensional-geometry', pc: 43,
    topics: 'coordinate axes and planes in space, the octants and signs of coordinates, the distance formula and the section formula in 3D',
    metaTitle: 'Class 11 Three Dimensional Geometry Practice Papers',
    metaDesc: 'Class 11 Introduction to Three Dimensional Geometry chapter tests: 8 practice papers (40 marks each) with case studies and full solutions.' },
  { ch: 'Limits and Derivatives', chap: 'limits-and-derivatives', pc: 49,
    topics: 'the intuitive idea of a limit, the algebra of limits, the standard limits, the derivative from first principles and the algebra of derivatives',
    metaTitle: 'Class 11 Limits and Derivatives Practice Papers PDF',
    metaDesc: 'Class 11 Limits and Derivatives chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
  { ch: 'Statistics', chap: 'statistics', pc: 44,
    topics: 'the measures of dispersion — range, mean deviation, variance, standard deviation and the coefficient of variation',
    metaTitle: 'Class 11 Statistics Practice Papers PDF',
    metaDesc: 'Class 11 Statistics chapter tests: 8 CBSE practice papers (40 marks each) on dispersion, with case studies, answer keys and full solutions.' },
  { ch: 'Probability', chap: 'probability', pc: 45,
    topics: 'random experiments, sample space, the types and algebra of events, axiomatic probability and the addition theorem',
    metaTitle: 'Class 11 Probability Practice Papers PDF',
    metaDesc: 'Class 11 Probability chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and step-by-step solutions.' },
  { ch: 'Principle of Mathematical Induction', chap: 'principle-of-mathematical-induction', pc: 45,
    topics: 'the principle of mathematical induction with the base step and the inductive step, applied to summations, divisibility and inequalities',
    metaTitle: 'Class 11 Mathematical Induction Practice Papers PDF',
    metaDesc: 'Class 11 Principle of Mathematical Induction chapter tests: 8 practice papers (40 marks each) with case studies and full solutions.' },
  { ch: 'Mathematical Reasoning', chap: 'mathematical-reasoning', pc: 42,
    topics: 'statements, negation, the connectives, quantifiers, implications and the converse and contrapositive, and validating statements',
    metaTitle: 'Class 11 Mathematical Reasoning Practice Papers PDF',
    metaDesc: 'Class 11 Mathematical Reasoning chapter tests: 8 CBSE practice papers (40 marks each) with case studies, answer keys and full solutions.' },
];

const productSlug = (b) => `class-11-${b.chap}-chapter-practice-tests`;
const title = (b) => `Class 11 ${b.ch} Chapter Tests (8 Practice Papers with Solutions)`;

const shortDesc = (b) =>
  `8 CBSE/ICSE practice papers on Class 11 ${b.ch} — 40 marks / 90 minutes each, ~152 exam-style ` +
  `questions with a case study per paper, complete answer keys and step-by-step detailed solutions.`;

const description = (b) => `
<p>The <strong>Class 11 ${b.ch} Chapter Tests</strong> e-book gives students <strong>8 full practice
papers</strong> on ${b.ch} — timed, exam-ready and marked exactly like the real thing.</p>
<ul>
  <li><strong>8 practice papers</strong>, each <strong>40 marks / 90 minutes</strong>, in the latest
      CBSE &amp; ICSE pattern with <strong>Sections A&ndash;E</strong></li>
  <li><strong>~152 exam-style questions per book</strong> &mdash; MCQs, assertion&ndash;reason,
      very-short / short / long answers, HOTS, and a <strong>case study with 5 MCQs</strong> in every paper</li>
  <li>Difficulty builds from <strong>intermediate to advanced</strong> &mdash; perfect for term revision,
      unit tests, self-assessment and a strong base for JEE &amp; competitive exams</li>
  <li><strong>Full answer key AND step-by-step detailed solutions</strong> for every paper, kept on
      separate pages so students can attempt each test first</li>
  <li>Competency-based, <strong>NEP 2020</strong> aligned and NCERT terminology; A4 PDF &mdash;
      instant download, print as many times as you need</li>
</ul>
<p><strong>What these papers cover:</strong> ${b.topics}.</p>
<p>Practise alongside the free
<a href="${CLASS11}/${b.chap}" target="_blank" rel="noopener">Class 11 ${b.ch} study material</a>
&mdash; learn the concept free online, then test yourself on paper. See every chapter on the
<a href="${CLASS11}" target="_blank" rel="noopener">Class 11 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '-'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/class-11-chapter-tests-${b.chap}.jpg`);
    console.log('study link  ' + `${CLASS11}/${b.chap}`);
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
         `${IMG}/class-11-chapter-tests-${b.chap}.jpg`, b.pc, 'Class 11', 'CBSE/ICSE',
         b.metaTitle, b.metaDesc, existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,price_locked,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,1,0)`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         `${IMG}/class-11-chapter-tests-${b.chap}.jpg`, b.pc, 'Class 11', 'CBSE/ICSE', b.metaTitle, b.metaDesc]);
      added++; console.log('  added    ' + slug);
    }
  }

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=?`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated. "${CAT_SLUG}" now holds ${total.n} products.`);
  console.log('Prices seeded at Rs ' + PRICE + '/' + ORIGINAL + ' with price_locked=1 (repricer will not change them).');
  console.log('Next: ensure data/download-urls.json has the class-11 chapter-test links and run scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
