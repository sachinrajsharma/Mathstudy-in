/**
 * fix-case-study-hub-links.js — repoint the 14 "Access now" buttons on the
 * "math-case-studies-class-12" hub post from the dead testing.mathstudy.in
 * WordPress URLs to the live case-study online-test pages, and scrub any
 * remaining testing.mathstudy.in references in that post.
 *
 * Idempotent: safe to re-run (already-fixed links are left as-is).
 * Runs after import-wp-blogs.js in setup-fresh so a fresh import is re-fixed.
 *   node scripts/fix-case-study-hub-links.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

// old WP slug (on testing.mathstudy.in) -> new on-site blog slug
const MAP = {
  'math-case-study-relation-and-functions-with-solutions-pdf': 'math-case-study-relations-and-functions-class-12',
  'math-case-studies-inverse-trigonometric-functions-with-solutions': 'math-case-study-inverse-trigonometric-functions-class-12',
  'math-case-studies-matrices-with-answers-pdf': 'math-case-study-matrices-class-12',
  'math-case-studies-determinants': 'math-case-study-determinants-class-12',
  'math-case-studies-continuity-and-differentiability-class-12': 'math-case-study-continuity-and-differentiability-class-12',
  'math-case-studies-applications-of-derivatives-class-12': 'math-case-study-application-of-derivatives-class-12',
  'integration-case-study-questions-class-12': 'math-case-study-integrals-class-12',
  'math-case-studies-definite-integration': 'math-case-study-definite-integration-class-12',
  'application-of-integrals-case-study-questions': 'math-case-study-application-of-integrals-class-12',
  'differential-equations-case-studies-questions': 'math-case-study-differential-equations-class-12',
  'vector-algebra-class-12-case-studies-questions': 'math-case-study-vector-algebra-class-12',
  'three-dimensional-geometry-class-12-case-studies': 'math-case-study-three-dimensional-geometry-class-12',
  'linear-programming-class-12-case-studies': 'math-case-study-linear-programming-class-12',
  'probability-class-12-case-studies-questions': 'math-case-study-probability-class-12',
};

(async () => {
  const conn = await mysql.createConnection(cfg);
  const [[row]] = await conn.query('SELECT id, content FROM blogs WHERE slug = ?', ['math-case-studies-class-12']);
  if (!row) { console.log('Hub post math-case-studies-class-12 not in DB — nothing to fix (it is fixed automatically once imported).'); await conn.end(); return; }
  let c = row.content, hits = 0;
  for (const [oldSlug, newSlug] of Object.entries(MAP)) {
    const re = new RegExp('https?://testing\\.mathstudy\\.in/' + oldSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/?', 'g');
    c = c.replace(re, () => { hits++; return '/blog/' + newSlug; });
  }
  // any stragglers: point the dead subdomain at the live site — both linked
  // URLs and bare text mentions ("…free on testing.mathstudy.in?")
  const extra = (c.match(/testing\.mathstudy\.in/g) || []).length;
  c = c.replace(/https?:\/\/testing\.mathstudy\.in/g, 'https://mathstudy.in');
  c = c.replace(/testing\.mathstudy\.in/g, 'mathstudy.in');
  if (hits || extra) {
    await conn.query('UPDATE blogs SET content = ? WHERE id = ?', [c, row.id]);
    console.log('Hub fixed — ' + hits + ' Access-now link(s) repointed, ' + extra + ' other testing.mathstudy.in reference(s) scrubbed.');
  } else {
    console.log('Hub already clean — nothing to change.');
  }
  await conn.end();
})().catch((e) => { console.error(e); process.exit(1); });
