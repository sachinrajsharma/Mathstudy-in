// One-off: assign level-accurate CTA product to each legacy survivor.
require('dotenv').config();
const m = require('mysql2/promise');
const fs = require('fs');

const STOP = new Set('a an the of for to in on with and or class grade maths math mathematics cbse icse ncert worksheet worksheets workbook pdf printable free online test questions answers with book solution solutions guide practice'.split(/\s+/));
const words = s => [...new Set(String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter(w => w && w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)))];
const ORD = { first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10 };
const R = { xii:12,xi:11,x:10,ix:9,viii:8,vii:7,vi:6,v:5,iv:4,iii:3,ii:2,i:1 };
function lvl(s) {
  s = String(s || '').toLowerCase(); let mm;
  if (mm = s.match(/(class|grade)[ -]?(\d{1,2})\b/)) return +mm[2];
  if (mm = s.match(/\b(\d{1,2})(st|nd|rd|th)[ -]?grade\b/)) return +mm[1];
  if (mm = s.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)[ -]grade\b/)) return ORD[mm[1]];
  if (mm = s.match(/class[ -]?(xii|xi|ix|viii|vii|vi|iv|iii|ii|x|v|i)\b/)) return R[mm[1]];
  if (/\bjee\b/.test(s)) return 'jee'; if (/\bneet\b/.test(s)) return 'neet';
  if (/\bcat\b/.test(s)) return 'cat'; if (/\bsat\b/.test(s)) return 'sat';
  return null;
}
const jac = (a, b) => { const A = new Set(a), B = new Set(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i); };

(async () => {
  const c = await m.createConnection({ host: process.env.DB_HOST || 'localhost', port: +process.env.DB_PORT || 3306, user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || process.env.DB_PASS || '', database: process.env.DB_NAME || 'mathstudy' });
  const [prods] = await c.query('SELECT p.slug, p.title, cc.slug cat FROM products p LEFT JOIN categories cc ON cc.id=p.category_id WHERE p.is_published=1');
  await c.end();
  const P = prods.map(p => ({ slug: p.slug, lvl: lvl(p.title + ' ' + p.slug + ' ' + (p.cat || '')), w: words(p.title + ' ' + p.slug) }));
  function bestCta(item) {
    const il = lvl(item.title + ' ' + item.slug);
    const iw = words(item.title + ' ' + item.slug.replace(/-/g, ' '));
    let best = null, bs = 0;
    for (const p of P) {
      if (il != null && p.lvl != null && il !== p.lvl) continue; // same level required when both known
      let s = jac(iw, p.w); if (il != null && p.lvl === il) s += 0.15;
      if (s > bs) { bs = s; best = p; }
    }
    return bs >= 0.16 ? best.slug : null;
  }
  for (const f of ['data/legacy-fresh.json', 'data/legacy-overlay.json']) {
    const arr = JSON.parse(fs.readFileSync(f, 'utf8'));
    arr.forEach(it => { it.cta = bestCta(it); });
    fs.writeFileSync(f, JSON.stringify(arr, null, 2));
    console.log(f, '-> cta assigned:', arr.filter(x => x.cta).length, '/', arr.length);
  }
  console.log('\n=== FRESH wave 1 corrected CTAs ===');
  JSON.parse(fs.readFileSync('data/legacy-fresh.json', 'utf8')).slice(0, 8).forEach((q, i) => console.log((i + 1) + '. ' + q.slug + ' -> ' + (q.cta || '(none/generic)')));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
