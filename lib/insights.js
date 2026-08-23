// lib/insights.js — visitor-behaviour analytics for /admin/insights.
//
// Reads the first-party page_views table written by lib/tracking.js and joins
// it back to products / blogs / orders, so the dashboard can answer the
// questions sales analytics cannot: who is visiting, which e-books they LOOK
// at (not just buy), which blogs they actually read, where traffic comes from,
// and how browsing converts into purchases.
//
// Every figure here is honest first-party data — no estimates, no third-party
// numbers — so the "Impact snapshot" block can be shown to donors/CSR partners
// as-is (see the relevance-stats rule: cite real, verifiable figures only).

// All range-based helpers take `days` and only look at kind='view' rows unless
// they are explicitly about events (cart adds, checkouts, downloads).

async function summary(pool, days) {
  const [[all]] = await pool.query(
    `SELECT COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors, MIN(created_at) AS since
       FROM page_views WHERE kind='view'`);
  const [[range]] = await pool.query(
    `SELECT COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors,
            SUM(page_type='product') AS product_views,
            SUM(page_type IN ('blog','article')) AS blog_views,
            COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN visitor END) AS logged_in
       FROM page_views WHERE kind='view' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [days]);
  const [[today]] = await pool.query(
    `SELECT COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
       FROM page_views WHERE kind='view' AND created_at >= CURDATE()`);
  return {
    since: all.since,
    allViews: Number(all.views), allVisitors: Number(all.visitors),
    views: Number(range.views), visitors: Number(range.visitors),
    productViews: Number(range.product_views || 0), blogViews: Number(range.blog_views || 0),
    loggedIn: Number(range.logged_in || 0),
    todayViews: Number(today.views), todayVisitors: Number(today.visitors),
  };
}

// One row per calendar day over the window, zero-padded so quiet days show.
async function daily(pool, days) {
  const [rows] = await pool.query(
    `SELECT DATE(created_at) AS d, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors,
            SUM(page_type='product') AS product_views,
            SUM(page_type IN ('blog','article')) AS blog_views
       FROM page_views WHERE kind='view' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY d ORDER BY d`, [days - 1]);
  const map = new Map(rows.map((r) => [new Date(r.d).toISOString().slice(0, 10), r]));
  const out = [];
  const start = new Date(); start.setDate(start.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const r = map.get(key);
    out.push({
      day: key,
      views: r ? Number(r.views) : 0,
      visitors: r ? Number(r.visitors) : 0,
      product_views: r ? Number(r.product_views || 0) : 0,
      blog_views: r ? Number(r.blog_views || 0) : 0,
    });
  }
  return out;
}

// Unique visitors per calendar month (the donor "reach" growth chart).
async function monthlyReach(pool, monthsBack) {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(created_at,'%Y-%m') AS ym,
            COUNT(DISTINCT visitor) AS visitors, COUNT(*) AS views
       FROM page_views WHERE kind='view'
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY ym ORDER BY ym`, [monthsBack]);
  return rows.map((r) => ({ ym: r.ym, visitors: Number(r.visitors), views: Number(r.views) }));
}

// Which e-books do visitors actually LOOK at — and does looking convert to
// buying? Joins views to paid sales in the same window per product.
async function topProducts(pool, days, limit) {
  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.slug, p.price, p.is_published,
            v.views, v.viewers,
            COALESCE(s.units, 0) AS units_sold
       FROM (SELECT slug, COUNT(*) AS views, COUNT(DISTINCT visitor) AS viewers
               FROM page_views
              WHERE kind='view' AND page_type='product'
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
              GROUP BY slug) v
       JOIN products p ON p.slug = v.slug
       LEFT JOIN (SELECT oi.product_id, COUNT(*) AS units
                    FROM order_items oi JOIN orders o ON o.id = oi.order_id
                   WHERE o.status='paid' AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                   GROUP BY oi.product_id) s ON s.product_id = p.id
      ORDER BY v.views DESC, v.viewers DESC
      LIMIT ?`, [days, days, limit]);
  rows.forEach((r) => {
    r.views = Number(r.views); r.viewers = Number(r.viewers); r.units_sold = Number(r.units_sold);
    r.conversion = r.viewers ? (r.units_sold / r.viewers) * 100 : 0;
  });
  return rows;
}

// Which blog posts are actually read. Matches both /blog/:slug and the legacy
// root /:slug URLs; the join to blogs filters out junk root paths. all_time
// is the blogs.views counter, which pre-dates this tracking system.
async function topBlogs(pool, days, limit) {
  const [rows] = await pool.query(
    `SELECT b.id, b.title, b.slug, b.status, b.views AS all_time,
            v.views, v.readers
       FROM (SELECT slug, COUNT(*) AS views, COUNT(DISTINCT visitor) AS readers
               FROM page_views
              WHERE kind='view' AND page_type IN ('blog','article')
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
              GROUP BY slug) v
       JOIN blogs b ON b.slug = v.slug
      ORDER BY v.views DESC, v.readers DESC
      LIMIT ?`, [days, limit]);
  rows.forEach((r) => { r.views = Number(r.views); r.readers = Number(r.readers); r.all_time = Number(r.all_time); });
  return rows;
}

// External traffic sources, bucketed into names a human recognises.
function bucketReferrer(host) {
  if (!host) return 'Direct / typed';
  if (/google\./.test(host)) return 'Google';
  if (/bing\./.test(host)) return 'Bing';
  if (/duckduckgo|yahoo|yandex|baidu/.test(host)) return 'Other search';
  if (/facebook|fb\.com|instagram/.test(host)) return 'Facebook / Instagram';
  if (/whatsapp/.test(host)) return 'WhatsApp';
  if (/youtube|youtu\.be/.test(host)) return 'YouTube';
  if (/t\.co|twitter|x\.com/.test(host)) return 'X (Twitter)';
  if (/linkedin/.test(host)) return 'LinkedIn';
  if (/telegram|t\.me/.test(host)) return 'Telegram';
  return host;
}

async function referrers(pool, days, limit) {
  const [rows] = await pool.query(
    `SELECT referrer, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
       FROM page_views WHERE kind='view' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY referrer`, [days]);
  const buckets = new Map();
  rows.forEach((r) => {
    const name = bucketReferrer(r.referrer);
    const b = buckets.get(name) || { source: name, views: 0, visitors: 0 };
    b.views += Number(r.views); b.visitors += Number(r.visitors);
    buckets.set(name, b);
  });
  const out = [...buckets.values()].sort((a, b) => b.views - a.views);
  const total = out.reduce((s, r) => s + r.views, 0);
  out.forEach((r) => { r.share = total ? (r.views / total) * 100 : 0; });
  return out.slice(0, limit);
}

async function devices(pool, days) {
  const [rows] = await pool.query(
    `SELECT device, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
       FROM page_views WHERE kind='view' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY device ORDER BY views DESC`, [days]);
  const total = rows.reduce((s, r) => s + Number(r.views), 0);
  return rows.map((r) => ({
    device: r.device, views: Number(r.views), visitors: Number(r.visitors),
    share: total ? (Number(r.views) / total) * 100 : 0,
  }));
}

// ── Countries ────────────────────────────────────────────────────────────────
let countryDN = null;
function countryName(code) {
  if (!code) return 'Unknown / local';
  try {
    if (!countryDN) countryDN = new Intl.DisplayNames(['en'], { type: 'region' });
    return countryDN.of(code) || code;
  } catch (e) { return code; }
}

// Visitors, views and buyers per country (shop + blog), with share of traffic.
async function countries(pool, days, limit) {
  const [rows] = await pool.query(
    `SELECT country, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors,
            SUM(page_type='product') AS product_views,
            SUM(page_type IN ('blog','article')) AS blog_views
       FROM page_views WHERE kind='view' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY country ORDER BY visitors DESC, views DESC`, [days]);
  const known = rows.filter((r) => r.country);
  const total = known.reduce((s, r) => s + Number(r.visitors), 0);
  const unknownRow = rows.find((r) => !r.country);
  const list = known.slice(0, limit).map((r) => ({
    code: r.country, name: countryName(r.country),
    views: Number(r.views), visitors: Number(r.visitors),
    product_views: Number(r.product_views), blog_views: Number(r.blog_views),
    share: total ? (Number(r.visitors) / total) * 100 : 0,
  }));
  // Rows with no country (pre-update history, localhost, unmapped IPs) are not
  // listed — just counted, so the dashboard can mention them in a footnote.
  list.unknown = unknownRow ? Number(unknownRow.visitors) : 0;
  return list;
}

// Which e-books each top country looks at — the data for targeting titles
// per market. Returns { [code]: [{title, slug, views, viewers}] } for the
// top `countryLimit` countries, `perCountry` titles each.
async function countryProducts(pool, days, countryLimit, perCountry) {
  const top = await countries(pool, days, countryLimit);
  const codes = top.map((c) => c.code);
  if (!codes.length) return {};
  const [rows] = await pool.query(
    `SELECT v.country, p.title, p.slug, COUNT(*) AS views, COUNT(DISTINCT v.visitor) AS viewers
       FROM page_views v JOIN products p ON p.slug = v.slug
      WHERE v.kind='view' AND v.page_type='product' AND v.country IN (?)
        AND v.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY v.country, p.id ORDER BY v.country, views DESC`, [codes, days]);
  const out = {};
  for (const r of rows) {
    (out[r.country] = out[r.country] || []);
    if (out[r.country].length < perCountry)
      out[r.country].push({ title: r.title, slug: r.slug, views: Number(r.views), viewers: Number(r.viewers) });
  }
  return out;
}

// Same idea for blog posts (free content is how overseas visitors discover us).
async function countryBlogs(pool, days, countryLimit, perCountry) {
  const top = await countries(pool, days, countryLimit);
  const codes = top.map((c) => c.code);
  if (!codes.length) return {};
  const [rows] = await pool.query(
    `SELECT v.country, b.title, b.slug, COUNT(*) AS views, COUNT(DISTINCT v.visitor) AS readers
       FROM page_views v JOIN blogs b ON b.slug = v.slug
      WHERE v.kind='view' AND v.page_type IN ('blog','article') AND v.country IN (?)
        AND v.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY v.country, b.id ORDER BY v.country, views DESC`, [codes, days]);
  const out = {};
  for (const r of rows) {
    (out[r.country] = out[r.country] || []);
    if (out[r.country].length < perCountry)
      out[r.country].push({ title: r.title, slug: r.slug, views: Number(r.views), readers: Number(r.readers) });
  }
  return out;
}

async function pageTypes(pool, days) {
  const LABELS = {
    home: 'Home page', shop: 'Shop', category: 'Category pages', product: 'E-book pages',
    blog_index: 'Blog index', blog: 'Blog posts', article: 'Blog posts (legacy URLs)',
    cart: 'Cart', page: 'Info pages', account: 'My dashboard', other: 'Other',
  };
  const [rows] = await pool.query(
    `SELECT page_type, COUNT(*) AS views FROM page_views
      WHERE kind='view' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY page_type ORDER BY views DESC`, [days]);
  const total = rows.reduce((s, r) => s + Number(r.views), 0);
  return rows.map((r) => ({
    label: LABELS[r.page_type] || r.page_type, views: Number(r.views),
    share: total ? (Number(r.views) / total) * 100 : 0,
  }));
}

// The browse→buy funnel over the window. Order/paid counts come from the
// orders table (source of truth), the earlier stages from tracked behaviour.
async function funnel(pool, days) {
  const [[v]] = await pool.query(
    `SELECT COUNT(DISTINCT visitor) AS visitors,
            COUNT(DISTINCT CASE WHEN page_type='product' THEN visitor END) AS product_viewers
       FROM page_views WHERE kind='view' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [days]);
  const [[e]] = await pool.query(
    `SELECT COUNT(DISTINCT CASE WHEN kind='cart_add' THEN visitor END) AS cart_adders,
            COUNT(DISTINCT CASE WHEN kind='checkout' THEN visitor END) AS checkouts,
            COUNT(DISTINCT CASE WHEN kind='download' THEN visitor END) AS downloaders
       FROM page_views WHERE kind IN ('cart_add','checkout','download')
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [days]);
  const [[o]] = await pool.query(
    `SELECT COUNT(*) AS orders, SUM(status='paid') AS paid
       FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`, [days]);
  return {
    visitors: Number(v.visitors), productViewers: Number(v.product_viewers || 0),
    cartAdders: Number(e.cart_adders || 0), checkouts: Number(e.checkouts || 0),
    downloaders: Number(e.downloaders || 0),
    orders: Number(o.orders), paid: Number(o.paid || 0),
  };
}

// All-time, donor-facing numbers. Every figure is real and verifiable in this
// database; blog all-time reads use the blogs.views counter because it
// pre-dates page_views (labelled "since launch" in the UI for honesty).
async function impact(pool) {
  const [[reach]] = await pool.query(
    `SELECT COUNT(DISTINCT visitor) AS learners, COUNT(*) AS views, MIN(created_at) AS since
       FROM page_views WHERE kind='view'`);
  const [[content]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM products WHERE is_published=1) AS ebooks,
            (SELECT COUNT(*) FROM blogs WHERE status='published') AS blogs,
            (SELECT COALESCE(SUM(views),0) FROM blogs) AS blog_reads`);
  const [[sales]] = await pool.query(
    `SELECT COUNT(DISTINCT o.user_id) AS buyers, COUNT(oi.id) AS books_delivered
       FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status='paid'`);
  return {
    learners: Number(reach.learners), views: Number(reach.views), since: reach.since,
    ebooks: Number(content.ebooks), blogs: Number(content.blogs), blogReads: Number(content.blog_reads),
    buyers: Number(sales.buyers), booksDelivered: Number(sales.books_delivered),
  };
}

// Everything the /admin/insights page needs, in one call.
async function overview(pool, { days = 30 } = {}) {
  const [sum, series, reach, products, blogs, sources, deviceSplit, types, fun, imp, geo, geoProducts, geoBlogs] =
    await Promise.all([
      summary(pool, days), daily(pool, Math.min(days, 90)), monthlyReach(pool, 12),
      topProducts(pool, days, 25), topBlogs(pool, days, 25),
      referrers(pool, days, 12), devices(pool, days), pageTypes(pool, days),
      funnel(pool, days), impact(pool),
      countries(pool, days, 25), countryProducts(pool, days, 8, 5), countryBlogs(pool, days, 8, 5),
    ]);
  return { sum, series, reach, products, blogs, sources, devices: deviceSplit, types, funnel: fun, impact: imp, countries: geo, countryProducts: geoProducts, countryBlogs: geoBlogs, days };
}

module.exports = { overview, summary, daily, monthlyReach, topProducts, topBlogs, referrers, devices, pageTypes, funnel, impact, countries, countryProducts, countryBlogs, countryName };
