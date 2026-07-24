# Customer Support Ticket System

A complete helpdesk built INTO the existing Node.js/Express/EJS/MySQL portal —
it reuses the site's sessions, users, admin roles, CSRF protection, Helmet CSP
and SMTP mailer. (The original spec said "PHP 8+", but the portal is a Node
application on Hostinger Node hosting; a PHP subsystem cannot run inside it or
share its login/orders, so the system is implemented natively in the portal's
stack — same features, genuinely integrated.)

## URLs

| URL | Who | What |
|---|---|---|
| `/support` | everyone | Submit-ticket form + knowledge base (guests get a math captcha) |
| `/support/ticket/<token>` | link holder | Chat-style conversation, replies, attachments, rating |
| `/dashboard/support` | logged-in customer | All my tickets, search, unread badges |
| `/support/unread` | logged-in customer | JSON unread count (polled by the nav badge) |
| `/support/attachment/<id>` | owner/token/admin | Gated attachment download (logged) |
| `/admin/support` | admin | Stats cards, filters, search, pagination, spam folder, settings |
| `/admin/support/<id>` | admin | Full detail, conversation + internal notes, actions, audit timeline |
| `/admin/support/<id>/print` | admin | Print-friendly view → browser "Save as PDF" |
| `/admin/support/export.csv` | admin | CSV export (opens in Excel) |

## Database (auto-created on boot)

`lib/support.js → ensureSchema()` runs when the server starts and is idempotent,
so a plain git-deploy is enough — no manual migration needed. It is also
registered in `scripts/setup-fresh.js` (step `migrate-support.js`) for fresh DBs.

| Requested table | Implemented as |
|---|---|
| `tickets` | `support_tickets` (ticket_no `SUP-YYYY-000001`, status, priority, assignee, access token, browser/device/IP, spam score, merge/duplicate links, rating, resolved/closed timestamps) |
| `ticket_messages` + `admin_notes` | `support_messages` (`is_internal=1` rows are staff-only internal notes) |
| `ticket_attachments` | `support_attachments` |
| `ticket_status_logs` + `email_logs` + download logs + audit | `support_events` (one journal, `kind` = created/status/priority/assign/merge/reply/note/email/download/rating/spam) |
| `ticket_categories` + `ticket_priorities` | `support_categories` (admin-configurable; each category carries its default priority — this drives auto-prioritisation) |
| `staff_members` | existing `users` table (`role IN ('admin','super_admin')`) |
| `users` | existing `users` table (tickets link by `user_id` and by email) |
| `notifications` | read flags on messages + `/support/unread` + red badges |

All queries use prepared statements (`pool.query('… ?', [v])`). Foreign keys
cascade so deleting a ticket removes its messages/attachments/events.

## Features shipped

- **Ticket form**: name, email, mobile, order ID, payment/UTR ID, e-book,
  category, subject, description, up to 3 attachments (JPG/PNG/PDF, 10 MB each),
  auto-captured browser + device info, honeypot, guest math captcha,
  server-side validation with repopulated form on error.
- **Auto ticket numbers** `SUP-2026-000001`; **auto priority** from category
  (Payment/Download/Duplicate-payment → Critical, Wrong product/Refund/Order-not-found → High, …) —
  admin can override per-ticket and per-category.
- **Statuses** Open / Pending / Waiting for Customer / Resolved / Closed with
  coloured badges everywhere; customer reply auto-reopens; staff public reply on
  an Open ticket auto-moves it to Waiting for Customer.
- **Chat-style conversation** with image thumbnails + PDF chips; internal notes
  render as yellow dashed bubbles (admin only).
- **Emails** (via existing `lib/notify` SMTP): created (customer + admin alert),
  staff replied, resolved, closed — every email carries the tokenized ticket
  link; every send/skip is logged into the audit timeline.
- **Customer dashboard**: list, search, unread-reply badges; nav badge polls
  once a minute on support pages.
- **Admin dashboard**: cards (total, open, pending, waiting, resolved, closed,
  today, critical open, average resolution hours, average rating), filters
  (status/priority/category), full-text search (no/name/email/subject/order/payment),
  pagination, spam folder.
- **Admin actions**: reply (with reply-template inserter, `{name}`/`{order}`
  placeholders), reply-and-set-status, internal note, status, priority, assign
  staff, merge into another ticket, mark spam, delete (with attachment cleanup),
  print/PDF, CSV export.
- **Extras**: satisfaction rating (1–5 stars + comment) on resolved/closed,
  knowledge-base suggestions on the form (float matching category to top),
  customer ticket history + matched-order panel on the admin view, duplicate
  detection (same email + subject within 24 h → no second ticket, link re-sent),
  spam heuristics (honeypot, link count, keyword patterns; score ≥ 8 →
  quarantined), attachment download logging, full audit timeline,
  **auto-close** of resolved/waiting tickets after N days of inactivity
  (checked opportunistically when the admin list loads).

## Security

- CSRF token verified on every POST (multipart routes verify after multer parses).
- SQL injection: prepared statements only. XSS: every user value rendered with
  escaped `<%= %>`.
- Uploads: extension + MIME whitelist, 10 MB/3-file limits, **magic-byte
  verification on disk** (a renamed .exe is deleted), random stored filenames,
  saved under git-ignored `data/support-uploads/` (NOT web-served) and delivered
  only through the gated `/support/attachment/:id` route with
  `X-Content-Type-Options: nosniff`.
- Rate limits: 5 ticket creations + 20 replies per IP per hour; guest math captcha.
- Guest ticket access only via unguessable 48-hex-char token; admins gated by
  the existing role middleware; Helmet CSP untouched.

## Configuration

| Setting | Where | Default |
|---|---|---|
| `ADMIN_EMAIL` | `.env` | — (admin alert emails skip with a logged reason if unset) |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM` | `.env` | already used by order emails |
| `SUPPORT_AUTOCLOSE_DAYS` | `.env` | 7 |
| Categories + default priorities | `/admin/support` settings panel | 12 seeded |
| Reply templates | `/admin/support` settings panel | 3 seeded |

## Install / deploy

1. `git push` → hPanel **Deploy** → restart the Node app. On boot the schema is
   created automatically (`[support] schema ready` in the log). Nothing else is
   required.
2. Optional sample data: `node scripts/seed-support-demo.js` (3 clearly-marked
   demo tickets; skips itself if any real ticket exists).
3. Verify: open `/support`, submit a test ticket, then check `/admin/support`.

## Deliberate adaptations (and why)

- **Node instead of PHP** — see the top of this file; per "whatever best
  according to our web portal".
- **Site CSS instead of Bootstrap 5** — the portal has its own design system
  (`main.css`); loading Bootstrap globally would clash with every existing page
  and require CSP changes. `public/css/support.css` implements the same UI
  (cards, badges, responsive tables, dark mode, print styles) in the site's look.
- **No live typing indicator** — needs WebSockets, which the portal (and the
  Hostinger Node setup) doesn't run; unread badges + 60 s polling cover the need.
- **PDF export via print view** — `/admin/support/:id/print` + browser
  "Save as PDF" produces the same artifact with zero PDF dependencies.
