/**
 * seed-grade1-worksheets.js
 *
 * Seeds the 21 chapter-wise Grade 1 Maths Worksheet e-books into the existing
 * "Grade 1 Math" category (grade-1-math), each with globally-searchable SEO
 * metadata, a rich description and its own cover. The chapter list mirrors the
 * free study material at vidaara.org/courses/math/class-1 exactly.
 *
 * Every book: 20 printable one-page worksheets with a Name / Date / Score line,
 * ~175-210 unique questions, picture diagrams, and a full answer key. 25-page PDF.
 *
 * Idempotent — safe to re-run; updates existing rows matched on slug and never
 * touches the download link (that comes from data/download-urls.json via
 * scripts/import-download-urls.js).
 *
 *   node scripts/seed-grade1-worksheets.js            (write to DB)
 *   node scripts/seed-grade1-worksheets.js --dry-run  (print only)
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

const CAT_SLUG = 'grade-1-math';
const IMG = '/wp-content/uploads';
const PRICE = 35, ORIGINAL = 55;

// slug = product slug fragment; cover = cover file fragment (book slug)
const BOOKS = [
  {
    ch: 'Counting Numbers', slug: 'counting-numbers', cover: 'counting-numbers', q: 192,
    topics: 'counting 0 to 100, forward and backward counting, skip counting by 2s, 5s and 10s, counting objects and pictures, and counting in real life',
    metaTitle: 'Grade 1 Counting Worksheets PDF — 20 Printable Sheets',
    metaDesc: 'Grade 1 counting numbers worksheets — 20 printable sheets, 190+ questions on counting to 100, skip counting and picture counting, with answer key. PDF.',
  },
  {
    ch: 'Number Recognition', slug: 'number-recognition', cover: 'number-recognition', q: 192,
    topics: 'reading and writing numbers 1 to 100, number names from one to a hundred, matching numerals to names and picture groups, and ordering numbers',
    metaTitle: 'Grade 1 Number Names Worksheets — Printable PDF',
    metaDesc: 'Grade 1 number recognition worksheets — 20 printable sheets on number names 1-100, matching and ordering, with full answer key. Instant PDF download.',
  },
  {
    ch: 'Place Value', slug: 'place-value', cover: 'place-value', q: 200,
    topics: 'tens and ones, place value to 100, expanded form, comparing two-digit numbers with greater-than and less-than signs, and ordering',
    metaTitle: 'Grade 1 Place Value Worksheets — Tens and Ones PDF',
    metaDesc: 'Grade 1 place value worksheets — 20 printable sheets, 200 questions on tens and ones, expanded form and comparing numbers, with answer key. PDF.',
  },
  {
    ch: 'Ordinal Numbers', slug: 'ordinal-numbers', cover: 'ordinal-numbers', q: 204,
    topics: 'first to tenth, ordinal words and numerals, position from left and right, races, queues, floors and dates',
    metaTitle: 'Grade 1 Ordinal Numbers Worksheets — Printable PDF',
    metaDesc: 'Grade 1 ordinal numbers worksheets — 20 printable sheets on 1st to 10th, position words, races and queues, with full answer key. Instant PDF download.',
  },
  {
    ch: 'Basic Addition', slug: 'basic-addition', cover: 'basic-addition', q: 194,
    topics: 'picture addition, number-line hops, addition within 10 and 20, vertical addition, and two-digit addition without regrouping',
    metaTitle: 'Grade 1 Addition Worksheets PDF — 20 Printable Sheets',
    metaDesc: 'Grade 1 addition worksheets — 20 printable sheets, 190+ questions from picture addition to two-digit sums without regrouping, with answer key. PDF.',
  },
  {
    ch: 'Addition Strategies', slug: 'addition-strategies', cover: 'addition-strategies', q: 200,
    topics: 'counting on, making ten with ten-frames, doubles and near doubles, the add-9 trick, and mental addition',
    metaTitle: 'Grade 1 Addition Strategies Worksheets — Make Ten PDF',
    metaDesc: 'Grade 1 mental addition worksheets — 20 printable sheets on counting on, making ten, doubles and near doubles, with answer key. Instant PDF download.',
  },
  {
    ch: 'Basic Subtraction', slug: 'basic-subtraction', cover: 'basic-subtraction', q: 212,
    topics: 'picture take-away, finding the difference, subtraction within 10 and 20, vertical subtraction, and two-digit subtraction without borrowing',
    metaTitle: 'Grade 1 Subtraction Worksheets PDF — 20 Printable',
    metaDesc: 'Grade 1 subtraction worksheets — 20 printable sheets, 212 questions from picture take-away to two-digit subtraction without borrowing. Answer key. PDF.',
  },
  {
    ch: 'Subtraction Strategies', slug: 'subtraction-strategies', cover: 'subtraction-strategies', q: 200,
    topics: 'counting backward, think-addition, fact families, missing numbers, and mental subtraction within 20',
    metaTitle: 'Grade 1 Subtraction Strategies Worksheets PDF',
    metaDesc: 'Grade 1 subtraction strategies worksheets — 20 printable sheets on counting back, fact families and missing numbers, with answer key. Instant PDF.',
  },
  {
    ch: 'Patterns', slug: 'patterns', cover: 'patterns', q: 202,
    topics: 'AB, AAB, ABB and ABC repeating patterns, shape and size patterns, number patterns, growing patterns, and make-your-own patterns',
    metaTitle: 'Grade 1 Patterns Worksheets — Printable PDF',
    metaDesc: 'Grade 1 patterns worksheets — 20 printable sheets on repeating shape patterns, number patterns and growing patterns, with answer key. Instant PDF.',
  },
  {
    ch: 'Introduction to Algebraic Thinking', slug: 'algebraic-thinking', cover: 'intro-algebraic-thinking', q: 194,
    topics: 'the equal sign as balance, missing-number problems, true or false number sentences, balance scales, and function machines',
    metaTitle: 'Grade 1 Algebra Readiness Worksheets — Missing Numbers',
    metaDesc: 'Grade 1 algebraic thinking worksheets — 20 printable sheets on the equal sign, missing numbers and balancing, with answer key. Instant PDF download.',
  },
  {
    ch: 'Basic Shapes', slug: 'basic-shapes', cover: 'basic-shapes', q: 179,
    topics: 'circle, triangle, square, rectangle, oval and hexagon, counting sides and corners, shape hunts, and drawing shapes',
    metaTitle: 'Grade 1 2D Shapes Worksheets — Printable PDF',
    metaDesc: 'Grade 1 shapes worksheets — 20 printable sheets on circles, triangles, squares, sides and corners, shape hunts and riddles, with answer key. PDF.',
  },
  {
    ch: 'Solid Shapes', slug: 'solid-shapes', cover: 'solid-shapes', q: 192,
    topics: 'cube, cuboid, sphere, cylinder and cone, rolling and sliding, flat and curved surfaces, and everyday 3-D objects',
    metaTitle: 'Grade 1 3D Shapes Worksheets — Solid Shapes PDF',
    metaDesc: 'Grade 1 solid shapes worksheets — 20 printable sheets on cubes, spheres, cylinders and cones, roll or slide, with answer key. Instant PDF download.',
  },
  {
    ch: 'Position and Direction', slug: 'position-direction', cover: 'position-direction', q: 204,
    topics: 'left and right, above and below, inside and outside, near and far, top, middle and bottom, and simple grid moves',
    metaTitle: 'Grade 1 Position and Direction Worksheets PDF',
    metaDesc: 'Grade 1 position worksheets — 20 printable sheets on left/right, above/below, inside/outside and grid journeys, with answer key. Instant PDF.',
  },
  {
    ch: 'Symmetry', slug: 'symmetry', cover: 'symmetry', q: 182,
    topics: 'the fold test, matching halves, mirror letters, counting fold lines, completing the other half on dot grids, and symmetry in nature',
    metaTitle: 'Grade 1 Symmetry Worksheets — Printable PDF',
    metaDesc: 'Grade 1 symmetry worksheets — 20 printable sheets on the fold test, mirror halves, symmetric letters and draw-the-other-half, with answer key. PDF.',
  },
  {
    ch: 'Length', slug: 'length', cover: 'length', q: 174,
    topics: 'long and short, tall and short, ordering lengths, measuring with cubes and paper clips, and reading a centimetre ruler',
    metaTitle: 'Grade 1 Length Measurement Worksheets PDF',
    metaDesc: 'Grade 1 length worksheets — 20 printable sheets on longer/shorter, measuring with cubes and clips, and cm rulers, with answer key. Instant PDF.',
  },
  {
    ch: 'Weight', slug: 'weight', cover: 'weight', q: 180,
    topics: 'heavy and light, comparing weights, reading the balance scale, ordering by weight, and measuring with blocks',
    metaTitle: 'Grade 1 Weight Worksheets — Heavy and Light PDF',
    metaDesc: 'Grade 1 weight worksheets — 20 printable sheets on heavy vs light, balance scales and ordering by weight, with answer key. Instant PDF download.',
  },
  {
    ch: 'Capacity', slug: 'capacity', cover: 'capacity', q: 184,
    topics: 'full, half-full and empty, holds more or less, counting cups to fill a jug, and an introduction to litres',
    metaTitle: 'Grade 1 Capacity Worksheets — Printable PDF',
    metaDesc: 'Grade 1 capacity worksheets — 20 printable sheets on full/empty, holds more or less, cups and litres, with answer key. Instant PDF download.',
  },
  {
    ch: 'Time', slug: 'time', cover: 'time', q: 200,
    topics: 'days of the week, months and the calendar, morning to night routines, and reading the clock to the hour with 58 clock faces',
    metaTitle: 'Grade 1 Time Worksheets — Clock and Calendar PDF',
    metaDesc: 'Grade 1 time worksheets — 20 printable sheets on days, months, calendars and reading o-clock times on real clock faces, with answer key. PDF.',
  },
  {
    ch: 'Money', slug: 'money', cover: 'money', q: 198,
    topics: 'recognising Indian coins and notes, counting money, making amounts, simple buying and change within Rs 100',
    metaTitle: 'Grade 1 Money Worksheets — Indian Coins and Notes PDF',
    metaDesc: 'Grade 1 money worksheets — 20 printable sheets on counting Indian coins and notes, simple buying and change, with answer key. Instant PDF download.',
  },
  {
    ch: 'Collecting and Organising Data', slug: 'data-handling', cover: 'collecting-organising-data', q: 177,
    topics: 'sorting and classifying, tally marks, picture graphs, simple tables, and reading most, least and how-many-more',
    metaTitle: 'Grade 1 Data Handling Worksheets — Graphs, Tally PDF',
    metaDesc: 'Grade 1 data handling worksheets — 20 printable sheets on sorting, tally marks, picture graphs and tables, with answer key. Instant PDF download.',
  },
  {
    ch: 'Mathematical Reasoning', slug: 'mathematical-reasoning', cover: 'mathematical-reasoning', q: 196,
    topics: 'same and different, odd one out, sorting and grouping, sequencing, number riddles, shape codes and logical thinking',
    metaTitle: 'Grade 1 Maths Reasoning Worksheets — Logic Puzzles PDF',
    metaDesc: 'Grade 1 reasoning worksheets — 20 printable sheets of odd-one-out, riddles, shape codes and logic puzzles, with answer key. Instant PDF download.',
  },
];

const title = (b) => `Grade 1 ${b.ch} Worksheets With Answers`;

const shortDesc = (b) =>
  `20 printable ${b.ch} worksheets for Grade 1 — ${b.q} unique picture-based questions with a ` +
  `Name, Date and Score line on every sheet and a full answer key. CBSE, ICSE and international.`;

const description = (b) => `
<p>The <strong>Grade 1 ${b.ch} Worksheets With Answers</strong> e-book gives young learners
20 bright, one-page worksheets that make practice feel like play — and gives teachers and
parents sheets they can print and hand out in seconds.</p>
<ul>
  <li><strong>20 printable worksheets</strong>, each fitting one A4 page with a
      <strong>Name, Date and Score line</strong> — designed for classroom use</li>
  <li><strong>${b.q} questions, every one unique</strong> — no repeats anywhere in the book,
      moving gently from easy to challenge level</li>
  <li><strong>Colourful picture-based questions</strong> — counting rows, diagrams and
      child-friendly artwork keep young learners engaged</li>
  <li><strong>Complete Answer Key</strong> at the back — checking a sheet takes a minute</li>
  <li>Aligned with <strong>CBSE, ICSE and international</strong> Grade 1 curricula</li>
  <li>25-page A4 PDF — instant download, print as many times as you need</li>
</ul>
<p><strong>What this book covers:</strong> ${b.topics}.</p>
<p>This book follows the free <a href="https://vidaara.org/courses/math/class-1" target="_blank"
rel="noopener">Vidaara Grade 1 Maths study material</a> chapter by chapter, so children can
learn the concept free online and practise it on paper.</p>
<p><em>Prepared by Sachin Sharma, Founder &mdash; vidaara.org (free e-learning platform).</em></p>
`.trim().replace(/\s*\n\s*/g, ' ');

function dryRun() {
  for (const b of BOOKS) {
    const slug = `grade-1-${b.slug}-worksheets-with-answers`;
    console.log('\n' + '─'.repeat(78));
    console.log('title       ' + title(b));
    console.log('slug        ' + slug);
    console.log('cover       ' + `${IMG}/grade-1-worksheets-${b.cover}.jpg`);
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
    const slug = `grade-1-${b.slug}-worksheets-with-answers`;
    const [[existing]] = await conn.query(`SELECT id FROM products WHERE slug=?`, [slug]);
    const row = [
      title(b), slug, description(b), shortDesc(b), cat.id, PRICE, ORIGINAL,
      `${IMG}/grade-1-worksheets-${b.cover}.jpg`, 25, 'Grade 1', 'CBSE/ICSE',
      b.metaTitle, b.metaDesc,
    ];
    if (existing) {
      await conn.query(
        `UPDATE products SET title=?,slug=?,description=?,short_desc=?,category_id=?,price=IF(price_locked=1,price,?),
         original_price=IF(price_locked=1,original_price,?),cover_image=?,page_count=?,grade=?,board=?,meta_title=?,meta_desc=?,
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
  console.log('Next: ensure data/download-urls.json has the grade-1 links and run');
  console.log('  node scripts/import-download-urls.js');
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
