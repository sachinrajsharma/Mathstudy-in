# MathStudy.in — Complete Project & Deployment Guide

A plain-English reference for **what this website is built with**, **what every file
does**, and **exactly how it was taken from code on a desktop to a live server**.
Written for learning — keep it for future reference.

- **Live site:** https://mathstudy.in
- **What it is:** a premium Maths **e-book shop** (browse → add to cart → pay by UPI → admin approves → buyer gets a secure download link).
- **Code:** Node.js + Express app, hosted on a Hostinger **VPS** (Ubuntu), behind **Cloudflare**.

---

## 1. Tech stack (and what each piece does)

| Layer | Technology | What it does (plain English) |
|---|---|---|
| **Server OS** | Ubuntu (Linux) on a Hostinger **VPS** | The computer in the cloud that runs everything. |
| **Runtime** | **Node.js 20** | Runs our JavaScript app on the server. |
| **Web framework** | **Express** | Handles web requests (URLs) and sends back pages. |
| **Templating** | **EJS** + express-ejs-layouts | Turns data into HTML pages (the `.ejs` files). |
| **Database** | **MySQL 8** (`mysql2` driver) | Stores products, orders, users, blogs, reviews. |
| **Sessions** | express-session + **express-mysql-session** | Remembers who's logged in (stored in the DB). |
| **Passwords** | **bcryptjs** | Stores passwords as secure one-way hashes. |
| **Security headers** | **helmet** | Adds protective HTTP headers (CSP, HSTS…). |
| **Rate limiting** | express-rate-limit | Blocks brute-force/abuse on login, downloads, API. |
| **File uploads** | **multer** | Handles cover-image / PDF uploads in admin. |
| **Email** | **nodemailer** | Sends order + download emails (via SMTP). |
| **Config** | **dotenv** (`.env`) | Loads secrets/settings without putting them in code. |
| **Process manager** | **PM2** | Keeps the app running 24/7, restarts on crash/reboot. |
| **Reverse proxy** | **Nginx** | Public front door; forwards web traffic to the app, serves HTTPS. |
| **DNS + CDN + SSL + WAF** | **Cloudflare** | Points the domain to the server, hides the origin, caches, and protects. |
| **Payments** | Manual **UPI** (QR) + admin approval | Buyer pays to your UPI ID; you approve; link is released. |
| **File delivery** | Google Drive links (server-side only) | The actual e-book files, revealed only via a signed token. |
| **Code hosting** | Git + **GitHub** (private repo) | Version control; the server pulls code via a read-only deploy key. |

### How a request flows (the big picture)
```
   Visitor's browser
        │  https://mathstudy.in
        ▼
   ☁️  CLOUDFLARE   (DNS · proxy/hide origin · SSL · cache · WAF)
        │  https (Full strict, using the Origin certificate)
        ▼
   🖥️  VPS — NGINX  (:443, reverse proxy)
        │  http://127.0.0.1:3001
        ▼
   ⚙️  NODE / EXPRESS app  (run by PM2)
        │
        ▼
   🗄️  MySQL database  (localhost:3306)
```

---

## 2. Folder & file map — what each part represents

```
mathstudy/
├── server.js              ← THE MAIN APP: all routes + middleware live here
├── ecosystem.config.js    ← PM2 config (how to run the app in production)
├── package.json           ← lists the Node libraries the app needs
├── .env                   ← SECRETS/settings (NOT in GitHub; lives on server only)
├── .env.example           ← a template showing which settings exist
│
├── views/                 ← all the HTML pages (EJS templates)
├── public/                ← static files served as-is (CSS, JS, images)
├── lib/                   ← reusable helper modules
├── scripts/               ← one-off command-line tools (DB setup, seeders, etc.)
├── data/                  ← runtime data (e.g. secret download links — git-ignored)
├── deploy/                ← deployment configs (Nginx)
│
├── DEPLOY.md              ← server setup runbook
├── MIGRATION.md           ← WordPress → VPS cutover runbook (Cloudflare)
├── ADMIN.md               ← how to log into admin + database
├── SECURITY.md            ← security audit + what was hardened
└── PROJECT-GUIDE.md       ← (this file)
```

### `views/` — the pages (EJS = HTML with data slotted in)
| File | What it is |
|---|---|
| `layout.ejs` | The shared frame (nav bar, footer, `<head>`, WhatsApp button) wrapped around every page. |
| `home.ejs` | Homepage. |
| `shop.ejs` | Shop listing (all products, search, filters). |
| `category.ejs` | A single category's products. |
| `product.ejs` | One product page (price, description, reviews, add-to-cart). |
| `cart.ejs` | Shopping cart + UPI payment QR popup. |
| `dashboard.ejs` | Logged-in user's account — purchases, downloads, **Change password**, Admin link. |
| `account-password.ejs` | The change-password page (`/account/password`). |
| `blog.ejs` / `blog-post.ejs` | Blog list / single article. |
| `contact.ejs` | Contact & Support page (WhatsApp + enquiry form). |
| `error.ejs` | Friendly 404 / 500 / 403 page (never leaks technical details). |
| `auth/login.ejs` / `auth/register.ejs` | Sign-in / sign-up forms. |
| `admin/index.ejs` | Admin dashboard home. |
| `admin/products.ejs` / `admin/product-form.ejs` | Manage / add-edit products (with image + PDF upload). |
| `admin/categories.ejs` | Manage categories. |
| `admin/orders.ejs` | View orders, approve/reject payments. |
| `admin/blog.ejs` / `admin/blog-form.ejs` | Manage / write blog posts. |
| `admin/users.ejs` | View users. |
| `partials/admin-sidebar.ejs` | The admin menu, reused on every admin page. |

### `lib/` — helper modules (logic reused across routes)
| File | What it does |
|---|---|
| `password.js` | bcrypt hashing + verify (with legacy-SHA256 fallback that auto-upgrades). |
| `orders.js` | Order logic — approve/reject an order, issue download tokens. |
| `notify.js` | Sends emails (new-order alert to admin, download link to buyer). |
| `seo.js` | Builds SEO/meta + JSON-LD structured data for pages. |

### `scripts/` — command-line tools (run with `node scripts/<name>.js`)
| File | What it does |
|---|---|
| `setup-db.js` | Creates all database tables + the admin user (run once at setup). |
| `migrate-approval.js` | Adds order-approval columns (admin_token, download_url, etc.). |
| `migrate-sales.js` | Adds the reviews table + product bundle support. |
| `seed-products.js` | Loads the product catalogue into the DB. |
| `seed-bundles-pricing.js` | Sets sale prices + creates bundle products. |
| `seed-product-seo.js` | Fills in SEO titles/descriptions for products. |
| `seed-blog-articles.js` | Publishes the starter blog posts. |
| `seed-class12-new.js` | (extra Class-12 product seed) |
| `set-password.js` | Reset any user's password: `node scripts/set-password.js <email> "<newpass>"`. |
| `remove-tuition-blogs.js` | Cleanup tool (removed the old home-tuition posts). |
| `import-download-urls.js` | Loads the secret e-book download links from `data/download-urls.json`. |

### `public/` — static assets (served directly to the browser)
| File | What it is |
|---|---|
| `css/main.css` | All the styling. |
| `js/main.js` | Browser JavaScript (mobile nav, add-to-cart, and the CSRF token auto-attach for AJAX). |

---

## 3. URL → code map (the route table)

`server.js` defines every URL. `GET` = view a page, `POST/PATCH/DELETE` = perform an action.

### Public (shopping)
| URL | What it shows / does |
|---|---|
| `GET /` | Homepage (`home.ejs`) |
| `GET /shop` | All products (`shop.ejs`) |
| `GET /shop/category/:slug` | Category page (`category.ejs`) |
| `GET /shop/product/:slug` | Product page (`product.ejs`) |
| `POST /shop/product/:id/review` | Submit a product review |
| `GET /cart` | Cart + UPI payment (`cart.ejs`) |
| `POST /cart/add` · `POST /cart/remove` | Add / remove cart item (AJAX) |
| `POST /checkout/upi-confirm` | Buyer taps "I've paid" → creates a pending order |
| `GET /blog` · `GET /blog/:slug` | Blog list / article |
| `GET /contact` · `POST /contact` | Contact page / send enquiry |
| `GET /sitemap.xml` · `GET /robots.txt` | SEO files for Google |

### Accounts
| URL | Purpose |
|---|---|
| `GET/POST /auth/register` | Create account |
| `GET/POST /auth/login` | Sign in (rate-limited: 10 tries / 15 min) |
| `POST /auth/logout` | Sign out |
| `GET /dashboard` | User's orders + downloads |
| `GET/POST /account/password` | Change password |
| `GET /download/:token` | Secure, expiring download link (only for the buyer) |

### Admin (role-protected — `requireAdmin`)
| URL | Purpose |
|---|---|
| `GET /admin` | Admin dashboard |
| `GET /admin/products` … `/new` … `/:id/edit` | List / add / edit products |
| `POST /admin/products/:id/upload-pdf` | Upload an e-book PDF |
| `POST /admin/products/:id/toggle` · `/delete` | Publish toggle / delete |
| `GET/POST /admin/categories` … | Manage categories |
| `GET /admin/orders` + `POST /admin/orders/:id/approve` | Review & approve/reject payments |
| `GET /admin/blog` … `/new` … `/:id/edit` | Manage blog |
| `GET /admin/users` | View users |
| `GET /order-action/:id/:action` | Approve/reject straight from the order email (token-secured) |

---

## 4. Database tables (created by `setup-db.js` + migrations)

| Table | Holds |
|---|---|
| `users` | Accounts (name, email, bcrypt password hash, role). |
| `categories` | Product categories. |
| `products` | E-books (title, price, description, cover, PDF/download link, bundle items). |
| `orders` | Orders (amount, status, admin approval token, customer phone/note). |
| `order_items` | Which products are in each order. |
| `download_tokens` | One-time, expiring download permissions per buyer. |
| `product_reviews` | Star ratings + reviews. |
| `blogs` | Blog posts. |
| `sessions` | Active login sessions (so logins survive restarts). |

---

## 5. How it went live — desktop → live server (the full journey)

This is the exact path we followed.

### Phase A — On the desktop (preparation)
1. Built & tested the Node/Express shop locally.
2. Removed unused features (home-tuition, Telegram, Razorpay) to keep it a clean e-book shop.
3. **Security hardening:** bcrypt passwords, CSRF tokens on all forms, MySQL session store, `trust proxy` for secure cookies, scanner/WordPress-probe blocklist, stricter rate limits, security headers; `npm audit` → 0 vulnerabilities.
4. Committed everything to the **private GitHub repo**.

### Phase B — Create & access the server
5. Bought a **Hostinger VPS**, installed **Ubuntu**, set a root password + **SSH key** (key-based login = much safer than passwords).
6. Logged in over SSH: `ssh root@SERVER_IP`.

### Phase C — Install the software
7. Updated Ubuntu: `apt update && apt upgrade -y`.
8. Installed **Node.js 20, MySQL, Nginx, Git, PM2**.

### Phase D — Database
9. Created the `mathstudy` database + a **limited DB user** (security: it can only touch its own database).

### Phase E — Get the code onto the server
10. Added a GitHub **read-only deploy key** to the server.
11. `git clone` the repo to `/var/www/mathstudy`.
12. `npm ci --omit=dev` (install production libraries).
13. Created the **`.env`** file with the real settings (DB password, a random `SESSION_SECRET`, admin email/password). Secrets live only here, on the server.

### Phase F — Build the database & start the app
14. `node scripts/setup-db.js` → tables + admin user.
15. `node scripts/migrate-approval.js` + `migrate-sales.js` → extra columns/tables.
16. Ran the **seeders** → products, bundles, SEO, blog posts.
17. `pm2 start ecosystem.config.js --env production` → app online.
18. `pm2 save` + `pm2 startup` → app **auto-restarts on reboot**.

### Phase G — Put it on the internet (Nginx + HTTPS)
19. Configured **Nginx** to forward web traffic → the app (`127.0.0.1:3001`).
20. Confirmed reachability by raw **IP**.
21. Created a **Cloudflare Origin Certificate**, saved it on the server, and pointed Nginx at it (HTTPS).
22. Cloudflare SSL mode = **Full (strict)**.

### Phase H — Test safely, then go live
23. Pointed **staging.mathstudy.in** at the server (proxied) and tested the **real HTTPS site** end-to-end (shop, login, admin, change password) — all while WordPress stayed live.
24. **Cutover:** changed the `mathstudy.in` DNS A-record in Cloudflare to the VPS IP → **LIVE.**
25. Purged Cloudflare cache; verified the new site loads with a padlock.

### Safety nets kept throughout
- **Email untouched** (MX/DKIM/SPF unchanged) → mail keeps working.
- **Instant rollback** → point the DNS A-record back to the old WordPress IP.
- **Old WordPress kept running** for a while as backup.

---

## 6. Day-2 operations (running the live site)

**Deploy a code update** (after you push new code to GitHub):
```bash
cd /var/www/mathstudy
git pull
npm ci --omit=dev          # only if libraries changed
pm2 reload ecosystem.config.js --env production
```

**Check status / logs**
```bash
pm2 status
pm2 logs mathstudy --lines 100
```

**Restart the app**
```bash
pm2 restart mathstudy
```

**Reset a password**
```bash
node scripts/set-password.js udgamsachin@gmail.com "NewStrongPassword"
```

**Database backup (recommended as a nightly cron)**
```bash
mysqldump -u mathstudy -p mathstudy | gzip > ~/backup-$(date +%F).sql.gz
```

**Rollback to WordPress (emergency):** in Cloudflare, set the `mathstudy.in`
A-record back to `89.116.138.54`.

---

## 7. Security measures in place (why it's safer than the old WordPress)
- Passwords hashed with **bcrypt**; no default admin password in the code.
- **CSRF protection** on every form + AJAX request.
- **Login rate-limiting** (stops password-guessing bots).
- **Scanner blocklist** — instant 404 for `/wp-login.php`, `/xmlrpc.php`, `*.php`, `/.env`, `/.git`, etc.
- **Security headers** via Helmet (CSP, HSTS, clickjacking protection).
- **Sessions in MySQL**, secure + httpOnly + sameSite cookies.
- **Cloudflare** in front (hides server IP, blocks attacks, free WAF available).
- **Limited DB user** (can't touch anything outside its own database).
- Dependencies clean (`npm audit` = 0 vulnerabilities).

---

## 8. Things to finish before taking real orders
1. **Confirm the UPI ID** customers pay to (set in `server.js`, line ~504: `9873742245@ybl`).
2. **Configure SMTP** in `.env` so order + download emails actually send.
3. **Upload the e-book download links** (`data/download-urls.json` → `node scripts/import-download-urls.js`), or paste each link in the admin product editor.
4. Do **one real test order** end-to-end (pay → approve → download).

## 9. Future / optional
- Lock the server's firewall to **Cloudflare-only IPs** (extra hardening).
- Turn on **Cloudflare WAF / Bot Fight Mode**.
- Add **vidaara.org** as a second site on this same VPS (same steps; its own Nginx block, port, database).
- Add **admin 2FA**.

---

## 10. Mini-glossary
- **VPS** — a private virtual server you fully control.
- **SSH** — secure remote terminal into the server.
- **Nginx** — the web server that takes public traffic and passes it to your app.
- **PM2** — keeps your Node app alive and restarts it automatically.
- **Reverse proxy** — Nginx receiving on port 443 and forwarding to the app on 3001.
- **.env** — a file of secrets/settings, never committed to GitHub.
- **DNS A-record** — maps your domain name to the server's IP address.
- **Cloudflare proxy (orange cloud)** — traffic goes *through* Cloudflare (protection + the Origin cert is used).
- **Origin Certificate** — a Cloudflare-issued cert the server uses; trusted by Cloudflare (not browsers directly), which is why the domain must stay proxied.
- **CSRF token** — a per-session secret that proves a form submission came from your own site.
- **Seeder** — a script that fills the database with starting data.
- **Migration** — a script that changes the database structure (adds tables/columns).
