// scripts/migrate-approval.js
// Adds the columns needed for the WooCommerce-style manual payment-approval flow.
// Idempotent — safe to run repeatedly (checks before adding).
//   node scripts/migrate-approval.js
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mathstudy'
  });

  async function hasColumn(table, col) {
    const [r] = await pool.query(
      `SELECT COUNT(*) n FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`, [table, col]);
    return r[0].n > 0;
  }
  async function addColumn(table, col, ddl) {
    if (await hasColumn(table, col)) { console.log(`  = ${table}.${col} already exists`); return; }
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    console.log(`  + ${table}.${col} added`);
  }

  console.log('Migrating for payment-approval flow…');

  // Secure Google-Drive (or any) download link, stored server-side only.
  await addColumn('products', 'download_url', 'download_url VARCHAR(500) DEFAULT NULL');

  // Per-order secret that authorises the tap-to-approve/reject links sent to admin.
  await addColumn('orders', 'admin_token',   'admin_token VARCHAR(64) DEFAULT NULL');
  await addColumn('orders', 'approved_at',   'approved_at DATETIME DEFAULT NULL');
  await addColumn('orders', 'rejected_at',   'rejected_at DATETIME DEFAULT NULL');
  await addColumn('orders', 'customer_phone','customer_phone VARCHAR(25) DEFAULT NULL');
  await addColumn('orders', 'customer_note', 'customer_note VARCHAR(500) DEFAULT NULL');

  // Allow an explicit 'rejected' status (kept alongside the legacy 'failed').
  try {
    await pool.query(
      `ALTER TABLE orders MODIFY status ENUM('pending','paid','failed','rejected','refunded') DEFAULT 'pending'`);
    console.log('  ~ orders.status enum now includes "rejected"');
  } catch (e) { console.log('  ! status enum modify skipped:', e.code || e.message); }

  console.log('Done.');
  await pool.end();
  process.exit(0);
})().catch((e) => { console.error('Migration failed:', e); process.exit(1); });
