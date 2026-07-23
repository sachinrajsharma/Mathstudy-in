// lib/notify.js — WooCommerce-style order notifications by email.
// Every send is wrapped so a misconfigured channel can NEVER break order flow.
// Configure via .env: SMTP_* , ADMIN_EMAIL.

let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) { /* optional */ }

const BRAND = 'MathStudy.in';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Email (SMTP via nodemailer) ──────────────────────────────────────────────
let _transport = null;
function transport() {
  if (_transport !== null) return _transport;
  if (!nodemailer || !process.env.SMTP_HOST || !process.env.SMTP_USER) { _transport = false; return false; }
  _transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_PORT) === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return _transport;
}
async function sendEmail(to, subject, html) {
  const t = transport();
  if (!t || !to) {
    // Say WHY nothing was sent — a silent skip here is invisible in production.
    const missing = [
      !process.env.SMTP_HOST && 'SMTP_HOST',
      !process.env.SMTP_USER && 'SMTP_USER',
      !process.env.SMTP_PASS && 'SMTP_PASS',
      !to && 'recipient (ADMIN_EMAIL?)',
    ].filter(Boolean).join(', ');
    console.error(`[notify] EMAIL SKIPPED (${subject}) — not configured. Missing: ${missing}`);
    return { skipped: 'email-not-configured', missing };
  }
  try {
    const from = process.env.MAIL_FROM || `${BRAND} <${process.env.SMTP_USER}>`;
    await t.sendMail({ from, to, subject, html });
    console.log(`[notify] email sent to ${to}: ${subject}`);
    return { ok: true };
  } catch (e) { console.error('[notify] email error:', e.message); return { error: e.message }; }
}

// ── Diagnostics (admin email-health page) ────────────────────────────────────
function smtpStatus() {
  return {
    nodemailer_installed: !!nodemailer,
    smtp_host: process.env.SMTP_HOST || null,
    smtp_port: parseInt(process.env.SMTP_PORT) || 587,
    smtp_user_set: !!process.env.SMTP_USER,
    smtp_pass_set: !!process.env.SMTP_PASS,
    mail_from: process.env.MAIL_FROM || (process.env.SMTP_USER ? `${BRAND} <${process.env.SMTP_USER}>` : null),
    admin_email: process.env.ADMIN_EMAIL || null,
    configured: !!(nodemailer && process.env.SMTP_HOST && process.env.SMTP_USER),
  };
}

// Live connection + login check against the SMTP server.
async function verifySmtp() {
  const t = transport();
  if (!t) return { ok: false, error: 'not configured (SMTP_HOST / SMTP_USER / SMTP_PASS missing)' };
  try { await t.verify(); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
}

function shell(title, bodyHtml) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #eee;border-radius:10px;overflow:hidden">
    <div style="background:#0d9488;color:#fff;padding:16px 22px;font-size:18px;font-weight:700">${esc(BRAND)}</div>
    <div style="padding:22px;color:#1f2937;font-size:15px;line-height:1.6">
      <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px">${esc(title)}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:14px 22px;background:#f8fafc;color:#94a3b8;font-size:12px">You received this email because of an order on ${esc(BRAND)}.</div>
  </div>`;
}

// ── High-level events ────────────────────────────────────────────────────────

// New order placed (buyer tapped "I made the payment").
async function adminNewOrder({ order, items, buyer, baseUrl }) {
  const ref = order.payment_id || ('#' + order.id);
  const approveUrl = `${baseUrl}/order-action/${order.id}/approve?t=${order.admin_token}`;
  const rejectUrl  = `${baseUrl}/order-action/${order.id}/reject?t=${order.admin_token}`;
  const itemLines = items.map((i) => `• ${i.title} — ₹${Number(i.price).toFixed(2)}`);

  const emailHtml = shell('New order — payment claimed', `
    <p><b>Order:</b> ${esc(ref)}<br>
    <b>Buyer:</b> ${esc(buyer.name)} &lt;${esc(buyer.email)}&gt;<br>
    ${order.customer_phone ? `<b>Phone:</b> ${esc(order.customer_phone)}<br>` : ''}
    <b>Amount:</b> ₹${Number(order.total_amount).toFixed(2)}</p>
    <p><b>Items</b><br>${itemLines.map(esc).join('<br>')}</p>
    <p style="color:#b45309"><b>Verify the payment in your UPI app first</b>, then choose:</p>
    <p>
      <a href="${approveUrl}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700;margin-right:8px">✓ Approve &amp; send link</a>
      <a href="${rejectUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:700">✗ Reject</a>
    </p>`);

  const e = await sendEmail(process.env.ADMIN_EMAIL, `New order ${ref} — ₹${Number(order.total_amount).toFixed(2)}`, emailHtml);
  return { email: e };
}

// Order approved → buyer gets their secure download link(s).
async function userApproved({ order, user, downloads }) {
  const ref = order.payment_id || ('#' + order.id);
  const list = downloads.map((d) =>
    `<p style="margin:0 0 10px"><b>${esc(d.title)}</b><br>
     <a href="${d.url}" style="display:inline-block;margin-top:6px;background:#0d9488;color:#fff;text-decoration:none;padding:9px 18px;border-radius:8px;font-weight:700">⬇ Download</a></p>`).join('');
  const html = shell('Payment confirmed — your download is ready 🎉', `
    <p>Hi ${esc(user.name)}, your payment for order <b>${esc(ref)}</b> is confirmed. Here ${downloads.length > 1 ? 'are your downloads' : 'is your download'}:</p>
    ${list}
    <p style="color:#64748b;font-size:13px">These links are personal to your account and expire after a while. You can also re-download anytime from your <b>Dashboard</b>.</p>`);
  const e = await sendEmail(user.email, `Your MathStudy download is ready — ${ref}`, html);
  return { email: e };
}

// Order rejected → buyer is told the payment was not received.
async function userRejected({ order, user }) {
  const ref = order.payment_id || ('#' + order.id);
  const html = shell('We could not confirm your payment', `
    <p>Hi ${esc(user.name)}, we checked order <b>${esc(ref)}</b> but the payment has <b>not been received</b> on our side yet.</p>
    <p>Please re-check the transaction and reply to this email with your <b>payment details</b> (UPI reference / screenshot, date and amount) so we can verify and release your download.</p>
    <p style="color:#64748b;font-size:13px">If money was deducted, don't worry — share the details and we'll sort it out quickly.</p>`);
  const e = await sendEmail(user.email, `Action needed: payment not received — ${ref}`, html);
  return { email: e };
}

module.exports = { sendEmail, adminNewOrder, userApproved, userRejected, smtpStatus, verifySmtp };
