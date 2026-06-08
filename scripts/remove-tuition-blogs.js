/**
 * MathStudy.in — remove the legacy Home-Tuition (Gurgaon) blog posts.
 * Idempotent. Run once on any environment that was seeded with the old
 * tuition content:  node scripts/remove-tuition-blogs.js
 *
 * The tuition seeder (scripts/seed-tuition-blogs.js) has been removed, so a
 * fresh DB will never have these. This cleans up existing/staging databases.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const CATEGORY = 'Home Tuition Gurgaon';

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mathstudy'
  });
  try {
    const [rows] = await conn.query('SELECT id,slug FROM blogs WHERE category = ?', [CATEGORY]);
    if (!rows.length) { console.log('No tuition blog posts found — nothing to remove.'); return; }
    const [res] = await conn.query('DELETE FROM blogs WHERE category = ?', [CATEGORY]);
    console.log(`Removed ${res.affectedRows} tuition blog post(s):`);
    rows.forEach(r => console.log('  - ' + r.slug));
  } finally {
    await conn.end();
  }
})().catch(e => { console.error(e); process.exit(1); });
