// scripts/migrate-sales.js — schema for reviews (⭐ rich snippets) + bundles.
// Idempotent.  node scripts/migrate-sales.js
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASS || '', database: process.env.DB_NAME || 'mathstudy'
  });
  const hasCol = async (t, c) => (await db.query(
    `SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?`, [t, c]))[0][0].n > 0;

  await db.query(`CREATE TABLE IF NOT EXISTS product_reviews (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    product_id  INT NOT NULL,
    user_id     INT DEFAULT NULL,
    author_name VARCHAR(120) NOT NULL,
    rating      TINYINT NOT NULL,
    title       VARCHAR(160) DEFAULT NULL,
    body        TEXT DEFAULT NULL,
    status      ENUM('approved','pending') NOT NULL DEFAULT 'approved',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pr_product (product_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  console.log('  ✓ product_reviews table ready');

  // A bundle product lists the IDs of the e-books it includes.
  if (!(await hasCol('products', 'bundle_items'))) {
    await db.query(`ALTER TABLE products ADD COLUMN bundle_items JSON DEFAULT NULL`);
    console.log('  + products.bundle_items added');
  } else console.log('  = products.bundle_items already exists');

  console.log('Done.');
  await db.end(); process.exit(0);
})().catch((e) => { console.error('Migration failed:', e); process.exit(1); });
