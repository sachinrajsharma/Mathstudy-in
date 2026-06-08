# MathStudy.in — Go-Live Migration (Hostinger VPS + Cloudflare)

Your situation:
- **Old site:** WordPress on Hostinger shared hosting — apex `mathstudy.in` → `89.116.138.54` (live now).
- **DNS:** managed at **Cloudflare** (nameservers `venus/vick.ns.cloudflare.com`), apex is **proxied** (orange cloud).
- **Email:** Hostinger mail — `MX mx1/mx2.hostinger.com`, `hostingermail-*` DKIM CNAMEs, SPF TXT.
- **New site:** this Node/Express e-book shop, going onto a **Hostinger VPS (Ubuntu)**.

> ⚠️ **This is a REPLACEMENT, not a content migration.** The new site is a fresh
> Node shop with its own products/blog. After cutover, your old WordPress content
> will no longer be served at `mathstudy.in`. **Back up the WordPress site first**
> (see Phase 0) and keep the old hosting running until you've verified the new one.

The strategy is **test-first, flip-last, instant-rollback**: build + fully test the
VPS over its raw IP while WordPress stays live, then change one DNS record to cut over.

---

## Phase 0 — Pre-flight (do before touching anything)

1. **Back up the old WordPress site** (in case you ever want its content):
   - Hostinger hPanel → Websites → mathstudy.in → **Backups** → create/download a full backup (files + DB).
2. **You already exported the Cloudflare DNS zone** (`mathstudy.in.txt`). Keep it — it's your DNS rollback reference.
3. **What will NOT change** (leave these Cloudflare records exactly as they are):
   - `MX` (mx1/mx2.hostinger.com) — **email keeps working**.
   - `hostingermail-a/b/c._domainkey` CNAMEs (DKIM) and the SPF `TXT` — **email auth**.
   - All cPanel/WHM subdomains on `149.28.140.74` (`cpanel`, `whm`, `webmail`, `forum`, `e-learning`, `theme`, …). Untouched.
4. **What WILL change** (only the website origin):
   - `mathstudy.in` A record: `89.116.138.54` → **NEW VPS IP**.
   - add `www` A record → **NEW VPS IP** (there isn't one today; the app redirects www → apex).

---

## Phase 1 — Create the VPS

On the Hostinger "Choose what to install" screen:
- Pick the **Plain OS** tab → **Ubuntu** (choose **Ubuntu 24.04 LTS** or **22.04 LTS**).
  - Do **not** pick a Control panel / Application / WordPress template — this runbook is plain Ubuntu + Nginx + PM2.
- Set a strong root password (save it).
- After it provisions, note the VPS **public IPv4** — call it **`SERVER_IP`**.

---

## Phase 2 — Base server setup

SSH in (`ssh root@SERVER_IP`) and follow **`DEPLOY.md` Steps 1–2** in this repo:
- create the `deploy` user + `ufw` firewall,
- install Node 20, MySQL 8, Nginx, PM2, Certbot.

(Everything in DEPLOY.md applies; this file only adds the Cloudflare/migration specifics.)

---

## Phase 3 — Database, code & secrets

Follow **`DEPLOY.md` Steps 3–5**:
- create the `mathstudy` database + a dedicated DB user,
- `git clone` the repo to `/var/www/mathstudy`, `npm ci --omit=dev`,
- create `.env` (set `NODE_ENV=production`, `BASE_URL=https://mathstudy.in`,
  `SESSION_SECRET=$(openssl rand -base64 48)`, DB creds, SMTP, `ADMIN_EMAIL`),
- `scp` up the git-ignored secrets: `data/download-urls.json` and the product PDFs,
- run `node scripts/setup-db.js` + the seeders,
- `pm2 start ecosystem.config.js --env production` → `pm2 save` → `pm2 startup`.

Confirm the app is up locally on the box:
```bash
curl -I http://127.0.0.1:3001/        # expect 200
```

---

## Phase 4 — Test over the raw IP (WordPress still live, DNS untouched)

Put Nginx in front so you can reach the app from your browser by IP, **before** any DNS change.

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/mathstudy.in
sudo ln -s /etc/nginx/sites-available/mathstudy.in /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Now visit **`http://SERVER_IP/`** in your browser. Test thoroughly (this is your one
chance before real users see it):
- home, `/shop`, open a product, **add to cart**, **register/login** (confirms the
  session-cookie fix works), `/blog`, `/contact`, admin login at `/admin`.
- place a **test order** end-to-end → confirm you get the **email** order alert →
  Approve via the email link → confirm the buyer download email.

Only proceed once everything works over the IP. WordPress is still serving real
visitors this whole time.

---

## Phase 5 — SSL certificate (recommended: Cloudflare Origin Certificate)

Because your domain stays **proxied** through Cloudflare, the cleanest cert is a
**Cloudflare Origin Certificate** — free, valid 15 years, no DNS-timing dance, and
the proxy stays on (keeps DDoS protection + caching). Browsers trust Cloudflare's
edge; Cloudflare trusts this origin cert.

1. Cloudflare dashboard → **SSL/TLS → Origin Server → Create Certificate**.
   - Hostnames: `mathstudy.in` and `*.mathstudy.in`. Leave RSA, 15 years. Create.
   - Copy the **Origin Certificate** and the **Private Key** (shown once).
2. On the VPS, save them:
```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/mathstudy.in.pem   # paste the Origin Certificate
sudo nano /etc/ssl/cloudflare/mathstudy.in.key   # paste the Private Key
sudo chmod 600 /etc/ssl/cloudflare/mathstudy.in.key
```
3. Replace the Nginx site with an HTTPS server block. `sudo nano /etc/nginx/sites-available/mathstudy.in`:
```nginx
server { listen 80; listen [::]:80; server_name mathstudy.in www.mathstudy.in; return 301 https://mathstudy.in$request_uri; }

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.mathstudy.in;
    ssl_certificate     /etc/ssl/cloudflare/mathstudy.in.pem;
    ssl_certificate_key /etc/ssl/cloudflare/mathstudy.in.key;
    return 301 https://mathstudy.in$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name mathstudy.in;
    ssl_certificate     /etc/ssl/cloudflare/mathstudy.in.pem;
    ssl_certificate_key /etc/ssl/cloudflare/mathstudy.in.key;

    client_max_body_size 25m;
    gzip on; gzip_proxied any; gzip_comp_level 5; gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml application/xml;

    location ~* \.(?:css|js|woff2?|ttf|eot|svg|png|jpe?g|gif|ico|webp)$ {
        proxy_pass http://127.0.0.1:3001; proxy_set_header Host $host;
        expires 7d; add_header Cache-Control "public, max-age=604800"; access_log off;
    }
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```
```bash
sudo nginx -t && sudo systemctl reload nginx
```

> Alternative (if you ever turn the proxy OFF): use Let's Encrypt instead — set the
> apex/www records to **DNS only (grey cloud)** first, run
> `sudo certbot --nginx -d mathstudy.in -d www.mathstudy.in`, then proceed.

---

## Phase 6 — Cutover (the actual go-live)

In the **Cloudflare dashboard → DNS → Records**:

1. Edit the `A` record for **`mathstudy.in`**: change content `89.116.138.54` → **`SERVER_IP`**. Keep **Proxied (orange)**. Save.
2. **Add** an `A` record: name `www`, content **`SERVER_IP`**, **Proxied (orange)**. Save.
3. Go to **SSL/TLS → Overview** and set the mode to **Full (strict)**.
   (Flexible would cause a redirect loop because our origin forces HTTPS — do not use Flexible.)

Cloudflare changes propagate in seconds (it's a proxy). Within ~1–2 minutes:
```text
https://mathstudy.in        → new shop, valid padlock
https://www.mathstudy.in    → redirects to https://mathstudy.in
http://mathstudy.in         → redirects to https://
https://mathstudy.in/robots.txt and /sitemap.xml → load
```
Re-test the critical flow on the **real domain**: login, add to cart, place a test
order, receive the email alert, approve, download.

---

## Phase 7 — Post-cutover housekeeping

- Cloudflare → **SSL/TLS → Edge Certificates → Always Use HTTPS: ON**, and enable
  **Automatic HTTPS Rewrites**.
- Cloudflare → **Caching → Configuration → Purge Everything** once (clears any old
  WordPress pages cached at the edge).
- Google Search Console: resubmit `https://mathstudy.in/sitemap.xml`.
- Keep the **old Hostinger WordPress hosting running for ~1 week** as a safety net.
  Don't cancel it until you're confident.

---

## Phase 8 — Rollback (if anything goes wrong)

Instant revert — in Cloudflare DNS:
1. Edit `mathstudy.in` A record back to **`89.116.138.54`**.
2. Delete (or repoint) the `www` A record you added.
3. If you switched SSL mode, set it back to what it was (WordPress on Hostinger
   typically works on **Full**).
Within a minute traffic is back on WordPress. Then debug the VPS at your leisure
over `http://SERVER_IP`.

---

## Appendix A — Email is safe

You are only changing the **website** A records. The `MX`, `hostingermail-*` DKIM
CNAMEs and SPF `TXT` stay pointed at Hostinger, so **sending/receiving email on
@mathstudy.in keeps working** throughout. (Your app's *outbound* order emails use
your SMTP creds in `.env`, independent of all this.)

## Appendix B — Optional hardening (after it's stable)

Lock the origin so visitors can only reach it through Cloudflare (stops people
hitting `SERVER_IP` directly):
```bash
# allow only Cloudflare's IP ranges to reach 80/443, plus your SSH
for ip in $(curl -s https://www.cloudflare.com/ips-v4); do sudo ufw allow from $ip to any port 80,443 proto tcp; done
sudo ufw delete allow 'Nginx Full'   # remove the open-to-all rule
```
(Do this only **after** cutover is verified, or you'll lock yourself out of IP testing.)

## Appendix C — Common gotchas (already handled / watch for)

- **Redirect loop / "too many redirects"** → Cloudflare SSL mode is *Flexible*. Set **Full (strict)**. ✅ covered in Phase 6.
- **Can't stay logged in / cart empties** → missing `trust proxy`. ✅ fixed in `server.js`.
- **502 Bad Gateway** → the Node app isn't running. Check `pm2 status` / `pm2 logs mathstudy`.
- **Uploads fail** → raise `client_max_body_size` in Nginx (set to 25m above).
- **DNS still shows old site** → Cloudflare cache; do Phase 7 "Purge Everything", and hard-refresh / try incognito.
