/**
 * Import legacy WordPress posts into the Node `blogs` table at their ORIGINAL slugs.
 * Source: data/wp-import/blogs.json (437 posts extracted from the WP dump).
 * - Rewrites dead media URLs (testing/www.mathstudy.in/wp-content/uploads → /wp-content/uploads
 *   served locally from public/wp-content/uploads).
 * - Strips Gutenberg block comments.
 * - INSERT IGNORE on slug: never clobbers an existing curated post.
 * Run: node scripts/import-wp-blogs.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

// Make every media reference resolve to the locally-hosted /wp-content/uploads.
function localiseMedia(html) {
  return String(html || '')
    .replace(/https?:\/\/(?:www\.|testing\.)?mathstudy\.in\/wp-content\/uploads\//gi, '/wp-content/uploads/')
    .replace(/<!--\s*\/?wp:[^>]*-->/g, '');   // drop Gutenberg block comments
}
const cut = (s, n) => { s = String(s || '').trim(); return s.length > n ? s.slice(0, n - 1).trim() : s; };

async function run() {
  const blogs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'wp-import', 'blogs.json'), 'utf8'));
  console.log('Connecting to MySQL (' + cfg.database + ')...');
  const conn = await mysql.createConnection(cfg);

  let inserted = 0, skipped = 0, bad = 0;
  for (const b of blogs) {
    if (!b.slug || !b.title) { bad++; continue; }
    const content = localiseMedia(b.content);
    const cover = b.coverImage ? localiseMedia(b.coverImage) : null;
    try {
      const [r] = await conn.query(
        `INSERT IGNORE INTO blogs (title, slug, content, excerpt, cover_image, category, author, meta_title, meta_desc, status)
         VALUES (?,?,?,?,?,?,?,?,?, 'published')`,
        [cut(b.title, 220), b.slug, content, cut(b.excerpt, 1000), cover, cut(b.category, 100) || null,
         'MathStudy Editorial', cut(b.metaTitle || b.title, 70), cut(b.metaDesc, 160)]
      );
      if (r.affectedRows > 0) inserted++; else skipped++;
    } catch (e) { console.error('  ! ' + b.slug + ': ' + e.message); bad++; }
  }

  const [[{ n }]] = await conn.query(`SELECT COUNT(*) n FROM blogs WHERE status='published'`);
  console.log('\nDone. inserted ' + inserted + ', skipped(existing slug) ' + skipped + ', errors ' + bad);
  console.log('Total published blogs now: ' + n);
  await conn.end();
}
run().catch(e => { console.error(e); process.exit(1); });
