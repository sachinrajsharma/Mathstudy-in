// lib/orders.js — the order approval engine shared by the admin panel and the
// tap-from-phone Approve/Reject links. Handles DB state + download tokens +
// buyer notifications. Notifications are best-effort (never block the DB change).

const crypto = require('crypto');
const notify = require('./notify');

const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;

async function getOrder(pool, orderId) {
  const [[order]] = await pool.query('SELECT * FROM orders WHERE id=?', [orderId]);
  return order || null;
}

// Approve an order: mark paid, mint a download token per item, email the buyer
// their secure links. Returns { ok, downloads:[{title,url}], order, user } or { error, code }.
async function approveOrder(pool, orderId, baseUrl) {
  const order = await getOrder(pool, orderId);
  if (!order) return { error: 'Order not found.', code: 404 };
  if (order.status === 'paid') return { error: 'Order is already approved.', code: 409, already: true };

  await pool.query("UPDATE orders SET status='paid', approved_at=NOW(), rejected_at=NULL WHERE id=?", [orderId]);

  const [items] = await pool.query(
    `SELECT oi.product_id, p.title, p.bundle_items
       FROM order_items oi JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?`, [orderId]);

  // Expand any bundle into the individual e-books it grants (de-duplicated).
  const deliver = []; const seen = new Set();
  for (const it of items) {
    const bIds = Array.isArray(it.bundle_items) ? it.bundle_items
      : (it.bundle_items ? (() => { try { return JSON.parse(it.bundle_items); } catch (e) { return []; } })() : []);
    if (bIds.length) {
      const [comps] = await pool.query('SELECT id, title FROM products WHERE id IN (?)', [bIds]);
      comps.forEach((c) => { if (!seen.has(c.id)) { seen.add(c.id); deliver.push({ product_id: c.id, title: c.title }); } });
    } else if (!seen.has(it.product_id)) {
      seen.add(it.product_id); deliver.push({ product_id: it.product_id, title: it.title });
    }
  }

  const downloads = [];
  for (const item of deliver) {
    let [[tok]] = await pool.query(
      'SELECT token FROM download_tokens WHERE order_id=? AND product_id=? AND user_id=?',
      [orderId, item.product_id, order.user_id]);
    let token = tok && tok.token;
    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      await pool.query(
        `INSERT INTO download_tokens (token, user_id, product_id, order_id, expires_at, max_uses)
         VALUES (?, ?, ?, ?, ?, 5)`,
        [token, order.user_id, item.product_id, orderId, new Date(Date.now() + ONE_YEAR)]);
    }
    downloads.push({ title: item.title, url: `${baseUrl}/download/${token}` });
  }

  const [[user]] = await pool.query('SELECT id, name, email FROM users WHERE id=?', [order.user_id]);

  try { if (user) await notify.userApproved({ order, user, downloads }); }
  catch (e) { console.error('[orders] approve notify failed:', e.message); }

  return { ok: true, downloads, order, user };
}

// Reject an order: mark rejected and tell the buyer the payment wasn't received.
async function rejectOrder(pool, orderId) {
  const order = await getOrder(pool, orderId);
  if (!order) return { error: 'Order not found.', code: 404 };
  if (order.status === 'paid') return { error: 'Order is already approved — cannot reject.', code: 409 };
  if (order.status === 'rejected') return { error: 'Order is already rejected.', code: 409, already: true };

  await pool.query("UPDATE orders SET status='rejected', rejected_at=NOW() WHERE id=?", [orderId]);
  const [[user]] = await pool.query('SELECT id, name, email FROM users WHERE id=?', [order.user_id]);

  try { if (user) await notify.userRejected({ order, user }); }
  catch (e) { console.error('[orders] reject notify failed:', e.message); }

  return { ok: true, order, user };
}

module.exports = { approveOrder, rejectOrder, getOrder };
