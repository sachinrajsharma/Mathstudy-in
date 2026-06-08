# MathStudy.in — Production Deployment (VPS)

Go-live runbook for the Node/Express + MySQL shop (`server.js`) on a Linux VPS
(DigitalOcean / Hetzner / AWS EC2), behind Nginx with a Let's Encrypt SSL cert,
kept alive by PM2.

> The `api/` (Laravel) and `frontend/` (Next.js) folders are scaffolds and are
> **not** deployed. The live site is the Express app at the repo root.

Target stack: **Ubuntu 22.04 LTS · Node 20 LTS · MySQL 8 · Nginx · PM2 · Certbot**

---

## 0. Before you start — what only you can do

- A VPS with a public IPv4 (note it as `SERVER_IP`).
- DNS for `mathstudy.in` you control (Step 6).
- Real credentials for the `.env` (Step 4): SMTP user/app-password + admin email,
  and your UPI ID for payments.
- The sellable PDFs and the secret Google-Drive download links
  (`data/download-urls.json` — git-ignored, copy it up manually in Step 4).

---

## 1. Create & secure the server

SSH in as root, create a deploy user, enable the firewall:

```bash
adduser deploy && usermod -aG sudo deploy
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
# (optional) copy your SSH key:  ssh-copy-id deploy@SERVER_IP
```

Continue as `deploy`:

```bash
ssh deploy@SERVER_IP
```

## 2. Install Node 20, MySQL 8, Nginx, PM2, Certbot

```bash
sudo apt update && sudo apt -y upgrade
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx git
sudo npm install -g pm2
sudo apt install -y certbot python3-certbot-nginx
node -v && mysql --version && nginx -v
```

## 3. Create the database & a dedicated DB user

```bash
sudo mysql
```
```sql
CREATE DATABASE mathstudy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mathstudy'@'localhost' IDENTIFIED BY 'PUT_A_STRONG_DB_PASSWORD';
GRANT ALL PRIVILEGES ON mathstudy.* TO 'mathstudy'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> Use this user/password in `.env` (do **not** run the app as MySQL `root`).

## 4. Get the code & configure secrets

```bash
sudo mkdir -p /var/www && sudo chown deploy:deploy /var/www
cd /var/www
git clone https://github.com/sachinrajsharma/Mathstudy-in.git mathstudy
cd mathstudy
npm ci --omit=dev          # install production deps only
mkdir -p logs              # PM2 log dir
```

Create the production `.env` (start from the template, then edit):

```bash
cp .env.example .env
nano .env
```

Set these for production:

```
NODE_ENV=production
PORT=3001
BASE_URL=https://mathstudy.in
SESSION_SECRET=<run: openssl rand -base64 48>
DB_HOST=localhost
DB_PORT=3306
DB_USER=mathstudy
DB_PASS=<the strong DB password from Step 3>
DB_NAME=mathstudy
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your smtp user>
SMTP_PASS=<app password>
MAIL_FROM="MathStudy.in <admin@mathstudy.in>"
ADMIN_EMAIL=<your admin email>
```

> Payments are **manual UPI** (no gateway keys). WhatsApp is **free click-to-chat**
> (a `wa.me` link in the UI) — no API key. Order alerts reach you by **email**.

Copy up the **git-ignored** secret download links (from your Windows machine):

```bash
# from F:\MATHSTUDY on your PC:
scp data/download-urls.json deploy@SERVER_IP:/var/www/mathstudy/data/
```

Upload the sellable PDFs to `public/uploads/products/` (also git-ignored) if the
app serves them from disk; otherwise they are pulled from Drive at click time.

## 5. Initialise the schema, then start with PM2

```bash
node scripts/setup-db.js          # creates tables
node scripts/seed-products.js     # seed catalog (run the seeders you need)
node scripts/seed-blog-articles.js
node scripts/seed-bundles-pricing.js
node scripts/seed-product-seo.js

pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup            # run the command it prints (enables boot-start)
curl -I http://127.0.0.1:3001/      # expect HTTP 200
```

## 6. DNS — point the domain at the server

At your DNS provider for `mathstudy.in`:

| Type | Host | Value        | TTL |
|------|------|--------------|-----|
| A    | `@`  | `SERVER_IP`  | 300 |
| A    | `www`| `SERVER_IP`  | 300 |

Wait for propagation (`dig +short mathstudy.in` should return `SERVER_IP`).

## 7. Nginx reverse proxy + HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/mathstudy.in
sudo ln -s /etc/nginx/sites-available/mathstudy.in /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Issue + auto-install the SSL certificate (only after DNS resolves):
sudo certbot --nginx -d mathstudy.in -d www.mathstudy.in
# choose "redirect HTTP -> HTTPS". Auto-renew is installed by certbot.
```

## 8. Go-live verification

```bash
curl -I https://mathstudy.in/                 # 200, valid cert
curl -s https://mathstudy.in/robots.txt | head
curl -s https://mathstudy.in/sitemap.xml | head
```

Then in a browser confirm: home, `/shop`, a product page, add-to-cart, the UPI
checkout/QR, admin login at `/admin`, and that a test order fires the email
order alert.

---

## Day-2 operations

**Deploy an update**
```bash
cd /var/www/mathstudy
git pull
npm ci --omit=dev
pm2 reload ecosystem.config.js --env production   # zero-downtime
```

**Logs / status**
```bash
pm2 status
pm2 logs mathstudy --lines 100
```

**Rollback**
```bash
git checkout <previous-good-commit>
npm ci --omit=dev && pm2 reload ecosystem.config.js --env production
```

**Nightly DB backup (cron)**
```bash
mkdir -p ~/backups
( crontab -l 2>/dev/null; echo '0 2 * * * mysqldump -u mathstudy -p"PASS" mathstudy | gzip > ~/backups/mathstudy-$(date +\%F).sql.gz' ) | crontab -
```

**Log rotation**
```bash
pm2 install pm2-logrotate
```

---

## Production checklist

- [ ] `.env` has real SMTP, admin email, your UPI ID, strong `SESSION_SECRET`
- [ ] `NODE_ENV=production`, `BASE_URL=https://mathstudy.in`
- [ ] DB user is the dedicated `mathstudy` user (not root)
- [ ] `data/download-urls.json` + product PDFs uploaded (git-ignored)
- [ ] DNS A records for `@` and `www` → `SERVER_IP`
- [ ] HTTPS issued, HTTP→HTTPS redirect on
- [ ] `pm2 save` + `pm2 startup` done (survives reboot)
- [ ] ufw enabled (OpenSSH + Nginx Full only)
- [ ] Test order completes end-to-end (QR → approve → download)
- [ ] Nightly mysqldump cron set
