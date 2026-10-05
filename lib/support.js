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
  // Admin-initiated only (see routes/support.js POST /admin/support/payment-reminder):
  // a UPI payment was seen in the bank/UPI app but never linked to an order because
  // the buyer didn't finish the checkout "I Have Paid" step. This nudges them back
  // in via their dashboard to self-report the UTR + books bought.
  ['Payment Confirmation Needed', 'payment-confirmation', 'critical', 13],
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

  // Senders an admin has blocked as spammers (exact email, whole domain, or IP).
  await pool.query(`CREATE TABLE IF NOT EXISTS support_blocklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kind ENUM('email','domain','ip') NOT NULL,
    value VARCHAR(190) NOT NULL,
    reason VARCHAR(255) DEFAULT NULL,
    created_by VARCHAR(120) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bl (kind, value)
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
function spamScore({ honeypot, description, subject, name, email, tooFast }) {
  let s = 0;
  const d = String(description || ''), sub = String(subject || ''), n = String(name || '');
  const all = n + ' ' + sub + ' ' + d;
  if (honeypot && String(honeypot).trim() !== '') s += 10;            // bot filled hidden field
  if (tooFast) s += 10;                                                // no page load / inhuman speed
  if (/https?:\/\/|www\./i.test(n)) s += 10;                           // a URL inside the "name"
  if (/\d{5,}/.test(n)) s += 6;                                        // long digit runs in a name
  if (n.length > 60 || n.trim().split(/\s+/).length > 6) s += 4;       // names are short
  const links = (all.match(/https?:\/\/|www\./gi) || []).length;
  if (links >= 3) s += 6; else if (links >= 1) s += 2;
  if (d.trim().length < 15) s += 2;
  if (n.trim().length >= 12 && d.includes(n.trim().slice(0, 40))) s += 6; // name text repeated in body = template spam
  if (/thank you (very much )?for your (inquiry|enquiry)|we appreciate you/i.test(all)) s += 8;
  if (/viagra|casino|crypto\s*invest|loan\s*offer|seo\s*service|backlinks?|guest\s*post|porn|escort/i.test(all)) s += 6;
  if (/[Ѐ-ӿ]{5,}/.test(all)) s += 4;                         // Cyrillic bursts (Indian/English audience)
  if (email && /\s/.test(String(email))) s += 10;                      // whitespace inside email
  // Self-promotion: someone advertising their own product/site, not asking for help.
  const promo = /\b(our|my)\s+(website|site|product|app|platform|service|company|agency|store|course|tool)s?\b|\bwe\s+(offer|provide|are\s+(a|an|the)|specialize|help\s+(you|businesses|students))\b|\b(visit|check\s*out|try)\s+(us|our|my)\b|\b(free\s+trial|special\s+offer|limited\s+(time\s+)?offer|discount\s+code|promo\s*code|collaborat(e|ion)|partnership|affiliate|digital\s+marketing|web\s*(site)?\s*(design|development)|increase\s+(your\s+)?(traffic|sales|revenue)|grow\s+your|boost\s+your|rank\s+(on|higher)|lead\s*generation|business\s+proposal)\b/i;
  if (promo.test(all)) s += (links >= 1 ? 8 : 4);                     // promo wording + a link = quarantine
  return s;
}

const FREE_MAIL = new Set(['gmail.com','yahoo.com','yahoo.in','outlook.com','hotmail.com','live.com','rediffmail.com','icloud.com','proton.me','protonmail.com','aol.com','ymail.com']);
function emailDomain(email) { return String(email || '').toLowerCase().split('@')[1] || ''; }

// True when the sender's email, email domain or IP is on the blocklist.
async function isBlocked(pool, email, ip) {
  const e = String(email || '').toLowerCase(), d = emailDomain(e);
  const [rows] = await pool.query(
    "SELECT id FROM support_blocklist WHERE (kind='email' AND value=?) OR (kind='domain' AND value=?) OR (kind='ip' AND value=?) LIMIT 1",
    [e, d, String(ip || '')]);
  return rows.length > 0;
}

// Block a ticket's sender: exact email, its domain (unless a free mail provider,
// where the domain is shared by innocent people) and the IP it was sent from.
// Every other ticket from that email is quarantined as spam too.
async function blockSender(pool, ticket, actor) {
  const email = String(ticket.email || '').toLowerCase(), dom = emailDomain(email);
  const reason = ('Spam ticket ' + ticket.ticket_no).slice(0, 255);
  const add = (kind, value) => value && pool.query(
    'INSERT IGNORE INTO support_blocklist (kind, value, reason, created_by) VALUES (?,?,?,?)', [kind, value, reason, actor]);
  await add('email', email);
  if (dom && !FREE_MAIL.has(dom)) await add('domain', dom);
  await add('ip', ticket.ip);
  await pool.query('UPDATE support_tickets SET is_spam=1 WHERE email=?', [email]);
  return { email, domain: dom && !FREE_MAIL.has(dom) ? dom : null, ip: ticket.ip || null };
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

// Auto-close: any non-closed ticket with no activity for its TTL is closed
// automatically. "Activity" = the latest message on the ticket (falling back to
// its creation time), so a live back-and-forth keeps the ticket open and only
// genuinely idle ones close. Once closed, a customer cannot reopen it — only an
// admin can (see routes/support.js).
//
// Two windows:
//   • Normal tickets            -> SUPPORT_TICKET_TTL_HOURS       (default 24h)
//   • 'payment-confirmation'    -> SUPPORT_PAYMENT_TTL_HOURS      (default 48h)
// Payment tickets get the longer window so a buyer who paid but is slow to send
// their UTR has extra time — but they no longer stay open forever.
//
// A customer-visible closing message is posted before the ticket is closed, so the
// customer understands why and knows to open a new ticket. Applies to existing old
// tickets too: they are caught by age on the next run (timer / admin visit).
async function autoClose(pool) {
  const hours    = parseInt(process.env.SUPPORT_TICKET_TTL_HOURS)  || 24;
  const payHours = parseInt(process.env.SUPPORT_PAYMENT_TTL_HOURS) || 48;
  const lastActivity =
    `COALESCE((SELECT MAX(m.created_at) FROM support_messages m WHERE m.ticket_id = t.id), t.created_at)`;

  // Normal (non payment-confirmation) idle beyond the 24h window.
  const [normal] = await pool.query(
    `SELECT t.id FROM support_tickets t
     LEFT JOIN support_categories c ON c.id = t.category_id
     WHERE t.status <> 'closed'
       AND (c.slug IS NULL OR c.slug <> 'payment-confirmation')
       AND ${lastActivity} < DATE_SUB(NOW(), INTERVAL ? HOUR)`, [hours]);

  // Payment-confirmation idle beyond the 48h window.
  const [payment] = await pool.query(
    `SELECT t.id FROM support_tickets t
     JOIN support_categories c ON c.id = t.category_id
     WHERE t.status <> 'closed' AND c.slug = 'payment-confirmation'
       AND ${lastActivity} < DATE_SUB(NOW(), INTERVAL ? HOUR)`, [payHours]);

  const batches = [{ rows: normal, ttl: hours }, { rows: payment, ttl: payHours }];
  let count = 0;
  for (const { rows, ttl } of batches) {
    for (const t of rows) {
      const msg = `This ticket has been closed automatically because ${ttl} hours have passed ` +
        `without any activity. If you still need help, please open a new support ticket and our ` +
        `team will be glad to assist you.\n\nThanks,\nTeam MathStudy.in`;
      await pool.query(
        `INSERT INTO support_messages (ticket_id, sender, user_id, body, is_internal, read_by_admin, read_by_customer)
         VALUES (?, 'staff', NULL, ?, 0, 1, 0)`, [t.id, msg]);
      await pool.query(`UPDATE support_tickets SET status='closed', closed_at=NOW() WHERE id=?`, [t.id]);
      await logEvent(pool, t.id, 'system', 'status', `auto-closed after ${ttl}h of inactivity`);
      count++;
    }
  }
  return count;
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

// Admin manually flagged a payment that never became an order (buyer paid via
// UPI/QR but never clicked "I Have Paid" + entered the UTR at checkout). This
// is the nudge that gets them back into their dashboard to self-report it.
async function emailPaymentReminderCreated(pool, t, amount) {
  const amountLine = amount > 0
    ? `a payment of <b>&#8377;${Number(amount).toFixed(2)}</b> from you towards MathStudy.in e-books`
    : `a payment from you towards MathStudy.in e-books`;
  const html = emailShell(`<p>Hello ${esc(t.name)},</p>
    <p>Our records show ${amountLine} — thank you.</p>
    <p>However, your order did not finish on our side. At checkout there is one final step where you enter your
    UPI transaction ID (UTR number) and tap the <b>"Payment Done"</b> button to confirm. That step was not
    completed, so your payment is not yet linked to an order and we are unable to release your download link.</p>
    <p>To receive your e-books, please confirm your payment in either of these ways:</p>
    <ol style="margin:8px 0 8px 20px;padding:0">
      <li>Log in to <a href="${BASE_URL}/dashboard">your dashboard</a> and click <b>"Confirm your payment"</b>, or</li>
      <li>Open the ticket below and reply with (a) your UPI transaction ID (UTR number) and (b) the exact e-book(s) you purchased.</li>
    </ol>
    ${emailTicketBlock(t)}
    <p>Once we verify it, your download link will be emailed to you — usually within a few hours.</p>
    <p style="color:#6b7280;font-size:13px">If you did not make this payment, please ignore this email.</p>
    <p style="margin-top:16px">Thanks,<br>Team MathStudy.in</p>`);
  const r = await notify.sendEmail(t.email, `[${t.ticket_no}] Action needed — confirm your MathStudy.in payment to receive your e-books`, html);
  await logEvent(pool, t.id, 'system', 'email', `payment-reminder to ${t.email}: ${r.ok ? 'sent' : (r.skipped || r.error)}`);
}

module.exports = {
  STATUSES, STATUS_LABELS, PRIORITIES, PRIORITY_LABELS, KNOWLEDGE_BASE,
  ensureSchema, newAccessToken, assignTicketNo, spamScore, findDuplicate, isBlocked, blockSender,
  logEvent, autoClose,
  emailTicketCreated, emailStaffReplied, emailStatusChanged, emailCustomerReplied,
  emailPaymentReminderCreated,
};
