// lib/tracking.js — first-party, privacy-friendly visitor tracking.
//
// Server-side page-view logging: no client JS, no third-party service, nothing
// blocked by ad-blockers or the CSP. Every qualifying request writes ONE row to
// page_views (fire-and-forget — tracking must never slow down or break a page).
//
// Privacy model (keep the privacy policy in sync with this):
//   - Visitors are identified only by a random first-party cookie ("msv") —
//     no IP address, no fingerprinting, no PII is ever stored.
//   - The IP is looked up ONCE, offline, to derive a 2-letter country code;
//     the IP itself is never written anywhere.
//   - Referrers are reduced to the external hostname only (never full URLs).
//   - Known bots / link-preview fetchers are not recorded at all.
//   - Raw rows older than 2 years are pruned on boot.

const crypto = require('crypto');
// Offline country lookup (no external service, no IP ever stored — only the
// resulting 2-letter country code is written to page_views.country).
let geoip = null;
try { geoip = require('geoip-country'); } catch (e) { console.warn('[tracking] geoip-country not installed — country column stays empty'); }

const VISITOR_COOKIE = 'msv';

// Bots, crawlers and link-preview fetchers — not humans, never recorded.
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|skypeuripreview|preview|curl|wget|python|axios|node-fetch|go-http|headless|lighthouse|pagespeed|pingdom|uptime|monitor|scanner|scrapy|phantomjs|puppeteer|playwright|selenium|webdriver|okhttp|libwww|httpclient|winhttp|java\/|dataforseo|ahrefs|semrush|mj12|dotbot|petalbot|bytespider|amazonbot|censys|zgrab|masscan|nuclei|nmap|dataprovider|siteaudit/i;

// Scrapers that spoof a real-browser User-Agent still tend to skip headers
// every actual browser always sends. A page navigation without an
// Accept-Language, or whose Accept header never mentions text/html, is
// automated traffic (this is what made "visitors" from datacenter countries
// like Latvia balloon — spoofed-UA bots with no cookie jar minted a fresh
// visitor id on every single hit).
function looksAutomated(req) {
  if (!req.headers['accept-language']) return true;
  if (req.method === 'GET') {
    const accept = req.headers.accept || '';
    if (accept && !accept.includes('text/html') && !accept.includes('*/*')) return true;
  }
  return false;
}

async function ensureSchema(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS page_views (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    kind       VARCHAR(16)  NOT NULL DEFAULT 'view',   -- view | cart_add | checkout | download
    page_type  VARCHAR(24)  NOT NULL DEFAULT 'other',  -- home | shop | category | product | blog_index | blog | article | cart | page | account | event
    slug       VARCHAR(255) NOT NULL DEFAULT '',       -- product/blog slug (or product id for cart_add)
    path       VARCHAR(512) NOT NULL DEFAULT '',
    visitor    CHAR(24)     NOT NULL DEFAULT '',       -- random anonymous cookie id
    user_id    INT          NULL,                      -- only when logged in
    referrer   VARCHAR(255) NOT NULL DEFAULT '',       -- external hostname only, '' = direct/internal
    device     VARCHAR(12)  NOT NULL DEFAULT 'desktop',
    country    CHAR(2)      NOT NULL DEFAULT '',        -- ISO-3166 alpha-2 from offline GeoIP ('' = unknown/local)
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_created (created_at),
    KEY idx_type_slug (page_type, slug),
    KEY idx_kind (kind, created_at),
    KEY idx_visitor (visitor, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  // The slug column joins against products.slug AND blogs.slug, and the '='
  // dies with "Illegal mix of collations" unless all three agree. The right
  // collation differs per server (utf8mb4_unicode_ci on the dev MySQL,
  // utf8mb4_uca1400_ai_ci on the MariaDB 11 host, utf8mb4_0900_ai_ci on
  // stock MySQL 8) — and tables created in different eras of the same host
  // can disagree with each other (products vs blogs on the live server).
  // So: read the COLUMN collation products.slug actually uses on THIS
  // server, and converge both page_views and blogs to it on every boot.
  const slugCollation = async (table) => {
    const [[r]] = await pool.query(
      `SELECT collation_name AS c FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = ? AND column_name = 'slug'`, [table]);
    return (r && r.c) || null;
  };
  const want = await slugCollation('products') || 'utf8mb4_unicode_ci';
  const charset = want.split('_')[0]; // e.g. utf8mb4_uca1400_ai_ci -> utf8mb4
  for (const table of ['page_views', 'blogs']) {
    const have = await slugCollation(table);
    if (have && have !== want) {
      await pool.query(`ALTER TABLE ${table} CONVERT TO CHARACTER SET ${charset} COLLATE ${want}`);
      console.log('[tracking] ' + table + ' collation converted ' + have + ' -> ' + want);
    }
  }
  // Migration: country column for installs created before geo tracking.
  const [[hasCountry]] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'page_views' AND column_name = 'country'`);
  if (!Number(hasCountry.n)) {
    await pool.query(`ALTER TABLE page_views ADD COLUMN country CHAR(2) NOT NULL DEFAULT '' AFTER device, ADD KEY idx_country (country, created_at)`);
    console.log('[tracking] page_views.country column added');
  }
  // Retention: keep raw rows for 2 years, then drop (aggregates stay accurate
  // for the window the dashboard actually shows).
  await pool.query(`DELETE FROM page_views WHERE created_at < DATE_SUB(NOW(), INTERVAL 730 DAY)`)
    .catch(function () {});
}

// Map a public GET path to what the visitor was looking at.
// Returns null for anything we do not want to record (admin, auth, assets…).
function classify(path) {
  if (path === '/') return { page_type: 'home', slug: '' };
  if (path === '/shop' || path === '/shop/case-studies') return { page_type: 'shop', slug: '' };
  let m;
  if ((m = path.match(/^\/shop\/category\/([^/]+)\/?$/)))  return { page_type: 'category', slug: decodeURIComponent(m[1]) };
  if ((m = path.match(/^\/shop\/product\/([^/]+)\/?$/)))   return { page_type: 'product',  slug: decodeURIComponent(m[1]) };
  if (path === '/blog') return { page_type: 'blog_index', slug: '' };
  if ((m = path.match(/^\/blog\/([^/]+)\/?$/)))            return { page_type: 'blog',     slug: decodeURIComponent(m[1]) };
  if (path === '/cart') return { page_type: 'cart', slug: '' };
  if (path === '/dashboard') return { page_type: 'account', slug: '' };
  if (['/contact', '/about', '/privacy-policy', '/terms'].includes(path)) return { page_type: 'page', slug: path.slice(1) };
  // Legacy WordPress-era article URLs live at the root: /some-blog-slug.
  // Junk slugs never join back to the blogs table, so they naturally drop
  // out of every "top blogs" list — no need to validate here.
  if ((m = path.match(/^\/([a-z0-9][a-z0-9-]{2,})\/?$/))) return { page_type: 'article', slug: m[1] };
  return null;
}

function readVisitorCookie(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + VISITOR_COOKIE + '=([a-f0-9]{24})(?:;|$)'));
  return m ? m[1] : null;
}

// External referrer hostname only ('' for direct visits and internal navigation).
function referrerHost(req) {
  try {
    const ref = req.headers.referer || req.headers.referrer || '';
    if (!ref) return '';
    const host = new URL(ref).hostname.toLowerCase();
    const own = (process.env.BASE_URL || 'https://mathstudy.in').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!host || host === own || host === 'www.' + own || host === 'localhost' || host === '127.0.0.1') return '';
    return host.slice(0, 255);
  } catch (e) { return ''; }
}

// 2-letter country code for the request IP, '' when unknown (localhost, private
// ranges, lookup failure). The IP is used here and then discarded.
function countryOf(req) {
  if (!geoip) return '';
  try {
    let ip = req.ip || '';
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);
    const hit = geoip.lookup(ip);
    return hit && hit.country ? String(hit.country).slice(0, 2).toUpperCase() : '';
  } catch (e) { return ''; }
}

function deviceOf(ua) {
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}

// Express middleware. Mount AFTER session + static + body parsing, BEFORE routes.
function middleware(pool) {
  return function track(req, res, next) {
    try {
      const ua = req.headers['user-agent'] || '';
      if (!ua || BOT_RE.test(ua) || looksAutomated(req)) return next();

      let hit = null;
      if (req.method === 'GET') {
        const c = classify(req.path);
        if (c) hit = { kind: 'view', ...c };
        else if (/^\/download\/[^/]+$/.test(req.path)) hit = { kind: 'download', page_type: 'event', slug: '' };
      } else if (req.method === 'POST') {
        if (req.path === '/cart/add')
          hit = { kind: 'cart_add', page_type: 'event', slug: String((req.body && req.body.product_id) || '').slice(0, 32) };
        else if (req.path === '/checkout/upi-confirm')
          hit = { kind: 'checkout', page_type: 'event', slug: '' };
      }
      if (!hit) return next();

      // Anonymous visitor id: reuse the cookie if present, mint one otherwise.
      let visitor = readVisitorCookie(req);
      if (!visitor) {
        visitor = crypto.randomBytes(12).toString('hex');
        res.cookie(VISITOR_COOKIE, visitor, {
          httpOnly: true, sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 730 * 24 * 60 * 60 * 1000
        });
      }

      pool.query(
        `INSERT INTO page_views (kind, page_type, slug, path, visitor, user_id, referrer, device, country)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [hit.kind, hit.page_type, hit.slug, req.path.slice(0, 512), visitor,
         (req.session && req.session.user && req.session.user.id) || null,
         referrerHost(req), deviceOf(ua), countryOf(req)]
      ).catch(function (e) {
        // Never let tracking break the site — one line in the log and move on.
        if (!/doesn't exist/i.test(e.message)) console.error('[tracking]', e.message);
      });
    } catch (e) { /* tracking must never throw into the request pipeline */ }
    next();
  };
}

module.exports = { ensureSchema, middleware, classify, countryOf, VISITOR_COOKIE };
