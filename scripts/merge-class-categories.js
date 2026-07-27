/**
 * merge-class-categories.js
 *
 * Consolidates the shop so every numbered class shows as ONE "Grade N Math"
 * category holding all of that class's e-books (worksheets + case studies +
 * anything else), instead of separate "Grade N Math" and "Case Studies Class N"
 * tiles. JEE / CUET / Competitive are left untouched (not grade-numbered).
 *
 * For each class it ensures a canonical `grade-N-math` category named "Grade N
 * Math" exists, then moves every product from the source categories into it.
 * The now-empty source categories stay in the DB but drop off the homepage
 * (which only lists stocked categories) and 301-redirect to the merged category
 * via CATEGORY_MOVED in server.js.
 *
 * Idempotent — safe to re-run; a second run moves 0 products.
 *
 *   node scripts/merge-class-categories.js            (apply)
 *   node scripts/merge-class-categories.js --dry-run  (report only)
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

// target = canonical per-class category; sources = categories whose products
// move into the target. sort = homepage order.
const MERGES = [
  { target: 'grade-5-math',  name: 'Grade 5 Math',  sort: 5,  sources: ['case-studies-class-5'] },
  { target: 'grade-6-math',  name: 'Grade 6 Math',  sort: 6,  sources: ['case-studies-class-6'] },
  { target: 'grade-7-math',  name: 'Grade 7 Math',  sort: 7,  sources: ['case-studies-class-7'] },
  { target: 'grade-8-math',  name: 'Grade 8 Math',  sort: 8,  sources: ['case-studies-class-8'] },
  { target: 'grade-9-math',  name: 'Grade 9 Math',  sort: 9,  sources: ['class-9-mathematics', 'case-studies-class-9'] },
  { target: 'grade-12-math', name: 'Grade 12 Math', sort: 12, sources: ['class-12-mathematics', 'case-studies-class-12'] },
];

async function ensureCategory(conn, slug, name, sort, dry) {
  const [[cat]] = await conn.query('SELECT id,name,sort_order FROM categories WHERE slug=?', [slug]);
  if (cat) {
    if (!dry && (cat.name !== name || cat.sort_order !== sort)) {
      await conn.query('UPDATE categories SET name=?,sort_order=? WHERE id=?', [name, sort, cat.id]);
    }
    return cat.id;
  }
  if (dry) { console.log(`  would CREATE category ${slug} ("${name}")`); return -1; }
  const [r] = await conn.query('INSERT INTO categories (name,slug,sort_order) VALUES (?,?,?)', [name, slug, sort]);
  console.log(`  created category ${slug} ("${name}") -> id ${r.insertId}`);
  return r.insertId;
}

async function run() {
  const dry = process.argv.includes('--dry-run');
  const conn = await mysql.createConnection(cfg);
  let totalMoved = 0;

  for (const m of MERGES) {
    const targetId = await ensureCategory(conn, m.target, m.name, m.sort, dry);
    for (const src of m.sources) {
      const [[s]] = await conn.query('SELECT id FROM categories WHERE slug=?', [src]);
      if (!s) { console.log(`  (skip: source ${src} not found)`); continue; }
      if (s.id === targetId) continue;
      const [[{ n }]] = await conn.query(
        'SELECT COUNT(*) n FROM products WHERE category_id=?', [s.id]);
      if (dry) { console.log(`  would move ${n} product(s): ${src} -> ${m.target}`); totalMoved += n; continue; }
      if (n > 0) {
        await conn.query('UPDATE products SET category_id=? WHERE category_id=?', [targetId, s.id]);
        console.log(`  moved ${n} product(s): ${src} -> ${m.target}`);
        totalMoved += n;
      }
    }
    const [[{ tot }]] = await conn.query(
      'SELECT COUNT(*) tot FROM products p JOIN categories c ON c.id=p.category_id WHERE c.slug=? AND p.is_published=1',
      [m.target]);
    console.log(`  => "${m.name}" now holds ${tot} published product(s)\n`);
  }

  console.log((dry ? 'DRY RUN — ' : '') + `Done. ${totalMoved} product(s) ${dry ? 'would move' : 'moved'}.`);
  await conn.end();
}

run().catch((e) => { console.error(e); process.exit(1); });
