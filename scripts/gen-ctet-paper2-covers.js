/**
 * gen-ctet-paper2-covers.js — generates portrait JPG covers for the CTET Paper 2
 * Maths chapter-test e-books + practice papers book, into public/wp-content/uploads/.
 * Uses SVG -> JPG via sharp. Filenames match seed-ctet-paper2-chapter-tests.js.
 *   node scripts/gen-ctet-paper2-covers.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'public', 'wp-content', 'uploads');
fs.mkdirSync(OUT, { recursive: true });

const PALETTE = ['#0f5132', '#0b4a6f', '#6d2c91', '#8a2b4d', '#0d5c63', '#b3541e', '#1b4332', '#4a3f8f',
  '#7d1935', '#155e75', '#5b21b6', '#9a3412', '#065f46', '#1e3a8a'];

const BOOKS = [
  ['Number System', 'number-system'],
  ['Playing with Numbers', 'playing-with-numbers'],
  ['Whole Numbers', 'whole-numbers'],
  ['Negative Numbers and Integers', 'negative-numbers-and-integers'],
  ['Fractions and Decimals', 'fractions-and-decimals'],
  ['Introduction to Algebra', 'introduction-to-algebra'],
  ['Exponents, Powers and Identities', 'exponents-powers-and-identities'],
  ['Ratio and Proportion', 'ratio-and-proportion'],
  ['Basic Geometrical Ideas (2-D)', 'basic-geometrical-ideas-2d'],
  ['Understanding Elementary Shapes', 'understanding-elementary-shapes'],
  ['Symmetry', 'symmetry'],
  ['Geometrical Constructions', 'geometrical-constructions'],
  ['Mensuration', 'mensuration'],
  ['Data Handling', 'data-handling'],
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function wrap(title, max) {
  const words = title.split(' '); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur); return lines;
}

function coverSVG({ kicker, titleLines, badge, stats, brand, c1, c2 }) {
  const W = 800, H = 1130;
  const startY = 470 - (titleLines.length - 1) * 34;
  const titleTs = titleLines.map((ln, i) =>
    `<text x="60" y="${startY + i * 78}" font-family="Segoe UI, Arial, sans-serif" font-size="66" font-weight="800" fill="#ffffff">${esc(ln)}</text>`).join('');
  const statLines = stats.map((s, i) =>
    `<text x="60" y="${770 + i * 46}" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#eafff4">${esc(s)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="rl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#ff8c42"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="14" fill="url(#rl)"/>
  <text x="60" y="120" font-family="Segoe UI, Arial, sans-serif" font-size="26" letter-spacing="2" fill="#ffd166">${esc(kicker)}</text>
  <rect x="60" y="150" width="270" height="52" rx="26" fill="#ffd166"/>
  <text x="195" y="186" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="3" fill="#3b1a05">MATHEMATICS</text>
  <text x="60" y="300" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="700" fill="#eafff4">${esc(badge)}</text>
  ${titleTs}
  ${statLines}
  <g opacity="0.95">
    <rect x="60" y="930" width="680" height="46" rx="8" fill="url(#rl)" stroke="#c85a1b" stroke-width="2"/>
    ${Array.from({ length: 35 }, (_, i) => { const x = 60 + i * 19.4; const tall = i % 5 === 0; return `<line x1="${x.toFixed(1)}" y1="930" x2="${x.toFixed(1)}" y2="${tall ? 952 : 944}" stroke="#7a3410" stroke-width="${tall ? 2 : 1}"/>`; }).join('')}
    <circle cx="140" cy="880" r="26" fill="#06d6a0"/>
    <rect x="230" y="854" width="52" height="52" rx="5" fill="#118ab2"/>
    <polygon points="360,906 388,854 416,906" fill="#ef476f"/>
    <circle cx="500" cy="880" r="24" fill="none" stroke="#ffd166" stroke-width="7"/>
  </g>
  <text x="740" y="1080" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="800" fill="#ffd166">${esc(brand)}</text>
  <text x="60" y="1080" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#eafff4">Instant PDF · Fully Solved</text>
</svg>`;
}

(async () => {
  let n = 0;
  for (let i = 0; i < BOOKS.length; i++) {
    const [name, chap] = BOOKS[i];
    const svg = coverSVG({
      kicker: 'CTET & STATE TET  ·  PAPER II (VI–VIII)',
      badge: 'Chapter Tests',
      titleLines: wrap(name, 15),
      stats: ['150 exam-pattern MCQs', '5 worksheets · answer keys', 'Step-by-step solutions'],
      brand: 'mathstudy.in',
      c1: PALETTE[i % PALETTE.length], c2: '#198754',
    });
    const file = path.join(OUT, `ctet-paper-2-maths-${chap}-chapter-tests.jpg`);
    await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toFile(file);
    console.log('  ✓ ' + path.basename(file)); n++;
  }
  const psvg = coverSVG({
    kicker: 'CTET & STATE TET  ·  PAPER II (VI–VIII)',
    badge: '30 Practice Papers',
    titleLines: wrap('30 Full Practice Papers', 15),
    stats: ['900 MCQs · 30 papers', 'Balanced across all chapters', 'Answer keys + solutions'],
    brand: 'mathstudy.in',
    c1: '#7d1935', c2: '#0f5132',
  });
  const pfile = path.join(OUT, 'ctet-paper-2-maths-30-practice-papers.jpg');
  await sharp(Buffer.from(psvg)).jpeg({ quality: 86 }).toFile(pfile);
  console.log('  ✓ ' + path.basename(pfile)); n++;
  console.log(`\nGenerated ${n} covers into ${OUT}`);
})().catch(e => { console.error(e); process.exit(1); });
