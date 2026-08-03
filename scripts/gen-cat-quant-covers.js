/**
 * gen-cat-quant-covers.js — portrait JPG covers for the CAT Quant chapter-test
 * e-books + practice papers, into public/wp-content/uploads/. SVG -> JPG via sharp.
 * Filenames match seed-cat-quant-chapter-tests.js.  node scripts/gen-cat-quant-covers.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'public', 'wp-content', 'uploads');
fs.mkdirSync(OUT, { recursive: true });

const PALETTE = ['#3b0764', '#4c1d95', '#5b21b6', '#6d28d9', '#7c3aed', '#0e7490', '#155e75', '#0f766e',
  '#7c2d12', '#9a3412', '#b45309', '#a21caf', '#86198f', '#701a75', '#1e3a8a', '#1d4ed8', '#0c4a6e',
  '#065f46', '#166534', '#3f6212', '#4d7c0f', '#831843', '#9d174d', '#be123c', '#9f1239', '#7e22ce',
  '#6b21a8', '#581c87', '#4a044e'];

const BOOKS = [
  ['Percentages', 'percentages'], ['Profit, Loss & Discount', 'profit-loss-and-discount'],
  ['Ratio & Proportion', 'ratio-and-proportion'], ['Averages', 'averages'],
  ['Mixtures & Alligations', 'mixtures-and-alligations'], ['Simple & Compound Interest', 'simple-and-compound-interest'],
  ['Time & Work', 'time-and-work'], ['Time, Speed & Distance', 'time-speed-and-distance'],
  ['Linear Equations', 'linear-equations'], ['Quadratic Equations', 'quadratic-equations'],
  ['Inequalities', 'inequalities'], ['Functions & Graphs', 'functions-and-graphs'],
  ['Logarithms', 'logarithms'], ['Sequences & Series', 'sequences-and-series'],
  ['Maxima & Minima', 'maxima-and-minima'], ['Number System', 'number-systems'],
  ['HCF & LCM', 'hcf-and-lcm'], ['Factorials & Unit Digits', 'factorials-and-unit-digits'],
  ['Fractions & Decimals', 'fractions-and-decimals'], ['Lines, Angles & Triangles', 'lines-angles-and-triangles'],
  ['Circles', 'circles'], ['Quadrilaterals', 'quadrilaterals'], ['Coordinate Geometry', 'coordinate-geometry'],
  ['Mensuration (2-D)', 'mensuration-2d'], ['Mensuration (3-D)', 'mensuration-3d'],
  ['Permutations & Combinations', 'permutations-and-combinations'], ['Probability', 'probability'],
  ['Set Theory', 'set-theory'], ['Calendar & Clocks', 'calendar-and-clocks'],
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function wrap(t, max) { const w = t.split(' '); const L = []; let c = ''; for (const x of w) { if ((c + ' ' + x).trim().length > max) { if (c) L.push(c); c = x; } else c = (c + ' ' + x).trim(); } if (c) L.push(c); return L; }

function coverSVG({ kicker, titleLines, badge, stats, brand, c1, c2 }) {
  const W = 800, H = 1130;
  const startY = 470 - (titleLines.length - 1) * 34;
  const tt = titleLines.map((ln, i) => `<text x="60" y="${startY + i * 74}" font-family="Segoe UI, Arial, sans-serif" font-size="60" font-weight="800" fill="#ffffff">${esc(ln)}</text>`).join('');
  const st = stats.map((s, i) => `<text x="60" y="${790 + i * 46}" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#f5f3ff">${esc(s)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
  <linearGradient id="rl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fcd34d"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="14" fill="url(#rl)"/>
  <text x="60" y="120" font-family="Segoe UI, Arial, sans-serif" font-size="24" letter-spacing="2" fill="#fcd34d">${esc(kicker)}</text>
  <rect x="60" y="150" width="270" height="52" rx="26" fill="#fcd34d"/>
  <text x="195" y="186" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="3" fill="#3b1a05">QUANT</text>
  <text x="60" y="300" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="700" fill="#f5f3ff">${esc(badge)}</text>
  ${tt}${st}
  <g opacity="0.95"><rect x="60" y="930" width="680" height="46" rx="8" fill="url(#rl)"/>
  ${Array.from({ length: 35 }, (_, i) => { const x = 60 + i * 19.4; const tall = i % 5 === 0; return `<line x1="${x.toFixed(1)}" y1="930" x2="${x.toFixed(1)}" y2="${tall ? 952 : 944}" stroke="#7a3410" stroke-width="${tall ? 2 : 1}"/>`; }).join('')}
  <circle cx="140" cy="880" r="26" fill="#22d3ee"/><rect x="230" y="854" width="52" height="52" rx="5" fill="#a78bfa"/><polygon points="360,906 388,854 416,906" fill="#34d399"/><circle cx="500" cy="880" r="24" fill="none" stroke="#fcd34d" stroke-width="7"/></g>
  <text x="740" y="1080" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="800" fill="#fcd34d">${esc(brand)}</text>
  <text x="60" y="1080" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#f5f3ff">Instant PDF · Fully Solved</text>
</svg>`;
}

(async () => {
  let n = 0;
  for (let i = 0; i < BOOKS.length; i++) {
    const [name, chap] = BOOKS[i];
    const svg = coverSVG({ kicker: 'CAT & MBA ENTRANCE  ·  QUANTITATIVE APTITUDE', badge: 'Chapter Tests',
      titleLines: wrap(name, 16), stats: ['150 CAT-pattern MCQs', '5 worksheets · answer keys', 'Step-by-step solutions'],
      brand: 'mathstudy.in', c1: PALETTE[i % PALETTE.length], c2: '#7c3aed' });
    const file = path.join(OUT, `cat-quant-${chap}-chapter-tests.jpg`);
    await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toFile(file);
    console.log('  ✓ ' + path.basename(file)); n++;
  }
  const psvg = coverSVG({ kicker: 'CAT & MBA ENTRANCE  ·  QUANTITATIVE APTITUDE', badge: '30 Practice Papers',
    titleLines: wrap('30 Full Practice Papers', 16), stats: ['900 MCQs · 30 papers', 'Balanced across all chapters', 'Answer keys + solutions'],
    brand: 'mathstudy.in', c1: '#831843', c2: '#3b0764' });
  await sharp(Buffer.from(psvg)).jpeg({ quality: 86 }).toFile(path.join(OUT, 'cat-quant-30-practice-papers.jpg'));
  console.log('  ✓ cat-quant-30-practice-papers.jpg'); n++;
  console.log(`\nGenerated ${n} covers into ${OUT}`);
})().catch(e => { console.error(e); process.exit(1); });
