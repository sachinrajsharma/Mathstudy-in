/**
 * Scrub injected spam links (astrologyforum.net etc.) from the LIVE blogs table.
 * Safe + idempotent — run any time (e.g. via setup-fresh or /__setup__).
 * Run: node scripts/clean-spam-links.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { cleanSpam, countSpam } = require('./spam-clean.js');

const cfg = {
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root', password: process.env.DB_PASS || '', database: process.env.DB_NAME || 'mathstudy',
};

async function run() {
  const db = await mysql.createConnection(cfg);
  const [rows] = await db.query('SELECT id, content, excerpt, meta_desc FROM blogs');
  let changed = 0, removed = 0;
  for (const r of rows) {
    const before = countSpam(r.content) + countSpam(r.excerpt) + countSpam(r.meta_desc);
    if (before === 0) continue;
    await db.query('UPDATE blogs SET content=?, excerpt=?, meta_desc=? WHERE id=?',
      [cleanSpam(r.content), cleanSpam(r.excerpt), cleanSpam(r.meta_desc), r.id]);
    changed++; removed += before;
  }
  console.log('Spam scrub: cleaned ' + changed + ' blog(s), removed ' + removed + ' spam link(s).');
  await db.end();
}
run().catch((e) => { console.error('clean-spam-links failed:', e.message); process.exit(1); });
