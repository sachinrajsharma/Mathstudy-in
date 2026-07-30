/**
 * export-blogs-for-audit.js — RUN THIS ON THE PRODUCTION SERVER.
 *
 *   node scripts/export-blogs-for-audit.js
 *
 * Dumps every row of the `blogs` table to data/blogs-export.json so the SEO audit
 * (scripts/audit-blog-intents.js) can analyse the live 441 posts for duplicate
 * intent, thin content, missing meta, and CTA opportunities. Also dumps the
 * published product catalogue (slug + title + category) so each blog can be matched
 * to the most relevant e-book for its CTA.
 *
 * Commit the resulting data/blogs-export.json and push, so it can be pulled and
 * analysed. It contains only public blog content (nothing secret).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

(async () => {
  const c = await mysql.createConnection(cfg);
  const [blogs] = await c.query(
    `SELECT id, slug, title, meta_title, meta_desc, excerpt, category, status,
            cover_image, cta_product_slug,
            (quiz_json IS NOT NULL) AS has_quiz, (faq_json IS NOT NULL) AS has_faq,
            views, created_at, updated_at, content
       FROM blogs ORDER BY id`);
  const [products] = await c.query(
    `SELECT p.slug, p.title, p.price, p.original_price, c.slug AS category_slug, c.name AS category_name
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_published = 1 ORDER BY p.id`);

  // Add a cheap word count + content-format flag per blog for the audit.
  const enriched = blogs.map(b => {
    const txt = String(b.content || '').replace(/<[^>]+>/g, ' ');
    const words = txt.split(/\s+/).filter(Boolean).length;
    const isHtml = /^\s*</.test(String(b.content || '').trim());
    return { ...b, has_quiz: !!b.has_quiz, has_faq: !!b.has_faq, word_count: words, content_format: isHtml ? 'html' : 'markdown' };
  });

  const out = { exported_at: new Date().toISOString(), blog_count: enriched.length, product_count: products.length, blogs: enriched, products };
  const file = path.join(__dirname, '..', 'data', 'blogs-export.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log('Wrote', file);
  console.log('blogs:', enriched.length, '| products:', products.length);
  console.log('blogs without quiz:', enriched.filter(b => !b.has_quiz).length,
              '| without CTA:', enriched.filter(b => !b.cta_product_slug).length,
              '| markdown (not SSR):', enriched.filter(b => b.content_format === 'markdown').length,
              '| thin (<600 words):', enriched.filter(b => b.word_count < 600).length);
  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
