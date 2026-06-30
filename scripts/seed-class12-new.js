/**
 * seed-class12-new.js  —  Seeds 6 new Class 12 products into the Node.js shop
 * Run: node scripts/seed-class12-new.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || '',
  database: process.env.DB_NAME || 'mathstudy'
};

const WP = 'https://mathstudy.in/wp-content/uploads';

const NEW_PRODUCTS = [
  {
    title:          'HOTS & Important Questions Mathematics Class 12 CBSE',
    slug:           'hots-important-questions-mathematics-class-12-cbse',
    short_desc:     '186-page PDF with High Order Thinking Skills (HOTS) questions and important exam problems for Class 12 CBSE Mathematics.',
    description:    '<p>A comprehensive collection of HOTS and important questions covering all chapters of Class 12 CBSE Mathematics. Ideal for board exam preparation with 186 pages of carefully selected problems that build higher-order reasoning.</p>',
    cat_slug:       'class-12-mathematics',
    price:          35.00,
    original_price: 48.00,
    cover_image:    WP + '/hots-and-important-questions-class-12.jpg',
    page_count:     186,
    grade:          'Class 12',
    board:          'CBSE',
    meta_title:     'HOTS Important Questions Class 12 Maths CBSE PDF',
    meta_desc:      'Download HOTS & Important Questions for Class 12 CBSE Mathematics. 186 pages of higher-order thinking problems for board exam success.'
  },
  {
    title:          'Mathematics Formula Book for JEE',
    slug:           'mathematics-formula-book-for-jee',
    short_desc:     'Compact PDF reference book with 1500+ essential mathematics formulas for JEE Main and Advanced preparation.',
    description:    '<p>A one-stop formula reference for JEE aspirants. Covers all key topics — Algebra, Trigonometry, Calculus, Coordinate Geometry, Vectors, and more — with 1500+ formulas neatly organised for quick revision during exam prep.</p>',
    cat_slug:       'jee-mathematics',
    price:          25.00,
    original_price: 38.00,
    cover_image:    WP + '/math-formula-book-pdf-1.jpg',
    page_count:     null,
    grade:          'Class 11-12 / JEE',
    board:          'JEE',
    meta_title:     'Mathematics Formula Book for JEE PDF Download',
    meta_desc:      'Get the JEE Mathematics Formula Book PDF — 1500+ formulas covering all JEE topics. Perfect quick-revision companion for JEE Main and Advanced.'
  },
  {
    title:          'CLASS 12 MATHEMATICS SAMPLE PAPERS FOR 2023 EXAMINATION (C.B.S.E)',
    slug:           'class-12-mathematics-sample-papers-for-2021-examination-c-b-s-e',
    short_desc:     '15 full-length sample papers for Class 12 CBSE Mathematics, modelled on the latest exam pattern with complete solutions.',
    description:    '<p>Practice with 15 CBSE-pattern sample papers for Class 12 Mathematics. Each paper follows the latest marking scheme and includes detailed solutions to help students identify weak areas and build exam confidence.</p>',
    cat_slug:       'class-12-mathematics',
    price:          65.00,
    original_price: 110.00,
    cover_image:    WP + '/C.B.S.E-SAMPLE-PAPERS-CLASS-12-MATHMEATICS.jpg',
    page_count:     null,
    grade:          'Class 12',
    board:          'CBSE',
    meta_title:     'Class 12 Maths Sample Papers 2023 CBSE PDF',
    meta_desc:      '15 Class 12 Mathematics sample papers for CBSE 2023 exam. Latest pattern, fully solved. Ideal for last-minute practice and revision.'
  },
  {
    title:          'Chapter wise Test Papers for Class 12 Maths',
    slug:           'chapter-wise-test-papers-for-class-12-maths',
    short_desc:     '56 chapter-wise test papers covering all Class 12 CBSE Mathematics chapters with complete solutions.',
    description:    '<p>56 focused test papers — one or more per chapter — covering the entire Class 12 CBSE Mathematics syllabus. Each test is fully solved, allowing students to self-assess chapter by chapter and fill knowledge gaps before board exams.</p>',
    cat_slug:       'class-12-mathematics',
    price:          52.00,
    original_price: 65.00,
    cover_image:    WP + '/Chapter-wise-Test-Papers-for-Class-12-maths-1.jpg',
    page_count:     null,
    grade:          'Class 12',
    board:          'CBSE',
    meta_title:     'Chapter Wise Test Papers Class 12 Maths PDF CBSE',
    meta_desc:      '56 chapter-wise test papers for Class 12 CBSE Maths with solutions. Systematically cover every chapter before your board exams.'
  },
  {
    title:          'Mathematics Work Book Class XII C.B.S.E. (Fully Solved)',
    slug:           'work-book-class-xii-c-b-s-e-fully-solved',
    short_desc:     '1200+ fully solved questions covering all Class 12 CBSE Mathematics chapters, including previous years board problems.',
    description:    '<p>An exhaustive workbook for Class 12 CBSE and ISC Mathematics students. Contains 1200+ solved problems spanning all 13 chapters — from Relations and Functions through to Probability — with VSA, SA, and LA question types. Includes previous years board questions to build real exam confidence.</p>',
    cat_slug:       'class-12-mathematics',
    price:          58.00,
    original_price: 75.00,
    cover_image:    WP + '/Work-Book-Class-XII-Mathematic-CBSE.jpg',
    page_count:     null,
    grade:          'Class 12',
    board:          'CBSE',
    meta_title:     'Class 12 Maths Workbook CBSE Fully Solved PDF',
    meta_desc:      'Download Class 12 CBSE Mathematics Workbook — 1200+ fully solved questions, all chapters, previous year board problems. CBSE and ISC compatible.'
  },
  {
    title:          'Objective Type Question Bank for Mathematics Class XII C.B.S.E.',
    slug:           'objective-type-question-bank-for-mathematics-class-xii-c-b-s-e',
    short_desc:     '850+ MCQs, VSA, and fill-in-the-blank questions for Class 12 CBSE Mathematics — fully solved and exam-aligned.',
    description:    '<p>A focused objective question bank with 850+ fully solved questions for Class 12 CBSE Mathematics. Covers MCQs, Very Short Answer, and Fill-in-the-blank formats, strictly aligned to the latest CBSE guidelines. Highly rated by students for board exam preparation.</p>',
    cat_slug:       'class-12-mathematics',
    price:          49.00,
    original_price: 65.00,
    cover_image:    WP + '/Objective-Type-Question-Bank-CLASS-12-MATHEMATICS.jpg',
    page_count:     null,
    grade:          'Class 12',
    board:          'CBSE',
    meta_title:     'Objective Question Bank Class 12 Maths CBSE PDF',
    meta_desc:      'Class 12 CBSE Mathematics Objective Question Bank — 850+ MCQs and VSA fully solved. Aligned to latest CBSE guidelines for board exam prep.'
  }
];

async function run() {
  console.log('Connecting...');
  const conn = await mysql.createConnection(cfg);

  // Build category map
  const [cats] = await conn.query('SELECT id, slug FROM categories');
  const catMap = {};
  for (const c of cats) catMap[c.slug] = c.id;

  let inserted = 0;
  let skipped  = 0;

  for (const p of NEW_PRODUCTS) {
    const catId = catMap[p.cat_slug] || null;
    const [res] = await conn.query(
      `INSERT IGNORE INTO products
        (title, slug, description, short_desc, category_id, price, original_price,
         cover_image, page_count, grade, board, is_published, is_featured,
         meta_title, meta_desc)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,1,0,?,?)`,
      [
        p.title, p.slug, p.description, p.short_desc,
        catId, p.price, p.original_price,
        p.cover_image, p.page_count, p.grade, p.board,
        p.meta_title, p.meta_desc
      ]
    );
    if (res.affectedRows > 0) {
      console.log('  Inserted:', p.title);
      inserted++;
    } else {
      console.log('  Skipped (already exists):', p.slug);
      skipped++;
    }
  }

  console.log('');
  console.log('Done. Inserted:', inserted, '| Skipped:', skipped);
  await conn.end();
}

run().catch(e => { console.error(e); process.exit(1); });
