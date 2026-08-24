/**
 * prune-bot-views.js
 *
 * Inspect and remove automated (bot/scraper) traffic from the page_views table
 * that feeds /admin/insights. Bots that spoof a real-browser User-Agent slip
 * past the UA filter in lib/tracking.js, and because they keep no cookies each
 * hit mints a brand-new visitor id — so one crawler shows up as hundreds of
 * "unique visitors" from one country (the Latvia spike, Aug 2026).
 *
 * Bot signature used here (all three must hold):
 *   - the visitor id appears EXACTLY ONCE in the whole table (cookie never
 *     came back — real browsers re-send it on every later page),
 *   - referrer is empty (no search engine / social source), and
 *   - kind='view' within the chosen window.
 *
 * Real one-page bounce visitors also match, so deletion is deliberately
 * scoped to ONE country at a time — only prune countries whose report line
 * shows an overwhelming (>80%) one-off-direct share.
 *
 * Usage:
 *   node scripts/prune-bot-views.js                      per-country report (last 60 days)
 *   node scripts/prune-bot-views.js --days 30            same, custom window
 *   node scripts/prune-bot-views.js --country LV         dry-run detail for one country
 *   node scripts/prune-bot-views.js --country LV --delete  actually delete matching rows
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1] : fallback;
}
const DAYS = parseInt(arg('days', '60'), 10) || 60;
const COUNTRY = (arg('country', '') || '').toUpperCase();
const DELETE = process.argv.includes('--delete');

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'mathstudy',
  });

  if (!COUNTRY) {
    // Report mode: rank countries by how bot-like their traffic looks.
    const [rows] = await db.query(
      `SELECT pv.country,
              COUNT(*) AS views,
              COUNT(DISTINCT pv.visitor) AS visitors,
              COUNT(DISTINCT CASE WHEN one.visitor IS NOT NULL AND pv.referrer=''
                                  THEN pv.visitor END) AS one_off_direct
         FROM page_views pv
         LEFT JOIN (SELECT visitor FROM page_views GROUP BY visitor HAVING COUNT(*) = 1) one
                ON one.visitor = pv.visitor
        WHERE pv.kind='view' AND pv.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY pv.country
        ORDER BY one_off_direct DESC, visitors DESC`, [DAYS]);
    console.log('Automated-traffic report, last ' + DAYS + ' days');
    console.log('(one-off direct = visitor ids seen exactly once ever, with no referrer)\n');
    console.log('country  visitors  views  one-off-direct  share   verdict');
    for (const r of rows) {
      const v = Number(r.visitors), o = Number(r.one_off_direct);
      const share = v ? o / v : 0;
      const verdict = v >= 20 && share > 0.8 ? '<< LIKELY BOTS'
        : v >= 20 && share > 0.5 ? 'suspicious' : '';
      console.log(
        String(r.country || '??').padEnd(7),
        String(v).padStart(9),
        String(r.views).padStart(6),
        String(o).padStart(15),
        (share * 100).toFixed(0).padStart(6) + '%',
        ' ' + verdict);
    }
    console.log('\nTo inspect one country:  node scripts/prune-bot-views.js --country XX');
    console.log('To delete its bot rows:  node scripts/prune-bot-views.js --country XX --delete');
    await db.end();
    return;
  }

  // Country mode: show exactly what the signature matches, then (opt) delete.
  const WHERE = `pv.kind='view' AND pv.country=? AND pv.referrer=''
     AND pv.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
     AND pv.visitor IN (SELECT visitor FROM (
           SELECT visitor FROM page_views GROUP BY visitor HAVING COUNT(*) = 1) x)`;

  const [[m]] = await db.query(
    `SELECT COUNT(*) AS rows_matched, COUNT(DISTINCT pv.visitor) AS visitors
       FROM page_views pv WHERE ${WHERE}`, [COUNTRY, DAYS]);
  const [[t]] = await db.query(
    `SELECT COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors FROM page_views
      WHERE kind='view' AND country=? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [COUNTRY, DAYS]);
  const [paths] = await db.query(
    `SELECT pv.path, COUNT(*) AS n FROM page_views pv WHERE ${WHERE}
      GROUP BY pv.path ORDER BY n DESC LIMIT 15`, [COUNTRY, DAYS]);

  console.log(COUNTRY + ', last ' + DAYS + ' days:');
  console.log('  total recorded:     ' + t.views + ' views / ' + t.visitors + ' visitors');
  console.log('  matching bot rows:  ' + m.rows_matched + ' views / ' + m.visitors + ' one-off visitors');
  console.log('\n  top paths in the matching rows:');
  for (const p of paths) console.log('    ' + String(p.n).padStart(5) + '  ' + p.path);

  if (!DELETE) {
    console.log('\nDry run — nothing deleted. Re-run with --delete to remove the ' +
      m.rows_matched + ' matching rows.');
  } else if (!Number(m.rows_matched)) {
    console.log('\nNothing matches — nothing to delete.');
  } else {
    const [res] = await db.query(
      `DELETE pv FROM page_views pv
        JOIN (SELECT visitor FROM page_views GROUP BY visitor HAVING COUNT(*) = 1) one
          ON one.visitor = pv.visitor
       WHERE pv.kind='view' AND pv.country=? AND pv.referrer=''
         AND pv.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [COUNTRY, DAYS]);
    console.log('\nDeleted ' + res.affectedRows + ' rows. /admin/insights now reflects human traffic for ' + COUNTRY + '.');
  }
  await db.end();
})().catch((e) => { console.error('prune-bot-views failed:', e.message); process.exit(1); });
