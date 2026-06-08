/**
 * MathStudy.in — set/reset a user's password (bcrypt).
 * Usage:  node scripts/set-password.js <email> "<new-password>"
 * Example: node scripts/set-password.js udgamsachin@gmail.com "MyNewPass123"
 *
 * Works on any environment — reads DB creds from .env (or local defaults).
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const password = require('../lib/password');

(async () => {
  const email = (process.argv[2] || '').toLowerCase().trim();
  const plain = process.argv[3];
  if (!email || !plain) {
    console.error('Usage: node scripts/set-password.js <email> "<new-password>"');
    process.exit(1);
  }
  if (plain.length < 8) { console.error('Password must be at least 8 characters.'); process.exit(1); }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mathstudy'
  });
  try {
    const hash = await password.hash(plain);
    const [r] = await conn.query('UPDATE users SET password_hash = ?, is_active = 1 WHERE email = ?', [hash, email]);
    if (r.affectedRows === 0) { console.error('No user found with email:', email); process.exit(2); }
    const [[u]] = await conn.query('SELECT email, role, is_active FROM users WHERE email = ?', [email]);
    console.log('Password updated.');
    console.log('  Email :', u.email);
    console.log('  Role  :', u.role, u.role === 'user' ? '(note: not an admin)' : '');
    console.log('  Active:', u.is_active);
    console.log('Log in at /auth/login then open /admin');
  } finally { await conn.end(); }
})().catch(e => { console.error(e); process.exit(1); });
