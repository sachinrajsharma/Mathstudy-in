'use strict';
// lib/support.js — customer support ticket system: schema, business rules,
// knowledge base and email templates. Routes live in routes/support.js.
//
// Design notes (mapping to the classic helpdesk schema):
//   tickets            -> support_tickets
//   ticket_messages    -> support_messages   (is_internal=1 rows are staff-only
//   admin_notes        ->                     internal notes)
//   ticket_attachments -> support_attachments
//   ticket_status_logs -> support_events     (also the audit trail, activity
//   email_logs         ->                     timeline, email log and download
//   download logs      ->                     log — one journal, many kinds)
//   ticket_categories  -> support_categories (admin-configurable; each carries
//   ticket_priorities  ->                     its default priority)
//   staff_members      -> users              (role admin/super_admin — the shop
//                                             already has staff accounts there)
//   notifications      -> read flags on messages + the /support/unread endpoint

const crypto = require('crypto');
const notify = require('./notify');

const BASE_URL = (process.env.BASE_URL || 'https://mathstudy.in').replace(/\/+$/, '');

// ── Vocabulary ───────────────────────────────────────────────────────────────
const STATUSES = ['open', 'pending', 'waiting_customer', 'resolved', 'closed'];
const STATUS_LABELS = {
  open: 'Open', pending: 'Pending', waiting_customer: 'Waiting for Customer',
  resolved: 'Resolved', closed: 'Closed',
};
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const PRIORITY_LABELS = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

// Categories the shop starts with. Admin can rename/add/disable in the panel;
// default_priority drives automatic prioritisation on ticket creation.
const SEED_CATEGORIES = [
  ['Payment Issue',       'payment-issue',     'critical', 1],
  ['Download Problem',    'download-problem',  'critical', 2],
  ['Duplicate Payment',   'duplicate-payment', 'critical', 3],
  ['Wrong Product',       'wrong-product',     'high',     4],
  ['Invoice Request',     'invoice-request',   'medium',   6],
  ['Login Issue',         'login-issue',       'medium',   7],
  ['Account Issue',       'account-issue',     'medium',   8],
  ['Order Not Found',     'order-not-found',   'high',     9],
  ['Technical Error',     'technical-error',   'medium',  10],
  ['Suggestion',          'suggestion',        'low',     11],
  ['Other',               'other',             'low',     12],
];

const SEED_TEMPLATES = [
  ['Payment received — link resent',
   'Hello {name},\n\nThank you for your patience. We have verified your payment for order {order}. Your download link has been re-sent to this email address — please also check your spam folder.\n\nIf it does not arrive within 10 minutes, reply here and we will attach the file directly.\n\n— MathStudy.in Support'],
  ['Need payment reference',
   'Hello {name},\n\nTo trace your payment we need one more detail: the UPI transaction ID (12-digit UTR number) from your payment app. You can find it in the app\'s history for this payment.\n\nReply with that number and we will resolve this quickly.\n\n— MathStudy.in Support'],
  ['Resolved — please confirm',
   'Hello {name},\n\nWe believe this issue is now resolved. Please check and reply if anything is still wrong — otherwise this ticket will close automatically in a few days.\n\nThank you for shopping with MathStudy.in.'],
];

// Knowledge base shown on the ticket form BEFORE submission — the fastest
// support is the ticket that never needs to be opened. Keyed by category slug.
const KNOWLEDGE_BASE = [
  { cats: ['payment-issue', 'download-problem'], q: 'Paid, but no e-book email?',
    a: 'Delivery emails usually arrive within 5–10 minutes of admin approval (payments are verified manually, so allow up to a few hours). First check your spam/junk folder for an email from MathStudy.in. If you have an account, every purchased book is also available under My Orders on your dashboard.' },
  { cats: ['download-problem'], q: 'Download link opens but the file will not download',
    a: 'Our e-books are delivered from Google Drive. If Drive shows a quota message, wait 30 minutes and try again, or try a different browser. The link does not expire.' },
  { cats: ['payment-issue', 'duplicate-payment'], q: 'Amount deducted but order shows unpaid',
    a: 'UPI sometimes confirms late. If money left your account, the order will be approved as soon as the payment appears on our side — usually the same day. Keep your UPI transaction ID (UTR) handy; it makes verification instant.' },
  { cats: ['login-issue', 'account-issue'], q: 'Forgot password / cannot log in',
    a: 'Use the password change option after logging in, or submit a ticket with the email you registered with and we will reset it for you. Note: you can buy without an account — books are delivered by email.' },
  { cats: ['invoice-request'], q: 'Need an invoice or receipt',
    a: 'Reply with your order ID and billing name and we will email a PDF receipt within one working day.' },
  { cats: ['order-not-found'], q: 'Order not visible in My Orders',
    a: 'Orders appear under the exact email used at checkout. If you typed a different email while buying, tell us both emails in the ticket and we will re-link the order.' },
];

// ── Schema (idempotent — safe to run on every boot) ─────────────────────────
async function ensureSchema(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS support_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    slug VARCHAR(80) NOT NULL UNIQUE,
    default_priority ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
    sort_order INT NOT NULL DEFAULT 100,
    is_active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await pool.query(`CREATE TABLE IF NOT EXISTS support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_no VARCHAR(20) UNIQUE,
    user_id INT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(30) DEFAULT NULL,
    order_ref VARCHAR(60) DEFAULT NULL,
    payment_ref VARCHAR(80) DEFAULT NULL,
    product_title VARCHAR(255) DEFAULT NULL,
    category_id INT NULL,
    subject VARCHAR(200) NOT NULL,
    status ENUM('open','pending','waiting_customer','resolved','closed') NOT NULL DEFAULT 'open',
    priority ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
    assigned_to INT NULL,
    access_token CHAR(48) NOT NULL UNIQUE,
    browser_info VARCHAR(400) DEFAULT NULL,
    device_info VARCHAR(255) DEFAULT NULL,
    ip VARCHAR(64) DEFAULT NULL,
    spam_score INT NOT NULL DEFAULT 0,
    is_spam TINYINT(1) NOT NULL DEFAULT 0,
    duplicate_of INT NULL,
    merged_into INT NULL,
    rating TINYINT NULL,
    rating_comment VARCHAR(500) DEFAULT NULL,
    resolved_at DATETIME NULL,
    closed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status), INDEX idx_priority (priority), INDEX idx_email (email),
    INDEX idx_order (order_ref), INDEX idx_created (created_at), INDEX idx_category (category_id),
    CONSTRAINT fk_st_user  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_st_cat   FOREIGN KEY (category_id) REFERENCES support_categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_st_staff FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await pool.query(`CREATE TABLE IF NOT EXISTS support_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    sender ENUM('customer','staff') NOT NULL,
    user_id INT NULL,
    body TEXT NOT NULL,
    is_internal TINYINT(1) NOT NULL DEFAULT 0,
    read_by_customer TINYINT(1) NOT NULL DEFAULT 0,
    read_by_admin TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sm_ticket (ticket_id),
    CONSTRAINT fk_sm_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await pool.query(`CREATE TABLE IF NOT EXISTS support_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    message_id INT NULL,
    orig_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL UNIQUE,
    mime VARCHAR(100) NOT NULL,
    size INT NOT NULL,
    uploaded_by ENUM('customer','staff') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sa_ticket (ticket_id),
    CONSTRAINT fk_sa_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_sa_msg FOREIGN KEY (message_id) REFERENCES support_messages(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await pool.query(`CREATE TABLE IF NOT EXISTS support_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    actor VARCHAR(120) NOT NULL,
    kind VARCHAR(30) NOT NULL,
    detail VARCHAR(500) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_se_ticket (ticket_id), INDEX idx_se_kind (kind),
    CONSTRAINT fk_se_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await pool.query(`CREATE TABLE IF NOT EXISTS support_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    body TEXT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  for (const [name, slug, prio, sort] of SEED_CATEGORIES) {
    await pool.query(
      `INSERT IGNORE INTO support_categories (name, slug, default_priority, sort_order) VALUES (?,?,?,?)`,
      [name, slug, prio, sort]);
  }
  // Digital-only store: there is no "Refund Request" issue type. Hide it if an
  // older install already created it (kept, not deleted, to preserve any linked
  // tickets' history; the dropdown only lists is_active=1 categories).
  await pool.query(`UPDATE support_categories SET is_active=0 WHERE slug='refund-request'`);
  const [[{ n }]] = await pool.query(`SELECT COUNT(*) n FROM support_templates`);
  if (n === 0) {
    for (const [title, body] of SEED_TEMPLATES) {
      await pool.query(`INSERT INTO support_templates (title, body) VALUES (?,?)`, [title, body]);
    }
  }
}

// ── Business rules ───────────────────────────────────────────────────────────
function newAccessToken() { return crypto.randomBytes(24).toString('hex'); }

async function assignTicketNo(pool, id) {
  const no = 'SUP-' + new Date().getFullYear() + '-' + String(id).padStart(6, '0');
  await pool.query(`UPDATE support_tickets SET ticket_no=? WHERE id=?`, [no, id]);
  return no;
}

// Heuristic spam score. >= 8 marks the ticket as spam (kept, but quarantined in
// the admin list). The honeypot field is the strongest signal.
function spamScore({ honeypot, description, subject }) {
  let s = 0;
  if (honeypot && String(honeypot).trim() !== '') s += 10;
  const links = (String(description).match(/https?:\/\//g) || []).length;
  if (links >= 3) s += 4;
  if (String(description).trim().length < 15) s += 2;
  if (/viagra|casino|crypto\s*invest|loan\s*offer|seo\s*service/i.test(subject + ' ' + description)) s += 6;
  return s;
}

// A likely duplicate: same email + same subject in the last 24 hours.
async function findDuplicate(pool, email, subject) {
  const [[dup]] = await pool.query(
    `SELECT id, ticket_no FROM support_tickets
     WHERE email=? AND subject=? AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
     ORDER BY id DESC LIMIT 1`, [email, subject]);
  return dup || null;
}

async function logEvent(pool, ticketId, actor, kind, detail) {
  await pool.query(`INSERT INTO support_events (ticket_id, actor, kind, detail) VALUES (?,?,?,?)`,
    [ticketId, actor, kind, detail ? String(detail).slice(0, 500) : null]);
}

// Auto-close: resolved / waiting-for-customer tickets untouched for N days.
async function autoClose(pool) {
  const days = parseInt(process.env.SUPPORT_AUTOCLOSE_DAYS) || 7;
  const [stale] = await pool.query(
    `SELECT id, ticket_no FROM support_tickets
     WHERE status IN ('resolved','waiting_customer')
       AND updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)`, [days]);
  for (const t of stale) {
    await pool.query(`UPDATE support_tickets SET status='closed', closed_at=NOW() WHERE id=?`, [t.id]);
    await logEvent(pool, t.id, 'system', 'status', `auto-closed after ${days} days of inactivity`);
  }
  return stale.length;
}

// ── Email templates ──────────────────────────────────────────────────────────
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function emailShell(inner) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
  <div style="background:#0f766e;color:#fff;padding:16px 24px;font-size:18px;font-weight:bold">MathStudy.in — Support</div>
  <div style="padding:24px;color:#1f2937;font-size:15px;line-height:1.7">${inner}</div>
  <div style="background:#f9fafb;padding:14px 24px;color:#6b7280;font-size:12px">MathStudy.in · Premium maths e-books · This is an automated message; reply on the ticket page, not to this email.</div>
</div>`;
}
function ticketLink(t) { return `${BASE_URL}/support/ticket/${t.access_token}`; }
function statusBadge(status) {
  const colors = { open: '#2563eb', pending: '#d97706', waiting_customer: '#b45309', resolved: '#059669', closed: '#6b7280' };
  return `<span style="background:${colors[status] || '#6b7280'};color:#fff;border-radius:99px;padding:2px 12px;font-size:12px">${esc(STATUS_LABELS[status] || status)}</span>`;
}
function emailTicketBlock(t) {
  return `<table style="font-size:14px;color:#374151;margin:12px 0" cellpadding="3">
    <tr><td><b>Ticket</b></td><td>${esc(t.ticket_no)}</td></tr>
    <tr><td><b>Subject</b></td><td>${esc(t.subject)}</td></tr>
    <tr><td><b>Status</b></td><td>${statusBadge(t.status)}</td></tr>
  </table>
  <p><a href="${ticketLink(t)}" style="background:#0f766e;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;display:inline-block">Open your ticket</a></p>`;
}

async function emailTicketCreated(pool, t) {
  const html = emailShell(`<p>Hello ${esc(t.name)},</p>
    <p>Thank you — your support request has been received. Our team responds within 24 hours.</p>
    ${emailTicketBlock(t)}
    <p>You can reply and upload files on the ticket page at any time.</p>`);
  const r = await notify.sendEmail(t.email, `[${t.ticket_no}] We received your support request`, html);
  await logEvent(pool, t.id, 'system', 'email', `created-confirmation to ${t.email}: ${r.ok ? 'sent' : (r.skipped || r.error)}`);
  if (process.env.ADMIN_EMAIL) {
    const ahtml = emailShell(`<p>New <b>${esc(PRIORITY_LABELS[t.priority])}</b> ticket from ${esc(t.name)} (${esc(t.email)}).</p>
      ${emailTicketBlock(t)}
      <p>Admin view: <a href="${BASE_URL}/admin/support/${t.id}">${BASE_URL}/admin/support/${t.id}</a></p>`);
    await notify.sendEmail(process.env.ADMIN_EMAIL, `[${t.ticket_no}] New ${PRIORITY_LABELS[t.priority]} support ticket`, ahtml);
  }
}

async function emailStaffReplied(pool, t) {
  const html = emailShell(`<p>Hello ${esc(t.name)},</p>
    <p>Our support team has replied to your ticket.</p>${emailTicketBlock(t)}`);
  const r = await notify.sendEmail(t.email, `[${t.ticket_no}] New reply from MathStudy.in support`, html);
  await logEvent(pool, t.id, 'system', 'email', `staff-reply notice to ${t.email}: ${r.ok ? 'sent' : (r.skipped || r.error)}`);
}

async function emailStatusChanged(pool, t) {
  if (!['resolved', 'closed'].includes(t.status)) return;
  const line = t.status === 'resolved'
    ? 'Your ticket has been marked <b>Resolved</b>. If anything is still wrong, just reply on the ticket page and it will reopen.'
    : 'Your ticket is now <b>Closed</b>. You can rate your experience on the ticket page — it takes five seconds and genuinely helps.';
  const html = emailShell(`<p>Hello ${esc(t.name)},</p><p>${line}</p>${emailTicketBlock(t)}`);
  const r = await notify.sendEmail(t.email, `[${t.ticket_no}] Ticket ${STATUS_LABELS[t.status]}`, html);
  await logEvent(pool, t.id, 'system', 'email', `${t.status} notice to ${t.email}: ${r.ok ? 'sent' : (r.skipped || r.error)}`);
}

async function emailCustomerReplied(pool, t) {
  if (!process.env.ADMIN_EMAIL) return;
  const html = emailShell(`<p>${esc(t.name)} replied on ticket ${esc(t.ticket_no)}.</p>
    <p>Admin view: <a href="${BASE_URL}/admin/support/${t.id}">${BASE_URL}/admin/support/${t.id}</a></p>`);
  await notify.sendEmail(process.env.ADMIN_EMAIL, `[${t.ticket_no}] Customer replied`, html);
}

module.exports = {
  STATUSES, STATUS_LABELS, PRIORITIES, PRIORITY_LABELS, KNOWLEDGE_BASE,
  ensureSchema, newAccessToken, assignTicketNo, spamScore, findDuplicate,
  logEvent, autoClose,
  emailTicketCreated, emailStaffReplied, emailStatusChanged, emailCustomerReplied,
};
