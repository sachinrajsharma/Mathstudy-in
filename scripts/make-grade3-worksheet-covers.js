/**
 * make-grade3-worksheet-covers.js
 *
 * One-off: resizes the 18 Grade-3 Maths Worksheet A4 cover PNGs (2480x3508,
 * authored at D:\MATHEMATICS\CLASS 3\GRADE 3 E BOOKS WORKSHEETS\covers) down to
 * the 1410x2250 shop-cover size used by the Grade-1/Grade-2 worksheet products,
 * writing them as JPGs into public/wp-content/uploads/grade-3-worksheets-<slug>.jpg.
 *
 *   node scripts/make-grade3-worksheet-covers.js
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const SRC = 'D:/MATHEMATICS/CLASS 3/GRADE 3 E BOOKS WORKSHEETS/covers';
const OUT = path.join(__dirname, '..', 'public', 'wp-content', 'uploads');
const W = 1410, H = 2250;

// NN -> cover/chapter slug (matches the source PNG file name fragment)
const SLUGS = [
  'place-value', 'comparing-ordering', 'addition-regrouping', 'subtraction-regrouping',
  'multiplication-facts', 'multiplication-2by1', 'division', 'fractions-number-line',
  'money', 'measurement-length', 'measurement-mass-capacity', 'time', 'perimeter', 'area',
  'lines-and-angles', 'quadrilaterals', 'patterns', 'scaled-graphs',
];

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  let ok = 0;
  for (let i = 0; i < SLUGS.length; i++) {
    const nn = String(i + 1).padStart(2, '0');
    const slug = SLUGS[i];
    const src = path.join(SRC, `cover-${nn}-${slug}.png`);
    const out = path.join(OUT, `grade-3-worksheets-${slug}.jpg`);
    if (!fs.existsSync(src)) { console.log('  MISSING SOURCE ' + src); continue; }
    await sharp(src)
      .resize(W, H, { fit: 'fill' })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(out);
    ok++; console.log('  wrote  grade-3-worksheets-' + slug + '.jpg');
  }
  console.log(`\nDone — ${ok}/${SLUGS.length} covers written to ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
