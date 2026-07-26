/**
 * make-grade4-worksheet-covers.js
 *
 * One-off: resizes the 17 Grade-4 Maths Worksheet A4 cover PNGs (2480x3508,
 * authored at D:\MATHEMATICS\CLASS 4\GRADE 4 WORKSHEETS E BOOKS\covers) down to
 * the 1410x2250 shop-cover size used by the Grade-1/2/3 worksheet products,
 * writing them as JPGs into public/wp-content/uploads/grade-4-worksheets-<slug>.jpg.
 *
 *   node scripts/make-grade4-worksheet-covers.js
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const SRC = 'D:/MATHEMATICS/CLASS 4/GRADE 4 WORKSHEETS E BOOKS/covers';
const OUT = path.join(__dirname, '..', 'public', 'wp-content', 'uploads');
const W = 1410, H = 2250;

// NN -> cover/chapter slug (matches the source PNG file name fragment AND the
// class-4 study-page URL slug).
const SLUGS = [
  'place-value-to-4-lakh', 'comparing-ordering-rounding', 'addition-subtraction',
  'multi-digit-multiplication', 'division-with-remainders', 'factors-multiples',
  'equivalent-fractions', 'fraction-operations', 'decimals-tenths-hundredths',
  'money', 'measurement-conversions', 'area-perimeter-formulas', 'time',
  '2d-shapes-symmetry', 'lines-and-angles', 'line-plots-with-fractions',
  'number-patterns',
];

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  let ok = 0;
  for (let i = 0; i < SLUGS.length; i++) {
    const nn = String(i + 1).padStart(2, '0');
    const slug = SLUGS[i];
    const src = path.join(SRC, `cover-${nn}-${slug}.png`);
    const out = path.join(OUT, `grade-4-worksheets-${slug}.jpg`);
    if (!fs.existsSync(src)) { console.log('  MISSING SOURCE ' + src); continue; }
    await sharp(src)
      .resize(W, H, { fit: 'fill' })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(out);
    ok++; console.log('  wrote  grade-4-worksheets-' + slug + '.jpg');
  }
  console.log(`\nDone — ${ok}/${SLUGS.length} covers written to ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
