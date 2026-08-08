// lib/analytics.js — sales analytics for the admin dashboard.
// Everything is computed live from orders / order_items / products, so the page
// always reflects the full order history in the database (past sales included).
// "Revenue" and "sold" figures count PAID orders only; pending/rejected orders
// appear in the status funnel so the conversion picture stays honest.

// A paid bundle counts as ONE unit of the bundle product (its own price), not
// one unit of each component — that matches what the buyer actually paid for.

async function summary(pool) {
  const [[s]] = await pool.query(
    `SELECT COUNT(*) AS orders,
            COALESCE(SUM(total_amount),0) AS revenue,
            COALESCE(AVG(total_amount),0) AS aov,
            COUNT(DISTINCT user_id) AS buyers,
            MIN(created_at) AS first_sale,
            MAX(created_at) AS last_sale
       FROM orders WHERE status='paid'`);
  const [[u]] = await pool.query(
    `SELECT COUNT(*) AS units FROM order_items oi
       JOIN orders o ON o.id=oi.order_id WHERE o.status='paid'`);
  return { ...s, units: u.units };
}

async function statusFunnel(pool) {
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) AS n, COALESCE(SUM(total_amount),0) AS amount
       FROM orders GROUP BY status`);
  const out = { pending: 0, paid: 0, failed: 0, rejected: 0, refunded: 0, amounts: {} };
  let total = 0;
  rows.forEach((r) => { out[r.status] = r.n; out.amounts[r.status] = Number(r.amount); total += r.n; });
  out.total = total;
  out.conversion = total ? (out.paid / total) * 100 : 0;
  return out;
}

// One row per calendar month over the ENTIRE order history:
// paid orders, revenue, units sold, unique buyers, first-time buyers.
async function monthly(pool) {
  const [orders] = await pool.query(
    `SELECT DATE_FORMAT(created_at,'%Y-%m') AS ym, COUNT(*) AS orders,
            COALESCE(SUM(total_amount),0) AS revenue, COUNT(DISTINCT user_id) AS buyers
       FROM orders WHERE status='paid' GROUP BY ym ORDER BY ym`);
  const [units] = await pool.query(
    `SELECT DATE_FORMAT(o.created_at,'%Y-%m') AS ym, COUNT(*) AS units
       FROM order_items oi JOIN orders o ON o.id=oi.order_id
      WHERE o.status='paid' GROUP BY ym`);
  const [firsts] = await pool.query(
    `SELECT ym, COUNT(*) AS new_buyers FROM (
        SELECT user_id, DATE_FORMAT(MIN(created_at),'%Y-%m') AS ym
          FROM orders WHERE status='paid' GROUP BY user_id) t
      GROUP BY ym`);
  const uMap = new Map(units.map((r) => [r.ym, r.units]));
  const fMap = new Map(firsts.map((r) => [r.ym, r.new_buyers]));

  if (!orders.length) return [];
  // Pad the range so months with zero sales still show (a flat month is data too).
  const rows = [];
  const oMap = new Map(orders.map((r) => [r.ym, r]));
  let [y, m] = orders[0].ym.split('-').map(Number);
  const now = new Date();
  const endYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  for (let guard = 0; guard < 600; guard++) {
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    const o = oMap.get(ym);
    rows.push({
      ym,
      orders: o ? o.orders : 0,
      revenue: o ? Number(o.revenue) : 0,
      buyers: o ? o.buyers : 0,
      units: uMap.get(ym) || 0,
      new_buyers: fMap.get(ym) || 0,
      aov: o && o.orders ? Number(o.revenue) / o.orders : 0,
    });
    if (ym === endYm) break;
    m++; if (m > 12) { m = 1; y++; }
  }
  return rows;
}

// Book-wise performance, optionally restricted to one YYYY-MM month.
async function bookWise(pool, ym) {
  const params = [];
  let where = '';
  if (ym) { where = " AND DATE_FORMAT(o.created_at,'%Y-%m')=?"; params.push(ym); }
  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.slug, p.price, p.is_published,
            COALESCE(c.name,'Uncategorised') AS category,
            COUNT(*) AS units, COALESCE(SUM(oi.price),0) AS revenue,
            MIN(o.created_at) AS first_sale, MAX(o.created_at) AS last_sale
       FROM order_items oi
       JOIN orders o ON o.id=oi.order_id AND o.status='paid'${where}
       JOIN products p ON p.id=oi.product_id
       LEFT JOIN categories c ON c.id=p.category_id
      GROUP BY p.id, p.title, p.slug, p.price, p.is_published, c.name
      ORDER BY revenue DESC, units DESC`, params);
  const totalRev = rows.reduce((a, r) => a + Number(r.revenue), 0);
  rows.forEach((r) => {
    r.revenue = Number(r.revenue);
    r.share = totalRev ? (r.revenue / totalRev) * 100 : 0;
  });
  return rows;
}

async function categoryWise(pool) {
  const [rows] = await pool.query(
    `SELECT COALESCE(c.name,'Uncategorised') AS category,
            COUNT(*) AS units, COALESCE(SUM(oi.price),0) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id=oi.order_id AND o.status='paid'
       JOIN products p ON p.id=oi.product_id
       LEFT JOIN categories c ON c.id=p.category_id
      GROUP BY category ORDER BY revenue DESC`);
  const totalRev = rows.reduce((a, r) => a + Number(r.revenue), 0);
  rows.forEach((r) => {
    r.revenue = Number(r.revenue);
    r.share = totalRev ? (r.revenue / totalRev) * 100 : 0;
  });
  return rows;
}

// Month-by-month history of a single book (the drill-down panel).
async function productMonthly(pool, productId) {
  const [[product]] = await pool.query(
    'SELECT id, title, slug, price FROM products WHERE id=?', [productId]);
  if (!product) return null;
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(o.created_at,'%Y-%m') AS ym,
            COUNT(*) AS units, COALESCE(SUM(oi.price),0) AS revenue
       FROM order_items oi JOIN orders o ON o.id=oi.order_id AND o.status='paid'
      WHERE oi.product_id=? GROUP BY ym ORDER BY ym`, [productId]);
  rows.forEach((r) => { r.revenue = Number(r.revenue); });
  return { product, rows };
}

// Everything the /admin/analytics page needs, in one call.
async function overview(pool, { month, productId } = {}) {
  const [sum, funnel, months, books, categories] = await Promise.all([
    summary(pool), statusFunnel(pool), monthly(pool), bookWise(pool, month), categoryWise(pool),
  ]);
  const drill = productId ? await productMonthly(pool, productId) : null;

  // This-month / last-month cards + growth, straight from the monthly series.
  const now = new Date();
  const thisYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastYm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const zero = { orders: 0, revenue: 0, units: 0, buyers: 0, new_buyers: 0, aov: 0 };
  const thisMonth = months.find((r) => r.ym === thisYm) || { ym: thisYm, ...zero };
  const lastMonth = months.find((r) => r.ym === lastYm) || { ym: lastYm, ...zero };
  const growth = lastMonth.revenue > 0
    ? ((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue) * 100
    : (thisMonth.revenue > 0 ? 100 : 0);

  return { sum, funnel, months, books, categories, drill, thisMonth, lastMonth, growth, thisYm };
}

function csvEscape(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCsv(headers, rows) {
  return [headers.join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\r\n');
}

module.exports = { overview, monthly, bookWise, categoryWise, productMonthly, summary, statusFunnel, toCsv };
