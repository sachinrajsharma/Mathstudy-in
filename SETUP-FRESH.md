# Fresh deploy on Hostinger Cloud plan (blank DB)

The old Node DB has nothing worth keeping, so we start blank and rebuild from the
seed scripts + the WordPress import. End result: working shop (Node prices +
Google-Drive delivery) + 437 imported WP blogs at their original root URLs.

## 1. Create the database
hPanel → **Databases → MySQL → Create** a new blank DB. Note name / user / password.

## 2. Create the Node website
hPanel → **Websites → Node.js → Add website** → connect repo
`sachinrajsharma/Mathstudy-in`, branch **`wp-import`** (merge to `master` after you verify).
Tip: point it at a **test subdomain** first (e.g. `test.mathstudy.in`), verify, then
swap `mathstudy.in` over and delete WordPress.

## 3. Environment variables (Node app panel)
```
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=<from step 1>
DB_PASS=<from step 1>
DB_NAME=<from step 1>
SESSION_SECRET=<long random string>
BASE_URL=https://mathstudy.in          # or the test subdomain while testing
ADMIN_EMAIL=admin@mathstudy.in
ADMIN_PASSWORD=<choose one>
# plus any mail/UPI vars already in .env.example
```
Do **not** set PORT (Hostinger assigns it).

## 4. Upload the two things git does NOT carry
Via hPanel File Manager, into the app folder:
- `public/wp-content/uploads/`  — 449 images + free PDFs (97 MB)
- `data/ebooks/`                — 27 e-book PDFs, local download fallback (115 MB)
- `data/download-urls.json`     — the **secret** Google-Drive delivery map (gitignored).
  Copy it from the old server (its File Manager) if it isn't already here.

## 5. Build the site (one command)
```
node scripts/setup-fresh.js
```
Runs everything in order: schema + admin → products + Node pricing → bundle pricing →
SEO → Google-Drive links → curated blogs → 437 WP posts → fix covers. Idempotent —
safe to re-run if a step fails.

## 6. Verify, then go live
- `/` , `/shop` (covers + prices show), `/blog`, an old post e.g.
  `/2nd-grade-math-worksheets/` (content + images render).
- Buy-flow: add to cart → UPI confirm → the e-book delivers (Drive link).
- Enable **SSL + Force HTTPS**, submit `/sitemap.xml` in Search Console.
- Merge `wp-import` → `master`, point `mathstudy.in` at this app, delete WordPress,
  then release the separate server (within the 30-day refund window).
