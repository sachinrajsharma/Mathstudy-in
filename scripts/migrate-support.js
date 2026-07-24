/**
 * Creates the customer-support ticket tables + seed categories/templates.
 * Idempotent — the same schema is also ensured automatically on server boot,
 * so this script exists mainly for setup-fresh.js and manual runs.
 * Run: node scripts/migrate-support.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const support = require('../lib/support');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mathstudy',
  });
  await support.ensureSchema(pool);
  const [[{ c }]] = await pool.query('SELECT COUNT(*) c FROM support_categories');
  const [[{ t }]] = await pool.query('SELECT COUNT(*) t FROM support_templates');
  console.log(`Support schema ready — ${c} categories, ${t} reply templates.`);
  await pool.end();
})().catch(e => { console.error('migrate-support failed:', e.message); process.exit(1); });
