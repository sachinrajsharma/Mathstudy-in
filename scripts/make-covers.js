/**
 * make-covers.js — regenerate e-book cover artwork for products whose shipped
 * cover was the wrong book. The WP media library reused one single
 * "Mastering Case Studies in Class 12 Mathematics" JPG for nine different
 * products, so a Class 8 Rational Numbers e-book was selling under a Class 12
 * cover. This renders a per-book cover (correct class + correct chapter) in the
 * same house style as the good Class 9 covers.
 *
 * Vector only (no stock photos) so every cover stays crisp and on-brand.
 * Output: 1410x2250 JPG, the same size as the existing shop covers.
 *
 * sharp is a build-time-only dependency, deliberately kept out of package.json
 * so the production install stays lean:
 *   npm install --no-save sharp
 *   node scripts/make-covers.js          (writes JPGs into public/wp-content/uploads)
 *   node scripts/make-covers.js --svg    (also keeps the intermediate SVGs in build/covers)
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const W = 1410, H = 2250;
const OUT_DIR = path.join(__dirname, '..', 'public', 'wp-content', 'uploads');
const SVG_DIR = path.join(__dirname, '..', 'build', 'covers');
const KEEP_SVG = process.argv.includes('--svg');

const FONT = "'Segoe UI', 'Trebuchet MS', Arial, Helvetica, sans-serif";

/* ── tiny text metrics: enough to auto-fit headlines without a layout engine ── */
const widthOf = (text, size, bold) => text.length * size * (bold ? 0.575 : 0.52);

function fitSize(text, maxWidth, startSize, minSize, bold) {
  let s = startSize;
  while (s > minSize && widthOf(text, s, bold) > maxWidth) s -= 2;
  return s;
}

function wrap(text, maxWidth, size, bold, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? line + ' ' + w : w;
    if (widthOf(next, size, bold) > maxWidth && line) { lines.push(line); line = w; }
    else line = next;
  }
  if (line) lines.push(line);
  return maxLines ? lines.slice(0, maxLines) : lines;
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/* ── decorative background: faint maths glyphs, deterministic placement ────── */
function watermark() {
  const glyphs = ['x²', '√', 'π', '∑', '∫', 'a³', 'Δ', '%', '÷', '∞',
                  '2³', 'y = mx', 'θ', '≠', 'n!', '∠', 'log', 'sin', '½', '⅔'];
  let out = '';
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let i = 0; i < 70; i++) {
    const g = glyphs[i % glyphs.length];
    const x = Math.round(rnd() * W);
    const y = Math.round(rnd() * H);
    const s = 40 + Math.round(rnd() * 70);
    const rot = Math.round(rnd() * 40 - 20);
    out += `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${s}" font-weight="700"` +
           ` fill="#ffffff" opacity="0.07" transform="rotate(${rot} ${x} ${y})">${esc(g)}</text>`;
  }
  return out;
}

/* ── one cover ─────────────────────────────────────────────────────────────── */
function buildSvg(b) {
  const CX = W / 2;
  const eyebrowSize = fitSize(b.eyebrow, W - 160, 118, 62, true);

  // headline: up to two lines, shrink until it fits
  let titleSize = 172;
  let titleLines = wrap(b.title, W - 140, titleSize, true);
  while (titleLines.length > 2 && titleSize > 84) {
    titleSize -= 6;
    titleLines = wrap(b.title, W - 140, titleSize, true);
  }
  if (titleLines.length > 2) titleLines = titleLines.slice(0, 2);

  let y = 190;
  let head = `<text x="${CX}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${eyebrowSize}"` +
             ` font-weight="700" fill="#ffd54f">${esc(b.eyebrow)}</text>`;
  y += 40;
  for (const line of titleLines) {
    y += titleSize * 0.98;
    head += `<text x="${CX}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${titleSize}"` +
            ` font-weight="700" fill="#ffffff">${esc(line)}</text>`;
  }

  // ribbon with the class / level — the bit that was wrong on every reused cover
  const ribbonY = y + 70;
  const ribbonSize = fitSize(b.ribbon, 620, 108, 56, true);
  const ribbonW = Math.max(520, Math.min(900, widthOf(b.ribbon, ribbonSize, true) + 170));
  const ribbonH = 152;
  const rx = CX - ribbonW / 2;
  const tail = 46;
  const ribbon =
    `<path d="M ${rx - tail} ${ribbonY + 26} L ${rx + 18} ${ribbonY + 6} L ${rx + 18} ${ribbonY + ribbonH - 6}` +
    ` L ${rx - tail} ${ribbonY + ribbonH - 26} L ${rx - tail + 34} ${ribbonY + ribbonH / 2} Z" fill="#b5560a"/>` +
    `<path d="M ${rx + ribbonW + tail} ${ribbonY + 26} L ${rx + ribbonW - 18} ${ribbonY + 6}` +
    ` L ${rx + ribbonW - 18} ${ribbonY + ribbonH - 6} L ${rx + ribbonW + tail} ${ribbonY + ribbonH - 26}` +
    ` L ${rx + ribbonW + tail - 34} ${ribbonY + ribbonH / 2} Z" fill="#b5560a"/>` +
    `<rect x="${rx}" y="${ribbonY}" width="${ribbonW}" height="${ribbonH}" rx="16" fill="url(#ribbon)"` +
    ` stroke="#ffd54f" stroke-width="5"/>` +
    `<text x="${CX}" y="${ribbonY + ribbonH / 2 + ribbonSize * 0.36}" text-anchor="middle" font-family="${FONT}"` +
    ` font-size="${ribbonSize}" font-weight="700" fill="#ffffff">${esc(b.ribbon)}</text>`;

  // feature card
  const cardTop = ribbonY + ribbonH + 90;
  const cardH = H - cardTop - 250;
  const card = `<rect x="70" y="${cardTop}" width="${W - 140}" height="${cardH}" rx="34" fill="#ffffff" opacity="0.95"/>`;

  const perBullet = cardH / b.bullets.length;
  let items = '';
  b.bullets.forEach((bl, i) => {
    const top = cardTop + i * perBullet;
    const cy = top + perBullet / 2;
    const headSize = 56;
    const bodySize = 46;
    const bodyLines = wrap(bl.body, W - 400, bodySize, false, 2);
    const blockH = headSize + 14 + bodyLines.length * (bodySize + 10);
    let ty = cy - blockH / 2 + headSize * 0.85;

    items += `<circle cx="168" cy="${cy - 6}" r="42" fill="#2e9e4f"/>` +
             `<path d="M 146 ${cy - 8} l 16 18 l 32 -38" fill="none" stroke="#ffffff" stroke-width="12"` +
             ` stroke-linecap="round" stroke-linejoin="round"/>` +
             `<text x="248" y="${ty}" font-family="${FONT}" font-size="${headSize}" font-weight="700"` +
             ` fill="#0d3b73">${esc(bl.head)}</text>`;
    for (const line of bodyLines) {
      ty += bodySize + 10;
      items += `<text x="248" y="${ty}" font-family="${FONT}" font-size="${bodySize}" fill="#22405e">${esc(line)}</text>`;
    }
  });

  // footer
  const footY = H - 176;
  const foot =
    `<rect x="180" y="${footY}" width="${W - 360}" height="112" rx="56" fill="#e8730c" stroke="#ffd54f" stroke-width="5"/>` +
    `<text x="${CX}" y="${footY + 78}" text-anchor="middle" font-family="${FONT}" font-size="72"` +
    ` font-weight="700" fill="#ffffff">www.mathstudy.in</text>`;

  const badge = b.badge
    ? `<rect x="${CX - 190}" y="${cardTop - 78}" width="380" height="64" rx="32" fill="#0a2d5c" opacity="0.85"/>` +
      `<text x="${CX}" y="${cardTop - 32}" text-anchor="middle" font-family="${FONT}" font-size="42"` +
      ` font-weight="700" fill="#ffd54f">${esc(b.badge)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a2f66"/>
      <stop offset="55%" stop-color="#12539f"/>
      <stop offset="100%" stop-color="#1b74c9"/>
    </linearGradient>
    <linearGradient id="ribbon" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f38b1c"/>
      <stop offset="100%" stop-color="#d95f06"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${watermark()}
  <rect x="26" y="26" width="${W - 52}" height="${H - 52}" rx="18" fill="none" stroke="#ffd54f" stroke-width="6" opacity="0.7"/>
  ${head}
  ${ribbon}
  ${badge}
  ${card}
  ${items}
  ${foot}
</svg>`;
}

/* ── the books that need fixing ────────────────────────────────────────────── */
const SOLVED = { head: 'Fully Solved, Step by Step', body: 'Every MCQ worked out in full — no answer key guesswork.' };
const BOARDS = { head: 'CBSE, ICSE & State Boards', body: 'Mapped to the current competency-based exam pattern.' };
const PDF    = { head: 'Instant PDF Download', body: 'Print-ready. Practise offline, any time.' };

const chapterBook = (chapter, concepts, pages) => ([
  { head: '10 Concept-Based Case Studies', body: 'Real exam-style situations built around ' + chapter + '.' },
  { head: '50 MCQs with Answer Key', body: 'Graded from warm-up to board-level difficulty.' },
  { head: 'Complete Chapter Coverage', body: concepts },
  BOARDS,
  PDF,
]);

const BOOKS = [
  {
    file: 'case-studies-rational-numbers-class-8.jpg',
    eyebrow: 'Case Studies', title: 'Rational Numbers', ribbon: 'Class 8', badge: '22 Pages',
    bullets: chapterBook('rational numbers', 'Operations, comparison and representation on the number line.'),
  },
  {
    file: 'Case-studies-algebraic-expressions-class-8-math.jpg',
    eyebrow: 'Case Studies', title: 'Algebraic Expressions', ribbon: 'Class 8', badge: '18 Pages',
    bullets: chapterBook('algebraic expressions', 'Terms, coefficients, identities, multiplication and factorisation.'),
  },
  {
    file: 'Case-studies-exponents-and-powers-class-8.jpg',
    eyebrow: 'Case Studies', title: 'Exponents and Powers', ribbon: 'Class 8', badge: '22 Pages',
    bullets: chapterBook('exponents and powers', 'Laws of exponents, negative exponents and standard form.'),
  },
  {
    file: 'Case-studies-square-and-cube-roots-class-8.jpg',
    eyebrow: 'Case Studies', title: 'Square & Cube Roots', ribbon: 'Class 8', badge: '21 Pages',
    bullets: chapterBook('squares and cubes', 'Perfect squares, perfect cubes, roots and estimation.'),
  },
  {
    file: 'Class-8-Number-System-Case-Study.jpg',
    eyebrow: 'Case Studies', title: 'Number System', ribbon: 'Class 8', badge: '18 Pages',
    bullets: chapterBook('the number system', 'Natural numbers, integers, rational numbers and real numbers.'),
  },
  {
    file: 'math-case-studies-class-7.jpg',
    eyebrow: 'Math Case Studies', title: 'Complete Book', ribbon: 'Class 7', badge: '559 Pages',
    bullets: [
      { head: 'Every Chapter of Class 7 Maths', body: 'Integers, fractions, algebra, geometry, data handling and more.' },
      { head: 'Multiple Case Studies per Chapter', body: '559 pages of case-based questions in one book.' },
      SOLVED,
      BOARDS,
      PDF,
    ],
  },
  {
    file: 'hots-and-important-questions-class-12.jpg',
    eyebrow: 'HOTS & Important Questions', title: 'Mathematics', ribbon: 'Class 12', badge: '186 Pages',
    bullets: [
      { head: 'Higher Order Thinking Skills', body: 'The questions that decide the 95+ scores, not the routine ones.' },
      { head: 'All Chapters of the CBSE Syllabus', body: 'Calculus, algebra, vectors, 3D geometry and probability.' },
      SOLVED,
      { head: 'Built for Board Exam Prep', body: 'Selected from the patterns CBSE keeps coming back to.' },
      PDF,
    ],
  },
  {
    file: 'ctet-math-sample-papers.jpg',
    eyebrow: 'CTET Paper I', title: 'Math Sample Papers', ribbon: 'Primary Level', badge: '371 Pages',
    bullets: [
      { head: 'Full-Length Practice Papers', body: '371 pages modelled on the CTET Paper I question pattern.' },
      { head: 'Complete Syllabus Coverage', body: 'Number system, geometry, measurement and data handling.' },
      { head: 'Mathematics Pedagogy Included', body: 'The pedagogy questions most candidates lose marks on.' },
      SOLVED,
      PDF,
    ],
  },
  // These two shipped 16:9 landscape WP images that crop badly in the portrait
  // product frame — replaced with proper 1410x2250 house-style covers.
  {
    file: '4th-class-word-problems.jpg',
    eyebrow: 'Maths Workbook', title: 'Addition Word Problems', ribbon: 'Class 4', badge: '60 Pages',
    bullets: [
      { head: '100 Addition Word Problems', body: 'Real-life situations: shopping, travel, sports and school.' },
      { head: 'Step-by-Step Solutions', body: 'Every problem worked out in full for self-checking.' },
      { head: 'Curriculum Aligned', body: 'Matched to the Grade 4 addition syllabus.' },
      BOARDS,
      PDF,
    ],
  },
  {
    file: 'mixed-word-problems-for-grade-3.jpg',
    eyebrow: 'Maths Workbook', title: 'Mixed Word Problems', ribbon: 'Class 3', badge: '80 Pages',
    bullets: [
      { head: 'All Four Operations Mixed', body: 'Addition, subtraction, multiplication and division together.' },
      { head: 'Decide the Operation Yourself', body: 'The skill mixed practice builds best.' },
      { head: 'Step-by-Step Solutions', body: 'Every problem worked out in full for self-checking.' },
      BOARDS,
      PDF,
    ],
  },
];

async function run() {
  if (KEEP_SVG && !fs.existsSync(SVG_DIR)) fs.mkdirSync(SVG_DIR, { recursive: true });
  for (const b of BOOKS) {
    const svg = buildSvg(b);
    if (KEEP_SVG) fs.writeFileSync(path.join(SVG_DIR, b.file.replace(/\.jpg$/i, '.svg')), svg);
    await sharp(Buffer.from(svg)).jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
      .toFile(path.join(OUT_DIR, b.file));
    console.log('  wrote ' + b.file + '  (' + b.ribbon + ' - ' + b.title + ')');
  }
  console.log('Done: ' + BOOKS.length + ' covers regenerated.');
}

run().catch(e => { console.error(e); process.exit(1); });
