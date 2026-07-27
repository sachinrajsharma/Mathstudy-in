/**
 * migrate-price-lock.js
 *
 * Adds products.price_locked so a manually-set price (edited in the admin panel)
 * is never overwritten by the seed scripts on the next deploy / __setup__ run.
 * When price_locked=1 the seeds and the bulk repricer leave price & original_price
 * alone; when 0 (the default) they manage the price as before.
 *
 * Idempotent. Run: node scripts/migrate-price-lock.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mathstudy',
  });

  const [[col]] = await db.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'price_locked'`);

  if (col.n === 0) {
    await db.query(
      `ALTER TABLE products ADD COLUMN price_locked TINYINT(1) NOT NULL DEFAULT 0 AFTER original_price`);
    console.log('Added products.price_locked (default 0).');
  } else {
    console.log('products.price_locked already present — nothing to do.');
  }

  await db.end();
  process.exit(0);
})().catch((e) => { console.error('Migration failed:', e); process.exit(1); });
