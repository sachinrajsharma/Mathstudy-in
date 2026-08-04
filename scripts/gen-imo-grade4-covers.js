/**
 * gen-imo-grade4-covers.js — generates portrait JPG covers for the IMO Class 4
 * Maths chapter-test e-books + the 25 practice papers book, into
 * public/wp-content/uploads/. SVG -> JPG via sharp. Filenames match
 * seed-imo-grade4-chapter-tests.js.
 *   node scripts/gen-imo-grade4-covers.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'public', 'wp-content', 'uploads');
fs.mkdirSync(OUT, { recursive: true });

const PALETTE = ['#4338ca', '#2563eb', '#7c3aed', '#0d9488', '#db2777', '#ea580c', '#0ea5e9', '#6d28d9', '#0f766e', '#9333ea', '#1d4ed8'];
const INDIGO = '#312e81';

const BOOKS = [
  ['Numbers & Operations', 'numbers-and-operations'],
  ['Factors & Multiples', 'factors-and-multiples'],
  ['Fractions', 'fractions'],
  ['Decimals', 'decimals'],
  ['Money', 'money'],
  ['Measurement', 'measurement'],
  ['Time', 'time'],
  ['Geometry', 'geometry'],
  ['Perimeter & Area', 'perimeter-and-area'],
  ['Patterns', 'patterns'],
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
    `<text x="60" y="${startY + i * 74}" font-family="Segoe UI, Arial, sans-serif" font-size="${titleLines.length > 2 ? 52 : 64}" font-weight="800" fill="#ffffff">${esc(ln)}</text>`).join('');
  const statLines = stats.map((s, i) =>
    `<text x="60" y="${770 + i * 46}" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#eef2ff">${esc(s)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="med" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#f5a623"/></linearGradient>
    <linearGradient id="rl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#ff8c42"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="14" fill="url(#rl)"/>
  <text x="60" y="120" font-family="Segoe UI, Arial, sans-serif" font-size="25" letter-spacing="2" fill="#ffd166">${esc(kicker)}</text>
  <rect x="60" y="150" width="270" height="52" rx="26" fill="#ffd166"/>
  <text x="195" y="186" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="3" fill="#3b1a05">MATHEMATICS</text>
  <text x="60" y="300" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="700" fill="#eef2ff">${esc(badge)}</text>
  ${titleTs}
  ${statLines}
  <g opacity="0.97" transform="translate(0,70)">
    <path d="M636 852 l-22 -30 M700 852 l22 -30" stroke="#c0d0ff" stroke-width="9" stroke-linecap="round"/>
    <circle cx="668" cy="900" r="54" fill="url(#med)" stroke="#c8801a" stroke-width="4"/>
    <circle cx="668" cy="900" r="40" fill="none" stroke="#c8801a" stroke-width="2" opacity="0.6"/>
    <polygon points="668,868 678,896 708,896 684,914 693,944 668,926 643,944 652,914 628,896 658,896" fill="#ffffff" stroke="#c8801a" stroke-width="1"/>
    <circle cx="120" cy="880" r="26" fill="#06d6a0"/>
    <rect x="200" y="854" width="52" height="52" rx="6" fill="#38bdf8"/>
    <polygon points="330,906 358,854 386,906" fill="#f472b6"/>
    <text x="430" y="912" font-family="Segoe UI, Arial, sans-serif" font-size="52" font-weight="800" fill="#ffd166">4</text>
  </g>
  <text x="740" y="1080" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="800" fill="#ffd166">${esc(brand)}</text>
  <text x="60" y="1080" font-family="Segoe UI, Arial, sans-serif" font-size="24" fill="#eef2ff">Instant PDF · Fully Solved</text>
</svg>`;
}

(async () => {
  let n = 0;
  for (let i = 0; i < BOOKS.length; i++) {
    const [name, chap] = BOOKS[i];
    const svg = coverSVG({
      kicker: 'IMO · MATHS OLYMPIAD · CLASS 4',
      badge: 'Chapter Worksheets',
      titleLines: wrap(name, 15),
      stats: ['100 Olympiad-pattern MCQs', '10 worksheets · answer keys', 'Step-by-step solutions'],
      brand: 'mathstudy.in',
      c1: PALETTE[i % PALETTE.length], c2: INDIGO,
    });
    const file = path.join(OUT, `imo-class-4-maths-${chap}-chapter-tests.jpg`);
    await sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toFile(file);
    console.log('  ✓ ' + path.basename(file)); n++;
  }
  const psvg = coverSVG({
    kicker: 'IMO · MATHS OLYMPIAD · CLASS 4',
    badge: '25 Sample & Practice Papers',
    titleLines: wrap('25 Practice Papers', 15),
    stats: ['750 MCQs · 25 papers', 'Balanced across all chapters', 'Answer keys + solutions'],
    brand: 'mathstudy.in',
    c1: '#7c3aed', c2: INDIGO,
  });
  const pfile = path.join(OUT, 'imo-class-4-maths-25-practice-papers.jpg');
  await sharp(Buffer.from(psvg)).jpeg({ quality: 86 }).toFile(pfile);
  console.log('  ✓ ' + path.basename(pfile)); n++;
  console.log(`\nGenerated ${n} covers into ${OUT}`);
})().catch(e => { console.error(e); process.exit(1); });
