/**
 * Repoint product cover images from the dead WP CDN (mathstudy.in/wp-content/uploads,
 * now 404) to the locally-hosted /wp-content/uploads served by this app.
 * Run: node scripts/fix-product-covers.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const cfg = {
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root', password: process.env.DB_PASS || '', database: process.env.DB_NAME || 'mathstudy',
};
const local = (u) => String(u || '').replace(/https?:\/\/(?:www\.|testing\.)?mathstudy\.in\/wp-content\/uploads\//gi, '/wp-content/uploads/');

async function run() {
  const conn = await mysql.createConnection(cfg);
  const [rows] = await conn.query(`SELECT id, cover_image FROM products WHERE cover_image LIKE '%mathstudy.in/wp-content/uploads/%'`);
  let n = 0;
  for (const r of rows) { await conn.query(`UPDATE products SET cover_image=? WHERE id=?`, [local(r.cover_image), r.id]); n++; }
  // blogs too (in case any imported row kept an absolute URL)
  const [b] = await conn.query(`SELECT id, cover_image FROM blogs WHERE cover_image LIKE '%mathstudy.in/wp-content/uploads/%'`);
  for (const r of b) { await conn.query(`UPDATE blogs SET cover_image=? WHERE id=?`, [local(r.cover_image), r.id]); n++; }
  console.log('Repointed ' + n + ' cover images to local /wp-content/uploads.');
  await conn.end();
}
run().catch(e => { console.error(e); process.exit(1); });
