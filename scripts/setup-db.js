/**
 * MathStudy.in — Database setup script
 * Run once: node scripts/setup-db.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const cfg = {
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  multipleStatements: true
};

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

const SCHEMA = `
CREATE DATABASE IF NOT EXISTS \`mathstudy\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`mathstudy\`;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(180)  NOT NULL UNIQUE,
  password_hash VARCHAR(64)   NOT NULL,
  role          ENUM('user','admin','super_admin') DEFAULT 'user',
  is_active     TINYINT(1)    DEFAULT 1,
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Product categories
CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(140) NOT NULL UNIQUE,
  description TEXT,
  sort_order  INT DEFAULT 0
) ENGINE=InnoDB;

-- Products (ebooks)
CREATE TABLE IF NOT EXISTS products (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(220)   NOT NULL,
  slug            VARCHAR(240)   NOT NULL UNIQUE,
  description     TEXT,
  short_desc      VARCHAR(300),
  category_id     INT,
  price           DECIMAL(10,2)  NOT NULL,
  original_price  DECIMAL(10,2),
  cover_image     VARCHAR(300),
  pdf_file        VARCHAR(300),
  page_count      INT,
  grade           VARCHAR(50),
  board           VARCHAR(100),
  is_published    TINYINT(1)     DEFAULT 1,
  is_featured     TINYINT(1)     DEFAULT 0,
  meta_title      VARCHAR(70),
  meta_desc       VARCHAR(160),
  downloads       INT            DEFAULT 0,
  created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT            NOT NULL,
  total_amount    DECIMAL(10,2)  NOT NULL,
  payment_id      VARCHAR(100),
  status          ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
  created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT            NOT NULL,
  product_id  INT            NOT NULL,
  price       DECIMAL(10,2)  NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

-- Secure download tokens (expire 48h after order)
CREATE TABLE IF NOT EXISTS download_tokens (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  token       VARCHAR(64)    NOT NULL UNIQUE,
  user_id     INT            NOT NULL,
  product_id  INT            NOT NULL,
  order_id    INT            NOT NULL,
  expires_at  DATETIME       NOT NULL,
  used_count  INT            DEFAULT 0,
  max_uses    INT            DEFAULT 5,
  created_at  DATETIME       DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (order_id)   REFERENCES orders(id)
) ENGINE=InnoDB;

-- Blog posts (shared pattern from Vidara)
CREATE TABLE IF NOT EXISTS blogs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(220)  NOT NULL,
  slug        VARCHAR(240)  NOT NULL UNIQUE,
  content     LONGTEXT,
  excerpt     TEXT,
  cover_image VARCHAR(300),
  category    VARCHAR(100),
  author      VARCHAR(120)  DEFAULT 'MathStudy Editorial',
  meta_title  VARCHAR(70),
  meta_desc   VARCHAR(160),
  status      ENUM('draft','published') DEFAULT 'draft',
  views       INT           DEFAULT 0,
  created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
`;

const SEED_CATEGORIES = [
  { name: 'Grade 1 Math',         slug: 'grade-1-math',         sort: 1 },
  { name: 'Grade 2 Math',         slug: 'grade-2-math',         sort: 2 },
  { name: 'Grade 3 Math',         slug: 'grade-3-math',         sort: 3 },
  { name: 'Grade 4 Math',         slug: 'grade-4-math',         sort: 4 },
  { name: 'Grade 5 Math',         slug: 'grade-5-math',         sort: 5 },
  { name: 'Grade 6 Math',         slug: 'grade-6-math',         sort: 6 },
  { name: 'Grade 7 Math',         slug: 'grade-7-math',         sort: 7 },
  { name: 'Grade 8 Math',         slug: 'grade-8-math',         sort: 8 },
  { name: 'Class 9 Mathematics',  slug: 'class-9-mathematics',  sort: 9 },
  { name: 'Class 12 Mathematics', slug: 'class-12-mathematics', sort: 12 },
  { name: 'Case Studies Class 8', slug: 'case-studies-class-8', sort: 13 },
  { name: 'Case Studies Class 9', slug: 'case-studies-class-9', sort: 14 },
  { name: 'Case Studies Class 12',slug: 'case-studies-class-12',sort: 15 },
  { name: 'Competitive Exams',    slug: 'competitive-exams',    sort: 20 },
  { name: 'JEE Mathematics',      slug: 'jee-mathematics',      sort: 21 },
  { name: 'CUET Mathematics',     slug: 'cuet-mathematics',     sort: 22 },
];

async function run() {
  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection(cfg);

  console.log('Creating schema...');
  await conn.query(SCHEMA);

  console.log('Seeding categories...');
  for (const cat of SEED_CATEGORIES) {
    await conn.query(
      `INSERT IGNORE INTO mathstudy.categories (name, slug, sort_order) VALUES (?,?,?)`,
      [cat.name, cat.slug, cat.sort]
    );
  }

  console.log('Creating admin user...');
  const adminEmail = process.env.ADMIN_EMAIL || 'udgamsachin@gmail.com';
  const adminPass  = sha256('Admin@mathstudy2026');
  await conn.query(`
    INSERT IGNORE INTO mathstudy.users (name, email, password_hash, role)
    VALUES ('Sachin', ?, ?, 'super_admin')
  `, [adminEmail, adminPass]);

  console.log('Done.');
  console.log('Admin credentials:');
  console.log('  Email:', adminEmail);
  console.log('  Password: Admin@mathstudy2026');
  console.log('  (Change this immediately after first login)');

  await conn.end();
}

run().catch(e => { console.error(e); process.exit(1); });
