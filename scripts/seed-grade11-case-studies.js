/**
 * seed-grade11-case-studies.js
 *
 * Seeds the 16 chapter-wise "Class 11 Maths Case Studies" e-books into a
 * "Grade 11 Math" category (grade-11-math, created if missing), each with
 * globally-searchable SEO metadata, a rich HTML description and its own cover.
 * The chapter list mirrors the free study material at
 * vidaara.org/courses/math/class-11 exactly, and every product deep-links to its
 * OWN chapter study page (requirement: wire each e-book to its Class 11 study page).
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
 *   node scripts/seed-grade11-case-studies.js            (write to DB)
 *   node scripts/seed-grade11-case-studies.js --dry-run  (print only)
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
const PRICE = 35, ORIGINAL = 49;
const CLASS11 = 'https://vidaara.org/courses/math/class-11';

// chap = class-11 study slug (product-slug fragment + study deep-link + cover file); pc = pages.
const BOOKS = [
  { ch: 'Sets', chap: 'sets', pc: 14,
    topics: 'sets and subsets, the power set, union, intersection and complement, Venn diagrams, De Morgan’s laws and inclusion-exclusion counting',
    metaTitle: 'Class 11 Sets Case Study Questions PDF',
    metaDesc: 'Class 11 Sets case studies: 10 real-life case studies (50 MCQs) on Venn diagrams, operations and inclusion-exclusion counting, with full solutions.' },
  { ch: 'Relations and Functions', chap: 'relations-and-functions', pc: 14,
    topics: 'the Cartesian product, relations, functions, domain and range, and the algebra of real functions',
    metaTitle: 'Class 11 Relations and Functions Case Studies PDF',
    metaDesc: 'Class 11 Relations and Functions case studies: 10 real-life case studies (50 MCQs) on Cartesian products, domain, range and functions, with full solutions.' },
  { ch: 'Trigonometric Functions', chap: 'trigonometric-functions', pc: 15,
    topics: 'radian measure, trigonometric functions and their signs, identities and the sum and difference formulas',
    metaTitle: 'Class 11 Trigonometric Functions Case Studies PDF',
    metaDesc: 'Class 11 Trigonometric Functions case studies: 10 real-life case studies (50 MCQs) on radian measure, identities and formulas, with answers and full solutions.' },
  { ch: 'Complex Numbers and Quadratic Equations', chap: 'complex-numbers-and-quadratic-equations', pc: 14,
    topics: 'the algebra of complex numbers, modulus and argument, the Argand plane and quadratic equations with complex roots',
    metaTitle: 'Class 11 Complex Numbers Case Study Questions PDF',
    metaDesc: 'Class 11 Complex Numbers and Quadratic Equations case studies: 10 real-life case studies (50 MCQs) on the Argand plane, modulus and roots, with full solutions.' },
  { ch: 'Linear Inequalities', chap: 'linear-inequalities', pc: 13,
    topics: 'solving linear inequalities in one and two variables and the graphical feasible region',
    metaTitle: 'Class 11 Linear Inequalities Case Study Questions PDF',
    metaDesc: 'Class 11 Linear Inequalities case studies: 10 real-life case studies (50 MCQs) on one/two-variable inequalities and feasible regions, with full solutions.' },
  { ch: 'Permutations and Combinations', chap: 'permutations-and-combinations', pc: 13,
    topics: 'the fundamental principle of counting, permutations (nPr) and combinations (nCr)',
    metaTitle: 'Class 11 Permutations and Combinations Case Studies',
    metaDesc: 'Class 11 Permutations and Combinations case studies: 10 real-life case studies (50 MCQs) on counting, arrangements and selections, with full solutions.' },
  { ch: 'Binomial Theorem', chap: 'binomial-theorem', pc: 13,
    topics: 'the binomial expansion, the general and middle terms, and binomial coefficients',
    metaTitle: 'Class 11 Binomial Theorem Case Study Questions PDF',
    metaDesc: 'Class 11 Binomial Theorem case studies: 10 real-life case studies (50 MCQs) on the expansion, general and middle terms, with answers and full solutions.' },
  { ch: 'Sequences and Series', chap: 'sequences-and-series', pc: 13,
    topics: 'arithmetic and geometric progressions, their sums, means and the special series',
    metaTitle: 'Class 11 Sequences and Series Case Study Questions PDF',
    metaDesc: 'Class 11 Sequences and Series case studies: 10 real-life case studies (50 MCQs) on AP, GP, sums and special series, with answers and full solutions.' },
  { ch: 'Straight Lines', chap: 'straight-lines', pc: 15,
    topics: 'the slope, the forms of a line, the angle between two lines and the distance of a point from a line',
    metaTitle: 'Class 11 Straight Lines Case Study Questions PDF',
    metaDesc: 'Class 11 Straight Lines case studies: 10 real-life case studies (50 MCQs) on slope, line equations, angles and distances, with answers and full solutions.' },
  { ch: 'Conic Sections', chap: 'conic-sections', pc: 14,
    topics: 'the circle, parabola, ellipse and hyperbola and their foci, directrix, eccentricity and latus rectum',
    metaTitle: 'Class 11 Conic Sections Case Study Questions PDF',
    metaDesc: 'Class 11 Conic Sections case studies: 10 real-life case studies (50 MCQs) on the circle, parabola, ellipse and hyperbola, with full solutions.' },
  { ch: 'Introduction to Three Dimensional Geometry', chap: 'introduction-to-three-dimensional-geometry', pc: 14,
    topics: 'coordinates in space, the octants, the distance formula and the section formula in 3D',
    metaTitle: 'Class 11 Three Dimensional Geometry Case Studies PDF',
    metaDesc: 'Class 11 Three Dimensional Geometry case studies: 10 real-life case studies (50 MCQs) on 3D coordinates, distance and section formulae, with full solutions.' },
  { ch: 'Limits and Derivatives', chap: 'limits-and-derivatives', pc: 14,
    topics: 'limits, the standard limits, and the derivative as a rate of change and slope of a tangent',
    metaTitle: 'Class 11 Limits and Derivatives Case Studies PDF',
    metaDesc: 'Class 11 Limits and Derivatives case studies: 10 real-life case studies (50 MCQs) on limits, derivatives and rates of change, with answers and full solutions.' },
  { ch: 'Statistics', chap: 'statistics', pc: 14,
    topics: 'the measures of dispersion - range, mean deviation, variance, standard deviation and the coefficient of variation',
    metaTitle: 'Class 11 Statistics Case Study Questions PDF',
    metaDesc: 'Class 11 Statistics case studies: 10 real-life case studies (50 MCQs) on range, mean deviation, variance, SD and coefficient of variation, with full solutions.' },
  { ch: 'Probability', chap: 'probability', pc: 14,
    topics: 'axiomatic probability, sample space and events, the addition theorem and complementary events',
    metaTitle: 'Class 11 Probability Case Study Questions PDF',
    metaDesc: 'Class 11 Probability case studies: 10 real-life case studies (50 MCQs) on sample space, events and the addition theorem, with answers and full solutions.' },
  { ch: 'Principle of Mathematical Induction', chap: 'principle-of-mathematical-induction', pc: 13,
    topics: 'proving statements true for all natural numbers using the base case and the inductive step',
    metaTitle: 'Class 11 Mathematical Induction Case Studies PDF',
    metaDesc: 'Class 11 Principle of Mathematical Induction case studies: 10 real-life case studies (50 MCQs) on the base case and inductive step, with full solutions.' },
  { ch: 'Mathematical Reasoning', chap: 'mathematical-reasoning', pc: 13,
    topics: 'statements, negation, the connectives and/or, quantifiers and implications with the converse and contrapositive',
    metaTitle: 'Class 11 Mathematical Reasoning Case Studies PDF',
    metaDesc: 'Class 11 Mathematical Reasoning case studies: 10 real-life case studies (50 MCQs) on statements, connectives, quantifiers and implications, with full solutions.' },
];

const productSlug = (b) => `class-11-${b.chap}-case-studies-with-solutions`;
const title = (b) => `Class 11 ${b.ch} Case Studies With Solutions (10 Case Studies, 50 MCQs)`;

const shortDesc = (b) =>
  `10 real-life Class 11 ${b.ch} case studies -- each a passage with a diagram and 5 MCQs (50 in all) ` +
  `-- with a complete answer key and step-by-step detailed solutions. CBSE / ICSE / ISC, competency-based.`;

const description = (b) => `
<p>The <strong>Class 11 ${b.ch} Case Studies With Solutions</strong> e-book gives students
<strong>10 real-life case studies</strong> on ${b.ch} &mdash; exactly the competency-based,
case-study format that today's board and entrance exams reward.</p>
<ul>
  <li><strong>10 case studies</strong>, each a 125&ndash;145 word real-life scenario with a diagram,
      followed by <strong>5 MCQs</strong> &mdash; <strong>50 questions</strong> in all</li>
  <li>Questions test <strong>understanding through application and reasoning</strong>, not memorisation</li>
  <li>Difficulty builds from <strong>intermediate to advanced</strong> &mdash; ideal for Class 11 exams
      and a strong foundation for competitive tests</li>
  <li><strong>Full answer key AND step-by-step detailed solutions</strong> at the end, on separate
      pages so students can attempt every case study first</li>
  <li>Competency-based, <strong>NEP 2020</strong> aligned and NCERT terminology; A4 PDF &mdash;
      instant download, print as many times as you need</li>
</ul>
<p><strong>What these case studies cover:</strong> ${b.topics}.</p>
<p>Practise alongside the free
<a href="${CLASS11}/${b.chap}" target="_blank" rel="noopener">Class 11 ${b.ch} study material</a>
&mdash; learn the concept free online, then apply it. See every chapter on the
<a href="${CLASS11}" target="_blank" rel="noopener">Class 11 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '-'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/class-11-case-studies-${b.chap}.jpg`);
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
         `${IMG}/class-11-case-studies-${b.chap}.jpg`, b.pc, 'Class 11', 'CBSE/ICSE/ISC',
         b.metaTitle, b.metaDesc, existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,price_locked,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,1,0)`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         `${IMG}/class-11-case-studies-${b.chap}.jpg`, b.pc, 'Class 11', 'CBSE/ICSE/ISC', b.metaTitle, b.metaDesc]);
      added++; console.log('  added    ' + slug);
    }
  }

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=?`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated. "${CAT_SLUG}" now holds ${total.n} products.`);
  console.log('Prices seeded at Rs ' + PRICE + '/' + ORIGINAL + ' with price_locked=1 (repricer will not change them).');
  console.log('Next: ensure data/download-urls.json has the class-11 case-study links and run scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
