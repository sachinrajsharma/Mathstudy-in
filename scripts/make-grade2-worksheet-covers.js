/**
 * make-grade2-worksheet-covers.js
 *
 * One-off: resizes the 23 Grade-2 Maths Worksheet A4 cover PNGs (2480x3508,
 * authored at D:\MATHEMATICS\class 2\CLASS 2 MATH E BOOKS WORKSHEETS\covers)
 * down to the 1410x2250 shop-cover size used by the Grade-1 worksheet products,
 * writing them as JPGs into public/wp-content/uploads/grade-2-worksheets-<slug>.jpg
 * so they line up visually with the existing grade-1-worksheets-*.jpg covers.
 *
 *   node scripts/make-grade2-worksheet-covers.js
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const SRC = 'D:/MATHEMATICS/class 2/CLASS 2 MATH E BOOKS WORKSHEETS/covers';
const OUT = path.join(__dirname, '..', 'public', 'wp-content', 'uploads');
const W = 1410, H = 2250;

// NN -> cover/chapter slug (matches the source PNG file name fragment)
const SLUGS = [
  'counting-numbers', 'number-recognition', 'place-value', 'ordinal-numbers',
  'advanced-addition', 'addition-strategies', 'advanced-subtraction',
  'subtraction-strategies', 'foundations-multiplication', 'foundations-division',
  'fractions-whole', 'fractions-collection', 'algebraic-thinking', '2d-shapes',
  '3d-shapes', 'position-direction', 'symmetry', 'measurement-length',
  'measurement-weight', 'measurement-capacity', 'measurement-time',
  'measurement-money', 'data-handling',
];

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  let ok = 0;
  for (let i = 0; i < SLUGS.length; i++) {
    const nn = String(i + 1).padStart(2, '0');
    const slug = SLUGS[i];
    const src = path.join(SRC, `cover-${nn}-${slug}.png`);
    const out = path.join(OUT, `grade-2-worksheets-${slug}.jpg`);
    if (!fs.existsSync(src)) { console.log('  MISSING SOURCE ' + src); continue; }
    await sharp(src)
      .resize(W, H, { fit: 'fill' })   // same 1410x2250 target as the grade-1 shop covers
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(out);
    ok++; console.log('  wrote  grade-2-worksheets-' + slug + '.jpg');
  }
  console.log(`\nDone — ${ok}/${SLUGS.length} covers written to ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
