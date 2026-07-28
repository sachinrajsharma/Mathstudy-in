/**
 * seed-grade10-case-studies.js
 *
 * Seeds the 20 chapter-wise "Class 10 Maths Case Studies" e-books into a
 * "Grade 10 Math" category (grade-10-math, created if missing), each with
 * globally-searchable SEO metadata, a rich HTML description and its own cover.
 * The chapter list mirrors the free study material at
 * vidaara.org/courses/math/class-10 exactly, and every product deep-links to its
 * OWN chapter study page (requirement: wire each e-book to its Class 10 study page).
 *
 * Every book: 10 real-life CASE STUDIES (each a 125-145 word passage + a diagram
 * + 5 MCQs) = 50 MCQs, a complete answer key AND step-by-step detailed solutions
 * deferred to fresh pages. 12-16pp.
 *
 * PRICE: Rs 35 (was Rs 49). Seeded with price_locked=1 so the bulk repricer
 * (seed-bundles-pricing) does NOT revert them; the price columns are still guarded
 * with IF(price_locked=1,...) so a later admin price edit survives a re-seed.
 *
 * Idempotent. Never touches download_url (that comes from data/download-urls.json
 * via scripts/import-download-urls.js).
 *
 *   node scripts/seed-grade10-case-studies.js            (write to DB)
 *   node scripts/seed-grade10-case-studies.js --dry-run  (print only)
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
const PRICE = 35, ORIGINAL = 49;
const CLASS10 = 'https://vidaara.org/courses/math/class-10';

// chap = class-10 study slug (product-slug fragment + study deep-link + cover file); pc = pages.
const BOOKS = [
  { ch: 'Number Systems', chap: 'number-systems', pc: 13,
    topics: 'real numbers, HCF and LCM, the Fundamental Theorem of Arithmetic, irrationality proofs and terminating decimals',
    metaTitle: 'Class 10 Number Systems Case Study Questions PDF',
    metaDesc: 'Class 10 Number Systems case studies: 10 real-life case studies (50 MCQs) on HCF/LCM, prime factorisation and irrationality, with full solutions.' },
  { ch: 'Polynomials', chap: 'polynomials', pc: 14,
    topics: 'zeroes of a polynomial and their relationship with the coefficients, and the division algorithm',
    metaTitle: 'Class 10 Polynomials Case Study Questions PDF',
    metaDesc: 'Class 10 Polynomials case studies: 10 real-life case studies (50 MCQs) on zeroes and coefficients and the division algorithm, with full solutions.' },
  { ch: 'Pair of Linear Equations in Two Variables', chap: 'pair-linear-equations', pc: 14,
    topics: 'solving a pair of linear equations by substitution, elimination and graphs, and consistency',
    metaTitle: 'Class 10 Pair of Linear Equations Case Studies PDF',
    metaDesc: 'Class 10 Pair of Linear Equations case studies: 10 real-life case studies (50 MCQs) on substitution, elimination, graphs and consistency, with full solutions.' },
  { ch: 'Quadratic Equations', chap: 'quadratic-equations', pc: 13,
    topics: 'solving quadratics by factorisation and the formula, the discriminant and the nature of roots',
    metaTitle: 'Class 10 Quadratic Equations Case Study Questions PDF',
    metaDesc: 'Class 10 Quadratic Equations case studies: 10 real-life case studies (50 MCQs) on factorisation, the formula and the discriminant, with full solutions.' },
  { ch: 'Arithmetic Progressions', chap: 'arithmetic-progressions', pc: 13,
    topics: 'the nth term and the sum of an arithmetic progression and real-life applications',
    metaTitle: 'Class 10 Arithmetic Progressions Case Studies PDF',
    metaDesc: 'Class 10 Arithmetic Progressions case studies: 10 real-life case studies (50 MCQs) on the nth term and the sum of an AP, with answers and full solutions.' },
  { ch: 'Coordinate Geometry', chap: 'coordinate-geometry', pc: 16,
    topics: 'the distance formula, the section and mid-point formulae and the area of a triangle from coordinates',
    metaTitle: 'Class 10 Coordinate Geometry Case Study Questions PDF',
    metaDesc: 'Class 10 Coordinate Geometry case studies: 10 real-life case studies (50 MCQs) on the distance, section and area formulae, with answers and full solutions.' },
  { ch: 'Triangles', chap: 'triangles', pc: 14,
    topics: 'similar triangles, the criteria for similarity, the Basic Proportionality Theorem and areas of similar triangles',
    metaTitle: 'Class 10 Triangles Case Study Questions PDF (Similarity)',
    metaDesc: 'Class 10 Triangles case studies: 10 real-life case studies (50 MCQs) on similarity, the BPT (Thales) theorem and area ratios, with full step-by-step solutions.' },
  { ch: 'Circles', chap: 'circles', pc: 13,
    topics: 'tangents to a circle, the tangent-radius property and the equal lengths of tangents from an external point',
    metaTitle: 'Class 10 Circles Case Study Questions PDF (Tangents)',
    metaDesc: 'Class 10 Circles case studies: 10 real-life case studies (50 MCQs) on tangents, the tangent-radius property and tangent lengths, with full solutions.' },
  { ch: 'Trigonometry', chap: 'trigonometry', pc: 15,
    topics: 'trigonometric ratios and identities, and heights and distances (angles of elevation and depression)',
    metaTitle: 'Class 10 Trigonometry Case Study Questions PDF',
    metaDesc: 'Class 10 Trigonometry case studies: 10 real-life case studies (50 MCQs) on ratios, identities and heights & distances, with answers and full solutions.' },
  { ch: 'Areas Related to Circles', chap: 'areas-related-to-circles', pc: 15,
    topics: 'the area and circumference of a circle and the areas of sectors and segments',
    metaTitle: 'Class 10 Areas Related to Circles Case Studies PDF',
    metaDesc: 'Class 10 Areas Related to Circles case studies: 10 real-life case studies (50 MCQs) on sectors, segments and combinations, with answers and full solutions.' },
  { ch: 'Mensuration', chap: 'mensuration', pc: 15,
    topics: 'the surface area and volume of combinations of solids, the frustum of a cone and conversion of solids',
    metaTitle: 'Class 10 Mensuration Case Study Questions PDF',
    metaDesc: 'Class 10 Mensuration case studies: 10 real-life case studies (50 MCQs) on combined solids, the frustum and recasting, with answers and full solutions.' },
  { ch: 'Statistics', chap: 'statistics', pc: 15,
    topics: 'the mean, median and mode of grouped data and the cumulative frequency curve (ogive)',
    metaTitle: 'Class 10 Statistics Case Study Questions PDF',
    metaDesc: 'Class 10 Statistics case studies: 10 real-life case studies (50 MCQs) on grouped mean, median, mode and the ogive, with answers and full solutions.' },
  { ch: 'Probability', chap: 'probability', pc: 15,
    topics: 'theoretical (classical) probability of events with dice, cards, coins and bags of balls',
    metaTitle: 'Class 10 Probability Case Study Questions PDF',
    metaDesc: 'Class 10 Probability case studies: 10 real-life case studies (50 MCQs) on classical probability with dice, cards and coins, with answers and full solutions.' },
  { ch: 'Factorization', chap: 'factorization', pc: 13,
    topics: 'the Remainder and Factor Theorems and the factorisation of polynomials and cubics',
    metaTitle: 'Class 10 Factorization Case Study Questions PDF',
    metaDesc: 'Class 10 Factorization case studies: 10 real-life case studies (50 MCQs) on the Remainder and Factor Theorems and cubics, with answers and full solutions.' },
  { ch: 'Matrices', chap: 'matrices', pc: 13,
    topics: 'the order and types of matrices, addition, scalar multiplication and matrix multiplication',
    metaTitle: 'Class 10 Matrices Case Study Questions PDF (ICSE)',
    metaDesc: 'Class 10 Matrices case studies: 10 real-life case studies (50 MCQs) on order, addition, scalar and matrix multiplication, with answers and full solutions.' },
  { ch: 'Ratio and Proportion', chap: 'ratio-and-proportion', pc: 13,
    topics: 'ratio, proportion, continued proportion, mean proportional and componendo-dividendo',
    metaTitle: 'Class 10 Ratio and Proportion Case Studies PDF (ICSE)',
    metaDesc: 'Class 10 Ratio and Proportion case studies: 10 real-life case studies (50 MCQs) on proportion, mean proportional and componendo-dividendo, with full solutions.' },
  { ch: 'Banking', chap: 'banking', pc: 13,
    topics: 'recurring deposit accounts, the interest formula and the maturity value',
    metaTitle: 'Class 10 Banking Case Study Questions PDF (ICSE)',
    metaDesc: 'Class 10 Banking case studies: 10 real-life case studies (50 MCQs) on recurring deposits, interest and maturity value, with answers and full solutions.' },
  { ch: 'Shares and Dividends', chap: 'shares-and-dividends', pc: 13,
    topics: 'nominal and market value, dividend, income and percentage yield from shares',
    metaTitle: 'Class 10 Shares and Dividends Case Studies PDF (ICSE)',
    metaDesc: 'Class 10 Shares and Dividends case studies: 10 real-life case studies (50 MCQs) on face/market value, dividend and yield, with answers and full solutions.' },
  { ch: 'Linear Inequations', chap: 'linear-inequations', pc: 12,
    topics: 'solving linear inequations in one variable and representing the solution set on a number line',
    metaTitle: 'Class 10 Linear Inequations Case Studies PDF (ICSE)',
    metaDesc: 'Class 10 Linear Inequations case studies: 10 real-life case studies (50 MCQs) on solving inequations and number-line solution sets, with full solutions.' },
  { ch: 'Loci', chap: 'loci', pc: 13,
    topics: 'the meaning of a locus and the standard loci - circle, perpendicular bisector, angle bisector and parallel lines',
    metaTitle: 'Class 10 Loci Case Study Questions PDF (ICSE)',
    metaDesc: 'Class 10 Loci case studies: 10 real-life case studies (50 MCQs) on standard loci and constructions, with answers and full step-by-step solutions.' },
];

const productSlug = (b) => `class-10-${b.chap}-case-studies-with-solutions`;
const title = (b) => `Class 10 ${b.ch} Case Studies With Solutions (10 Case Studies, 50 MCQs)`;

const shortDesc = (b) =>
  `10 real-life Class 10 ${b.ch} case studies -- each a passage with a diagram and 5 MCQs (50 in all) ` +
  `-- with a complete answer key and step-by-step detailed solutions. CBSE / ICSE / ISC, competency-based.`;

const description = (b) => `
<p>The <strong>Class 10 ${b.ch} Case Studies With Solutions</strong> e-book gives students
<strong>10 real-life case studies</strong> on ${b.ch} &mdash; exactly the competency-based,
case-study format that today's board exams reward.</p>
<ul>
  <li><strong>10 case studies</strong>, each a 125&ndash;145 word real-life scenario with a diagram,
      followed by <strong>5 MCQs</strong> &mdash; <strong>50 questions</strong> in all</li>
  <li>Questions test <strong>understanding through application and reasoning</strong>, not memorisation</li>
  <li>Difficulty builds from <strong>intermediate to advanced</strong> &mdash; ideal for the
      case-study / competency section of the board exam</li>
  <li><strong>Full answer key AND step-by-step detailed solutions</strong> at the end, on separate
      pages so students can attempt every case study first</li>
  <li>Competency-based, <strong>NEP 2020</strong> aligned and NCERT terminology; A4 PDF &mdash;
      instant download, print as many times as you need</li>
</ul>
<p><strong>What these case studies cover:</strong> ${b.topics}.</p>
<p>Practise alongside the free
<a href="${CLASS10}/${b.chap}" target="_blank" rel="noopener">Class 10 ${b.ch} study material</a>
&mdash; learn the concept free online, then apply it. See every chapter on the
<a href="${CLASS10}" target="_blank" rel="noopener">Class 10 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '-'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/class-10-case-studies-${b.chap}.jpg`);
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
         `${IMG}/class-10-case-studies-${b.chap}.jpg`, b.pc, 'Class 10', 'CBSE/ICSE/ISC',
         b.metaTitle, b.metaDesc, existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,price_locked,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?,1,0)`,
        [title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
         `${IMG}/class-10-case-studies-${b.chap}.jpg`, b.pc, 'Class 10', 'CBSE/ICSE/ISC', b.metaTitle, b.metaDesc]);
      added++; console.log('  added    ' + slug);
    }
  }

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=?`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated. "${CAT_SLUG}" now holds ${total.n} products.`);
  console.log('Prices seeded at Rs ' + PRICE + '/' + ORIGINAL + ' with price_locked=1 (repricer will not change them).');
  console.log('Next: ensure data/download-urls.json has the class-10 case-study links and run scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
