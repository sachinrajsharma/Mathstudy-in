/**
 * seed-grade2-worksheets.js
 *
 * Seeds the 23 chapter-wise Grade 2 Maths Worksheet e-books into the existing
 * "Grade 2 Math" category (grade-2-math), each with globally-searchable SEO
 * metadata, a rich HTML description and its own cover. The chapter list mirrors
 * the free study material at vidaara.org/courses/math/class-2 exactly, and every
 * product deep-links to its OWN chapter study page (requirement: wire each e-book
 * to its respective Class 2 e-book/study page).
 *
 * Every book: 20 printable one-page worksheets with a Name / Date / Score line,
 * ~186-218 unique questions, picture/diagram-rich, and a full answer key. 24-25pp PDF.
 *
 * Idempotent — safe to re-run; matches on slug, updates in place, and never
 * touches download_url (that comes from data/download-urls.json via
 * scripts/import-download-urls.js).
 *
 *   node scripts/seed-grade2-worksheets.js            (write to DB)
 *   node scripts/seed-grade2-worksheets.js --dry-run  (print only)
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

const CAT_SLUG = 'grade-2-math';
const IMG = '/wp-content/uploads';
const PRICE = 35, ORIGINAL = 55;
const CLASS2 = 'https://vidaara.org/courses/math/class-2';

// pslug = product slug fragment (SEO-tuned, unique);
// chap  = class-2 chapter slug (study deep-link + cover file fragment).
const BOOKS = [
  {
    ch: 'Counting Numbers', pslug: 'counting-numbers', chap: 'counting-numbers', q: 196,
    topics: 'counting up to 1000, forward and backward counting, skip counting by 2s, 5s, 10s and 100s, counting in groups and hundreds, and counting in real life',
    metaTitle: 'Grade 2 Counting Numbers Worksheets PDF (to 1000)',
    metaDesc: 'Grade 2 counting worksheets — 20 printable sheets, 196 questions on counting to 1000, skip counting by 2s/5s/10s/100s, with answer key. Instant PDF download.',
  },
  {
    ch: 'Number Recognition', pslug: 'number-recognition', chap: 'number-recognition', q: 208,
    topics: 'reading and writing number names to 1000, matching numerals to names, before, after and between, and even and odd numbers',
    metaTitle: 'Grade 2 Number Names Worksheets PDF — to 1000',
    metaDesc: 'Grade 2 number recognition worksheets — 20 printable sheets, 208 questions on number names to 1000, before/after/between and even/odd, with answer key. PDF.',
  },
  {
    ch: 'Place Value', pslug: 'place-value', chap: 'place-value', q: 192,
    topics: 'hundreds, tens and ones, 3-digit place value, expanded form, base-ten blocks, and comparing and ordering numbers to 1000',
    metaTitle: 'Grade 2 Place Value Worksheets PDF — Hundreds Tens Ones',
    metaDesc: 'Grade 2 place value worksheets — 20 printable sheets, 192 questions on hundreds/tens/ones, expanded form and comparing 3-digit numbers, with answer key. PDF.',
  },
  {
    ch: 'Ordinal Numbers', pslug: 'ordinal-numbers', chap: 'ordinal-numbers', q: 204,
    topics: 'ordinal numbers first to twentieth, ordinal words and numerals, position from left and right, calendars, races and queues',
    metaTitle: 'Grade 2 Ordinal Numbers Worksheets PDF (1st–20th)',
    metaDesc: 'Grade 2 ordinal numbers worksheets — 20 printable sheets, 204 questions on 1st to 20th, position words, calendars and queues, with answer key. Instant PDF.',
  },
  {
    ch: 'Addition With Regrouping', pslug: 'addition-with-regrouping', chap: 'advanced-addition', q: 212,
    topics: 'column addition with carrying, 2-digit and 3-digit addition with regrouping, adding three numbers, missing digits, and addition word problems',
    metaTitle: 'Grade 2 Addition With Regrouping Worksheets PDF',
    metaDesc: 'Grade 2 addition worksheets — 20 printable sheets, 212 questions on 2 and 3-digit column addition with regrouping and word problems, with answer key. PDF.',
  },
  {
    ch: 'Mental Addition Strategies', pslug: 'mental-addition-strategies', chap: 'addition-strategies', q: 210,
    topics: 'make-ten, doubles and near doubles, counting on, bridging through ten, adding 9, and mental addition to 1000',
    metaTitle: 'Grade 2 Mental Addition Strategies Worksheets PDF',
    metaDesc: 'Grade 2 mental addition worksheets — 20 printable sheets, 210 questions on make-ten, doubles, bridging and the add-9 trick, with answer key. Instant PDF.',
  },
  {
    ch: 'Subtraction With Borrowing', pslug: 'subtraction-with-borrowing', chap: 'advanced-subtraction', q: 207,
    topics: 'column subtraction with borrowing, 2-digit and 3-digit subtraction with regrouping, subtracting across zeros, and subtraction word problems',
    metaTitle: 'Grade 2 Subtraction With Borrowing Worksheets PDF',
    metaDesc: 'Grade 2 subtraction worksheets — 20 printable sheets, 207 questions on 2 and 3-digit column subtraction with borrowing and word problems, with answer key. PDF.',
  },
  {
    ch: 'Mental Subtraction Strategies', pslug: 'mental-subtraction-strategies', chap: 'subtraction-strategies', q: 218,
    topics: 'counting back, counting up, think-addition, fact families, missing numbers, and mental subtraction within 1000',
    metaTitle: 'Grade 2 Mental Subtraction Strategies Worksheets PDF',
    metaDesc: 'Grade 2 subtraction strategies worksheets — 20 printable sheets, 218 questions on counting up, fact families and missing numbers, with answer key. Instant PDF.',
  },
  {
    ch: 'Multiplication', pslug: 'multiplication', chap: 'foundations-multiplication', q: 208,
    topics: 'equal groups, repeated addition, arrays, number-line hops, turn-around facts, and the tables of 2, 3, 4, 5 and 10',
    metaTitle: 'Grade 2 Multiplication Worksheets PDF — Tables 2 3 4 5 10',
    metaDesc: 'Grade 2 multiplication worksheets — 20 printable sheets, 208 questions on equal groups, arrays and tables of 2, 3, 4, 5 and 10, with answer key. Instant PDF.',
  },
  {
    ch: 'Division', pslug: 'division', chap: 'foundations-division', q: 192,
    topics: 'equal sharing, grouping, repeated subtraction, division as the inverse of multiplication, and dividing by 2, 5 and 10',
    metaTitle: 'Grade 2 Division Worksheets PDF — Sharing & Grouping',
    metaDesc: 'Grade 2 division worksheets — 20 printable sheets, 192 questions on sharing, grouping and dividing by 2, 5 and 10, with answer key. Instant PDF download.',
  },
  {
    ch: 'Fractions of a Whole', pslug: 'fractions-of-a-whole', chap: 'fractions-whole', q: 202,
    topics: 'equal parts, one half, one third and one quarter of a shape, naming and shading fractions, and comparing simple fractions',
    metaTitle: 'Grade 2 Fractions Worksheets PDF — Half, Third, Quarter',
    metaDesc: 'Grade 2 fractions worksheets — 20 printable sheets, 202 questions on halves, thirds and quarters of shapes, naming and shading, with answer key. Instant PDF.',
  },
  {
    ch: 'Fractions of a Collection', pslug: 'fractions-of-a-collection', chap: 'fractions-collection', q: 214,
    topics: 'fractions of a group of objects, half, third and quarter of a number, fair sharing, and simple fraction word problems',
    metaTitle: 'Grade 2 Fractions of a Group Worksheets PDF',
    metaDesc: 'Grade 2 fractions of a collection worksheets — 20 printable sheets, 214 questions on half/third/quarter of a group and fair sharing, with answer key. PDF.',
  },
  {
    ch: 'Algebraic Thinking', pslug: 'algebraic-thinking', chap: 'algebraic-thinking', q: 195,
    topics: 'the equal sign as balance, true or false number sentences, missing numbers, balance scales, function machines, and number patterns',
    metaTitle: 'Grade 2 Algebraic Thinking Worksheets PDF — Missing Numbers',
    metaDesc: 'Grade 2 algebra readiness worksheets — 20 printable sheets, 195 questions on the equal sign, missing numbers, balances and patterns, with answer key. PDF.',
  },
  {
    ch: '2D Shapes', pslug: '2d-shapes', chap: '2d-shapes', q: 197,
    topics: 'circle, triangle, square, rectangle, pentagon, hexagon and octagon, sides and corners, sorting shapes, and making new shapes',
    metaTitle: 'Grade 2 2D Shapes Worksheets PDF — Sides & Corners',
    metaDesc: 'Grade 2 2D shapes worksheets — 20 printable sheets, 197 questions on naming shapes, counting sides and corners and sorting, with answer key. Instant PDF.',
  },
  {
    ch: '3D Shapes', pslug: '3d-shapes', chap: '3d-shapes', q: 200,
    topics: 'cube, cuboid, sphere, cylinder, cone and pyramid, faces, edges and vertices, roll, slide and stack, and everyday 3-D objects',
    metaTitle: 'Grade 2 3D Shapes Worksheets PDF — Faces Edges Vertices',
    metaDesc: 'Grade 2 3D shapes worksheets — 20 printable sheets, 200 questions on cubes, spheres, cones, faces, edges and vertices, with answer key. Instant PDF download.',
  },
  {
    ch: 'Position and Direction', pslug: 'position-and-direction', chap: 'position-direction', q: 206,
    topics: 'left and right, above and below, inside and outside, rows and columns, grid coordinates, quarter and half turns, and compass directions',
    metaTitle: 'Grade 2 Position and Direction Worksheets PDF',
    metaDesc: 'Grade 2 position and direction worksheets — 20 printable sheets, 206 questions on left/right, grids, turns and compass directions, with answer key. PDF.',
  },
  {
    ch: 'Symmetry', pslug: 'symmetry', chap: 'symmetry', q: 198,
    topics: 'lines of symmetry, the fold test, symmetric and non-symmetric figures, completing the other half, and repeating and growing patterns',
    metaTitle: 'Grade 2 Symmetry Worksheets PDF — Lines of Symmetry',
    metaDesc: 'Grade 2 symmetry worksheets — 20 printable sheets, 198 questions on lines of symmetry, the fold test and complete-the-half, with answer key. Instant PDF.',
  },
  {
    ch: 'Length', pslug: 'length-measurement', chap: 'measurement-length', q: 186,
    topics: 'longer and shorter, reading a centimetre ruler, choosing cm or m, estimating, comparing and ordering, and the 1 m = 100 cm rule with add and subtract',
    metaTitle: 'Grade 2 Length Measurement Worksheets PDF (cm & m)',
    metaDesc: 'Grade 2 length worksheets — 20 printable sheets, 186 questions on cm and m, ruler reading, estimating and 1 m = 100 cm, with answer key. Instant PDF download.',
  },
  {
    ch: 'Weight', pslug: 'weight-measurement', chap: 'measurement-weight', q: 210,
    topics: 'heavier and lighter, reading a balance scale, choosing grams or kilograms, estimating, and the 1 kg = 1000 g rule with add and subtract',
    metaTitle: 'Grade 2 Weight Measurement Worksheets PDF (g & kg)',
    metaDesc: 'Grade 2 weight worksheets — 20 printable sheets, 210 questions on grams and kilograms, balance scales and 1 kg = 1000 g, with answer key. Instant PDF.',
  },
  {
    ch: 'Capacity', pslug: 'capacity-measurement', chap: 'measurement-capacity', q: 196,
    topics: 'holds more or less, full, half-full and empty, reading a measuring jug, choosing litres or millilitres, and the 1 L = 1000 mL rule with add and subtract',
    metaTitle: 'Grade 2 Capacity Worksheets PDF — Litres & Millilitres',
    metaDesc: 'Grade 2 capacity worksheets — 20 printable sheets, 196 questions on litres and millilitres, measuring jugs and 1 L = 1000 mL, with answer key. Instant PDF.',
  },
  {
    ch: 'Time', pslug: 'time', chap: 'measurement-time', q: 195,
    topics: 'reading clocks to the hour, half past and quarter past and to, a.m. and p.m., days, weeks and months, the calendar, and duration word problems',
    metaTitle: 'Grade 2 Time Worksheets PDF — Clock & Calendar',
    metaDesc: 'Grade 2 time worksheets — 20 printable sheets, 195 questions on reading clocks, quarter past/to, a.m./p.m. and calendars, with answer key. Instant PDF.',
  },
  {
    ch: 'Money', pslug: 'money', chap: 'measurement-money', q: 204,
    topics: 'Indian coins and notes, counting money, rupees and paise, making amounts, comparing amounts, shopping bills and giving change',
    metaTitle: 'Grade 2 Money Worksheets PDF — Rupees & Paise',
    metaDesc: 'Grade 2 money worksheets — 20 printable sheets, 204 questions on Indian coins and notes, rupees and paise, bills and change, with answer key. Instant PDF.',
  },
  {
    ch: 'Data Handling', pslug: 'data-handling', chap: 'data-handling', q: 192,
    topics: 'sorting and classifying, tally marks, pictographs with keys, reading and drawing bar graphs, tables, and most, least and how-many-more',
    metaTitle: 'Grade 2 Data Handling Worksheets PDF — Tally, Graphs',
    metaDesc: 'Grade 2 data handling worksheets — 20 printable sheets, 192 questions on tally marks, pictographs and bar graphs, with answer key. Instant PDF download.',
  },
];

const productSlug = (b) => `grade-2-${b.pslug}-worksheets-with-answers`;
const title = (b) => `Grade 2 ${b.ch} Worksheets With Answers`;

const shortDesc = (b) =>
  `20 printable ${b.ch} worksheets for Grade 2 — ${b.q} unique questions with a Name, Date and ` +
  `Score line on every sheet and a full answer key. CBSE, ICSE and international.`;

const description = (b) => `
<p>The <strong>Grade 2 ${b.ch} Worksheets With Answers</strong> e-book gives young learners
20 bright, one-page worksheets that make practice feel purposeful — and gives teachers and
parents sheets they can print and hand out in seconds.</p>
<ul>
  <li><strong>20 printable worksheets</strong>, each fitting one A4 page with a
      <strong>Name, Date and Score line</strong> — ready for the classroom</li>
  <li><strong>${b.q} questions, every one unique</strong> — no repeats anywhere in the book,
      moving gently from easy to challenge level</li>
  <li><strong>Diagram-rich, picture-based questions</strong> that keep 7- and 8-year-olds
      engaged</li>
  <li><strong>Complete Answer Key</strong> at the back — checking a sheet takes a minute</li>
  <li>Aligned with <strong>CBSE, ICSE and international</strong> Grade 2 curricula</li>
  <li>A4 PDF — instant download, print as many times as you need</li>
</ul>
<p><strong>What this book covers:</strong> ${b.topics}.</p>
<p>This book follows the free
<a href="${CLASS2}/${b.chap}" target="_blank" rel="noopener">Vidaara Grade 2 ${b.ch} study
material</a> so children can learn the concept free online and then practise it on paper. See
all chapters on the <a href="${CLASS2}" target="_blank" rel="noopener">Class 2 Maths</a> page.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    console.log('\n' + '─'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + productSlug(b));
    console.log('cover       ' + `${IMG}/grade-2-worksheets-${b.chap}.jpg`);
    console.log('study link  ' + `${CLASS2}/${b.chap}`);
    console.log('price       Rs.' + PRICE + '  (was Rs.' + ORIGINAL + ')');
    console.log(`meta_title  ${b.metaTitle}   [${b.metaTitle.length}/70]`);
    console.log(`meta_desc   ${b.metaDesc}   [${b.metaDesc.length}/160]`);
  }
  console.log('\n' + BOOKS.length + ' products would be written into category "' + CAT_SLUG + '".');
}

async function run() {
  if (process.argv.includes('--dry-run')) return dryRun();
  const conn = await mysql.createConnection(cfg);

  const [[cat]] = await conn.query(`SELECT id FROM categories WHERE slug=?`, [CAT_SLUG]);
  if (!cat) throw new Error('Category ' + CAT_SLUG + ' not found');
  console.log(`Category "${CAT_SLUG}" -> id ${cat.id}`);

  let added = 0, updated = 0;
  for (const b of BOOKS) {
    const slug = productSlug(b);
    const [[existing]] = await conn.query(`SELECT id FROM products WHERE slug=?`, [slug]);
    const row = [
      title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
      `${IMG}/grade-2-worksheets-${b.chap}.jpg`, 25, 'Grade 2', 'CBSE/ICSE',
      b.metaTitle, b.metaDesc,
    ];
    if (existing) {
      await conn.query(
        `UPDATE products SET title=?,slug=?,description=?,short_desc=?,category_id=?,price=?,
         original_price=?,cover_image=?,page_count=?,grade=?,board=?,meta_title=?,meta_desc=?,
         is_published=1 WHERE id=?`, [...row, existing.id]);
      updated++; console.log('  updated  ' + slug);
    } else {
      await conn.query(
        `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,
         cover_image,page_count,grade,board,meta_title,meta_desc,is_published,is_featured)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,0)`, row);
      added++; console.log('  added    ' + slug);
    }
  }

  const [[total]] = await conn.query(`SELECT COUNT(*) n FROM products WHERE category_id=?`, [cat.id]);
  console.log(`\nDone — ${added} added, ${updated} updated. "${CAT_SLUG}" now holds ${total.n} products.`);
  console.log('Next: ensure data/download-urls.json has the grade-2 links and run');
  console.log('  node scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
