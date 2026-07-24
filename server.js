require('dotenv').config();
const express        = require('express');
const expressLayouts = require('express-ejs-layouts');
const session        = require('express-session');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const mysql          = require('mysql2/promise');
const path           = require('path');
const crypto         = require('crypto');
const multer         = require('multer');
const fs             = require('fs');
const notify         = require('./lib/notify');
const ordersLib      = require('./lib/orders');
const seo            = require('./lib/seo');
const password       = require('./lib/password');
const MySQLStore     = require('express-mysql-session')(session);

const app  = express();
app.locals.siteJsonLd = seo.siteJsonLd();
const PORT = process.env.PORT || 3001;
const BASE_URL = (process.env.BASE_URL || 'https://mathstudy.in').replace(/\/+$/, '');
// Facebook, WhatsApp, LinkedIn and X all reject a relative og:image, so the
// layout needs the site origin to turn '/wp-content/...' into a full URL.
app.locals.SITE_URL = BASE_URL;

// Convert a Google-Drive "view" link into a direct-download link at click time
// (the raw link is never exposed to the browser before a paid+approved token).
function driveDownloadUrl(url) {
  const m = String(url || '').match(/\/d\/([^/]+)/) || String(url || '').match(/[?&]id=([^&]+)/);
  return m ? 'https://drive.google.com/uc?export=download&id=' + m[1] : url;
}

// ── MySQL pool ───────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
  waitForConnections: true,
  connectionLimit: 10
});

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'",
                   "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com",
                   "https://cdn.jsdelivr.net", "https://cdn.quilljs.com",
                   "https://www.googletagmanager.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com",
                   "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net",
                   "https://cdn.quilljs.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
      imgSrc:     ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdn.quilljs.com",
                   "https://*.google-analytics.com", "https://*.analytics.google.com", "https://www.googletagmanager.com"],
      scriptSrcAttr:  ["'unsafe-inline'"]
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Drop common vulnerability scanners / WordPress & PHP probes fast (this is a Node app,
// not WordPress — these paths never exist here, so 404 them before they touch any logic).
//
// One genuine exception: /wp-content/uploads/ holds the media migrated from the old
// WordPress site — every product cover and blog image is served from there, and those
// URLs are already indexed. Blocking the whole /wp-content/ tree 404s all of them, so
// the uploads folder is allowed through to the static handler while wp-admin,
// wp-login, wp-includes and the rest stay blocked.
const SCAN_ALLOW = /^\/wp-content\/uploads\/[^?]*\.(?:jpe?g|png|gif|webp|svg|avif|pdf)$/i;
const SCAN_BLOCK = /^\/(?:wp-admin|wp-login|wp-content|wp-includes|wordpress|xmlrpc\.php|phpmyadmin|administrator|vendor|cgi-bin)(?:\/|$)|\.php$|^\/\.(?:env|git|svn|aws|ssh|htaccess|htpasswd)/i;
app.use((req, res, next) => {
  if (SCAN_ALLOW.test(req.path)) return next();
  if (SCAN_BLOCK.test(req.path)) return res.status(404).type('text/plain').send('Not found');
  next();
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 200 }));
app.use('/auth/', rateLimit({ windowMs: 15*60*1000, max: 30 }));
app.use('/download/', rateLimit({ windowMs: 60*60*1000, max: 20 }));
// Stricter, dedicated brute-force guard for the login POST itself.
const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: 'Too many login attempts. Please try again in 15 minutes.' });

// ── Session ───────────────────────────────────────────────────────────────────
// Behind Nginx + Cloudflare, TLS is terminated upstream and the app is reached
// over HTTP with X-Forwarded-Proto: https. Trust the first proxy hop so Express
// treats the request as secure and will actually set the `secure` session cookie
// (otherwise login / cart / admin sessions silently break in production).
app.set('trust proxy', 1);
// Never run production on the dev fallback secret (would allow session forgery).
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET must be set in production (.env). Refusing to start.');
  process.exit(1);
}
// Persist sessions in MySQL (survives restarts/deploys; no in-memory leak/DoS vector).
const sessionStore = new MySQLStore({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
  createDatabaseTable: true,
  schema: { tableName: 'sessions' }
});
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'mathstudy-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',   // mitigates CSRF on state-changing POSTs
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// ── CSRF: issue a per-session token, expose to views ─────────────────────────
app.use((req, res, next) => {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  next();
});
// Reusable CSRF verifier (token from form field _csrf, or X-CSRF-Token header).
function verifyCsrf(req, res, next) {
  const sent = (req.body && req.body._csrf) || req.headers['x-csrf-token'] || req.headers['x-xsrf-token'] || '';
  const expected = req.session && req.session.csrfToken;
  let ok = false;
  if (expected && typeof sent === 'string' && sent.length === expected.length) {
    try { ok = crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected)); } catch (e) { ok = false; }
  }
  if (ok) return next();
  const wantsJson = req.xhr || req.headers['x-csrf-token'] ||
    (req.headers.accept || '').includes('json') || (req.headers['content-type'] || '').includes('json');
  if (wantsJson) return res.status(403).json({ error: 'Invalid or missing security token. Refresh and try again.' });
  return res.status(403).render('error', { title: '403 — Security check failed', metaDesc: '', canonical: null,
    message: 'Your security token was missing or expired. Please go back, refresh the page, and try again.' });
}

// ── View engine ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// ── Static files & body parsing ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'ignore', index: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── One-time DB setup over HTTP (no SSH needed) ───────────────────────────────
// Visit /__setup__?key=YOUR_SETUP_KEY once to build + seed the database (runs
// scripts/setup-fresh.js). Gated by the SETUP_KEY env var — returns 404 unless it
// matches. IMPORTANT: delete the SETUP_KEY env var once it succeeds so this goes dark.
app.get('/__setup__', (req, res) => {
  const key = process.env.SETUP_KEY;
  if (!key || req.query.key !== key) return res.status(404).type('text/plain').send('Not found');
  const { execSync } = require('child_process');
  try {
    const out = execSync(JSON.stringify(process.execPath) + ' ' + JSON.stringify(path.join(__dirname, 'scripts', 'setup-fresh.js')),
      { cwd: __dirname, encoding: 'utf8', timeout: 180000, maxBuffer: 20 * 1024 * 1024 });
    res.type('text/plain').send('SETUP OK ✅\n\n' + out);
  } catch (e) {
    res.status(500).type('text/plain').send('SETUP FAILED ❌\n\n' + (e.stdout || '') + '\n--- stderr ---\n' + (e.stderr || '') + '\n--- message ---\n' + (e.message || ''));
  }
});

// ── CSRF verify on state-changing requests ───────────────────────────────────
// Multipart forms (admin product create/edit, PDF upload) are checked per-route
// AFTER multer parses the body; everything else is checked here.
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.is('multipart/form-data')) return next();
  return verifyCsrf(req, res, next);
});

// ── Locals injected to every view ─────────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.cart = req.session.cart || [];
  res.locals.cartCount = (req.session.cart || []).length;
  res.locals.baseUrl = process.env.BASE_URL || 'https://mathstudy.in';
  res.locals.title = 'MathStudy.in — Premium Math E-Books';
  res.locals.metaDesc = 'Download premium math e-books for CBSE, ICSE, JEE, CAT. Grades 1–12 worksheets, case studies and sample papers.';
  res.locals.canonical = null;
  res.locals.ogImage = '/images/og-default.png';
  next();
});

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/auth/login?next=' + encodeURIComponent(req.originalUrl));
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || !['admin','super_admin'].includes(req.session.user.role)) {
    return res.status(403).render('error', { title:'403 Forbidden', message:'Admin access required.' });
  }
  next();
}
// Only allow same-site relative redirects (blocks //evil.com and /\evil.com open redirects).
function safeNext(next, fallback = '/dashboard') {
  if (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) return next;
  return fallback;
}

// ── Multer config ─────────────────────────────────────────────────────────────
const storageCovers = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public/uploads/products')),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_'))
});
const storagePdfs = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'data/ebooks');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_'))
});
const uploadCover = multer({ storage: storageCovers, limits: { fileSize: 5*1024*1024 },
  fileFilter: (req, file, cb) => cb(null, /image\/(jpeg|png|webp)/.test(file.mimetype)) });
const uploadPdf   = multer({ storage: storagePdfs,   limits: { fileSize: 50*1024*1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf') });

function sha256(str) { return crypto.createHash('sha256').update(str).digest('hex'); }

// ════════════════════════════════════════════════════════════════════════════
// ROUTES — HOME
// ════════════════════════════════════════════════════════════════════════════
app.get('/', async (req, res) => {
  try {
    const [featured] = await pool.query(
      `SELECT id,title,slug,price,original_price,cover_image,short_desc,grade
       FROM products WHERE is_published=1 AND is_featured=1 ORDER BY created_at DESC LIMIT 8`
    );
    const [cats] = await pool.query(
      `SELECT c.id,c.name,c.slug, COUNT(p.id) AS product_count
       FROM categories c LEFT JOIN products p ON p.category_id=c.id AND p.is_published=1
       GROUP BY c.id ORDER BY c.sort_order LIMIT 12`
    );
    res.render('home', {
      title: 'MathStudy.in — Premium Math E-Books for CBSE, JEE, ICSE',
      metaDesc: 'Buy premium math e-books for Grades 1–12, JEE, CAT, CUET. CBSE & ICSE aligned worksheets, case studies and sample papers. Instant PDF download.',
      canonical: process.env.BASE_URL || 'https://mathstudy.in',
      featured, cats
    });
  } catch(e) {
    console.error(e);
    res.render('home', { title:'MathStudy.in', metaDesc:'Premium math ebooks', canonical:null, featured:[], cats:[] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTES — SHOP
// ════════════════════════════════════════════════════════════════════════════
app.get('/shop', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 12;
  const offset= (page-1)*limit;
  const cat   = req.query.cat || '';
  const sort  = req.query.sort || 'latest';
  const q     = (req.query.q || '').trim().substring(0,100);

  try {
    let where = 'p.is_published=1';
    const params = [];
    if (cat) { where += ' AND c.slug=?'; params.push(cat); }
    if (q)   { where += ' AND (p.title LIKE ? OR p.short_desc LIKE ?)'; params.push('%'+q+'%','%'+q+'%'); }

    const orderMap = {
      latest:    'p.created_at DESC',
      price_asc: 'p.price ASC',
      price_desc:'p.price DESC',
      popular:   'p.downloads DESC'
    };
    const orderBy = orderMap[sort] || 'p.created_at DESC';

    const [products] = await pool.query(
      `SELECT p.id,p.title,p.slug,p.price,p.original_price,p.cover_image,p.short_desc,p.grade,
              c.name AS cat_name, c.slug AS cat_slug
       FROM products p LEFT JOIN categories c ON p.category_id=c.id
       WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{total}]] = await pool.query(
      `SELECT COUNT(*) AS total FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE ${where}`,
      params
    );
    const [cats] = await pool.query(`SELECT id,name,slug FROM categories ORDER BY sort_order`);

    res.render('shop', {
      title: q ? `"${q}" Math E-Books — MathStudy.in` : 'Shop Math E-Books — MathStudy.in',
      metaDesc: 'Browse premium math ebooks for every grade and exam. Instant PDF download after purchase.',
      canonical: (process.env.BASE_URL||'https://mathstudy.in')+'/shop',
      products, cats, page, total, limit, cat, sort, q,
      totalPages: Math.ceil(total/limit)
    });
  } catch(e) { console.error(e); res.render('shop', { title:'Shop', metaDesc:'', canonical:null, products:[], cats:[], page:1, total:0, limit:12, cat:'', sort:'latest', q:'', totalPages:0 }); }
});

// All case-study books in one place, grouped by class. The nav's "Case Studies"
// tab points here — previously it went to the Class 8 category alone, which hid
// the Class 7/9/12 ranges from anyone using the menu.
app.get('/shop/case-studies', async (req, res) => {
  try {
    const [groups] = await pool.query(
      `SELECT c.id, c.name, c.slug FROM categories c
       WHERE c.slug LIKE 'case-studies-%'
       ORDER BY c.sort_order`);
    for (const g of groups) {
      const [items] = await pool.query(
        `SELECT id,title,slug,price,original_price,cover_image,grade
         FROM products WHERE category_id=? AND is_published=1 ORDER BY created_at ASC, id ASC`,
        [g.id]);
      g.products = items;
    }
    const shown = groups.filter(g => g.products.length);
    const total = shown.reduce((s, g) => s + g.products.length, 0);
    res.render('case-studies', {
      title: 'Maths Case Study Questions — Class 7, 8, 9 & 12 PDFs',
      metaDesc: 'All maths case-study e-books in one place — Class 7, 8, 9 and 12, chapter-wise, with full solutions. CBSE & ICSE pattern. Instant PDF download.',
      canonical: (process.env.BASE_URL || 'https://mathstudy.in') + '/shop/case-studies',
      groups: shown, total
    });
  } catch (e) { console.error(e); res.status(500).render('error', { title: 'Error', message: 'Something went wrong.' }); }
});

// Categories whose whole stock moved elsewhere. The old URL is already indexed
// and linked, so it must send visitors (and its ranking) to the new home rather
// than show an empty shelf.
const CATEGORY_MOVED = {
  'grade-7-math': 'case-studies-class-7',
};

// Category landing pages for SEO
app.get('/shop/category/:slug', async (req, res) => {
  try {
    // Only redirect once the destination genuinely has stock. Code deploys and
    // database seeding are separate steps on this host, so between the two the
    // destination may not exist yet — redirecting regardless would turn a
    // working, indexed page into a 404.
    const movedTo = CATEGORY_MOVED[req.params.slug];
    if (movedTo) {
      const [[dest]] = await pool.query(
        `SELECT c.id FROM categories c
         JOIN products p ON p.category_id = c.id AND p.is_published = 1
         WHERE c.slug = ? LIMIT 1`, [movedTo]);
      if (dest) return res.redirect(301, '/shop/category/' + movedTo);
      // Destination not ready — fall through and serve this category as before.
    }
    const [[cat]] = await pool.query(`SELECT * FROM categories WHERE slug=?`, [req.params.slug]);
    if (!cat) return res.status(404).render('error', { title:'404', message:'Category not found.' });
    const [products] = await pool.query(
      `SELECT p.id,p.title,p.slug,p.price,p.original_price,p.cover_image,p.short_desc,p.grade
       FROM products p WHERE p.category_id=? AND p.is_published=1 ORDER BY p.created_at DESC`,
      [cat.id]
    );
    res.render('category', {
      title: `${cat.name} E-Books — MathStudy.in`,
      metaDesc: `Download ${cat.name} PDF ebooks. CBSE/ICSE aligned, instant download, affordable prices.`,
      canonical: (process.env.BASE_URL||'https://mathstudy.in')+'/shop/category/'+cat.slug,
      cat, products
    });
  } catch(e) { console.error(e); res.status(500).render('error',{title:'Error',message:'Something went wrong.'}); }
});

// Individual product page
app.get('/shop/product/:slug', async (req, res) => {
  try {
    const [[product]] = await pool.query(
      `SELECT p.*,c.name AS cat_name,c.slug AS cat_slug
       FROM products p LEFT JOIN categories c ON p.category_id=c.id
       WHERE p.slug=? AND p.is_published=1`,
      [req.params.slug]
    );
    if (!product) return res.status(404).render('error',{title:'404',message:'Product not found.'});

    // Check if user already owns this product
    let alreadyOwned = false;
    if (req.session.user) {
      const [[owned]] = await pool.query(
        `SELECT oi.id FROM order_items oi
         JOIN orders o ON oi.order_id=o.id
         WHERE o.user_id=? AND oi.product_id=? AND o.status='paid' LIMIT 1`,
        [req.session.user.id, product.id]
      );
      alreadyOwned = !!owned;
    }

    // Related products
    const [related] = await pool.query(
      `SELECT id,title,slug,price,original_price,cover_image FROM products
       WHERE category_id=? AND id!=? AND is_published=1 ORDER BY RAND() LIMIT 4`,
      [product.category_id, product.id]
    );

    await pool.query(`UPDATE products SET downloads=downloads WHERE id=?`,[product.id]); // view counter separate

    // Reviews → ⭐ rich snippet + on-page trust
    const [reviews] = await pool.query(
      `SELECT author_name,rating,title,body,created_at FROM product_reviews
       WHERE product_id=? AND status='approved' ORDER BY created_at DESC`, [product.id]);
    const reviewCount = reviews.length;
    const reviewAvg = reviewCount ? reviews.reduce((s, r) => s + r.rating, 0) / reviewCount : 0;

    // Bundle contents (if this product is a bundle)
    let bundleItems = [];
    const bIds = Array.isArray(product.bundle_items) ? product.bundle_items
      : (product.bundle_items ? (() => { try { return JSON.parse(product.bundle_items); } catch (e) { return []; } })() : []);
    if (bIds.length) {
      const [bi] = await pool.query(`SELECT id,title,slug,price,cover_image FROM products WHERE id IN (?)`, [bIds]);
      bundleItems = bi;
    }

    const sd = seo.forProduct(product, { count: reviewCount, avg: reviewAvg, reviews });
    res.render('product', {
      title: sd.title, metaDesc: sd.metaDesc, canonical: sd.canonical,
      ogImage: product.cover_image || '/images/og-default.png',
      ogType: sd.ogType, jsonLd: sd.jsonLd, faqs: sd.faqs,
      product, related, alreadyOwned, reviews, reviewCount, reviewAvg, bundleItems
    });
  } catch(e) { console.error(e); res.status(500).render('error',{title:'Error',message:'Something went wrong.'}); }
});

// Submit a product review (logged-in users or guests with a name)
app.post('/shop/product/:id/review', async (req, res) => {
  try {
    const pid = parseInt(req.params.id, 10);
    const rating = Math.max(1, Math.min(5, parseInt(req.body.rating, 10) || 0));
    const name = (req.session.user && req.session.user.name) || (req.body.author_name || '').toString().trim().slice(0, 120);
    const body = (req.body.body || '').toString().trim().slice(0, 2000);
    const [[p]] = await pool.query('SELECT slug FROM products WHERE id=?', [pid]);
    if (!p) return res.status(404).render('error', { title: '404', message: 'Product not found.' });
    if (!rating || !name) return res.redirect('/shop/product/' + p.slug + '#reviews');
    await pool.query(
      `INSERT INTO product_reviews (product_id,user_id,author_name,rating,title,body) VALUES (?,?,?,?,?,?)`,
      [pid, req.session.user ? req.session.user.id : null, name, rating, (req.body.title || '').toString().trim().slice(0, 160) || null, body || null]);
    res.redirect('/shop/product/' + p.slug + '#reviews');
  } catch (e) { console.error('review error', e); res.status(500).render('error', { title: 'Error', message: 'Could not submit review.' }); }
});

// ── Contact / Support ──
app.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact & Support — MathStudy.in',
    metaDesc: 'Questions about a MathStudy.in e-book, an order or a download? Contact us on WhatsApp or email and we will help you the same day.',
    canonical: BASE_URL + '/contact', ogType: 'website', sent: req.query.sent === '1'
  });
});
app.post('/contact', async (req, res) => {
  try {
    const e = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const name = (req.body.name || '').toString().trim().slice(0, 120);
    const contact = (req.body.contact || '').toString().trim().slice(0, 120);
    const grade = (req.body.grade || '').toString().trim().slice(0, 80);
    const message = (req.body.message || '').toString().trim().slice(0, 1500);
    if (name && contact) {
      const html = `<h3>New contact / support enquiry</h3><p><b>Name:</b> ${e(name)}<br><b>Contact:</b> ${e(contact)}<br><b>Topic:</b> ${e(grade) || '-'}</p><p>${e(message) || '(no message)'}</p>`;
      notify.sendEmail(process.env.ADMIN_EMAIL || 'admin@mathstudy.in', 'New support enquiry — ' + name, html).catch(() => {});
    }
    res.redirect('/contact?sent=1');
  } catch (err) { console.error('contact', err); res.redirect('/contact?sent=1'); }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTES — AUTH
// ════════════════════════════════════════════════════════════════════════════
app.get('/auth/login',    (req, res) => res.render('auth/login',    { title:'Log In — MathStudy.in',    metaDesc:'', canonical:null, error:null, next: req.query.next||'/dashboard' }));
app.get('/auth/register', (req, res) => res.render('auth/register', { title:'Sign Up — MathStudy.in', metaDesc:'', canonical:null, error:null }));

app.post('/auth/login', loginLimiter, async (req, res) => {
  const { email, next } = req.body;
  const pw = req.body.password;
  if (!email || !pw) return res.render('auth/login',{ title:'Log In', metaDesc:'', canonical:null, error:'Please fill all fields.', next:next||'/dashboard' });
  try {
    const [[user]] = await pool.query(
      `SELECT id,name,email,role,is_active,password_hash FROM users WHERE email=?`,
      [email.toLowerCase().trim()]
    );
    const check = user ? await password.verify(pw, user.password_hash) : { ok:false };
    if (!user || !user.is_active || !check.ok) return res.render('auth/login',{ title:'Log In', metaDesc:'', canonical:null, error:'Invalid email or password.', next:next||'/dashboard' });
    // Transparently upgrade a legacy SHA-256 account to bcrypt on successful login.
    if (check.needsRehash) {
      try { await pool.query(`UPDATE users SET password_hash=? WHERE id=?`, [await password.hash(pw), user.id]); }
      catch(e) { console.error('rehash failed:', e.message); }
    }
    req.session.user = { id:user.id, name:user.name, email:user.email, role:user.role };
    res.redirect(safeNext(next));
  } catch(e) { console.error(e); res.render('auth/login',{ title:'Log In', metaDesc:'', canonical:null, error:'Server error. Try again.', next:next||'/dashboard' }); }
});

app.post('/auth/register', async (req, res) => {
  const { name, email, confirm_password } = req.body;
  const pw = req.body.password;
  if (!name||!email||!pw) return res.render('auth/register',{ title:'Sign Up', metaDesc:'', canonical:null, error:'Please fill all fields.' });
  if (pw !== confirm_password) return res.render('auth/register',{ title:'Sign Up', metaDesc:'', canonical:null, error:'Passwords do not match.' });
  if (pw.length < 8) return res.render('auth/register',{ title:'Sign Up', metaDesc:'', canonical:null, error:'Password must be at least 8 characters.' });
  try {
    await pool.query(
      `INSERT INTO users (name,email,password_hash) VALUES (?,?,?)`,
      [name.trim(), email.toLowerCase().trim(), await password.hash(pw)]
    );
    const [[user]] = await pool.query(`SELECT id,name,email,role FROM users WHERE email=?`,[email.toLowerCase().trim()]);
    req.session.user = { id:user.id, name:user.name, email:user.email, role:user.role };
    res.redirect('/dashboard');
  } catch(e) {
    const msg = e.code==='ER_DUP_ENTRY' ? 'An account with this email already exists.' : 'Server error. Try again.';
    res.render('auth/register',{ title:'Sign Up', metaDesc:'', canonical:null, error:msg });
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ── Change password (logged-in users + admin) ──
app.get('/account/password', requireLogin, (req, res) => {
  res.render('account-password', { title:'Change Password — MathStudy.in', metaDesc:'', canonical:null, error:null, ok:false });
});
app.post('/account/password', requireLogin, async (req, res) => {
  const cur = (req.body.current_password || '').toString();
  const nw  = (req.body.new_password || '').toString();
  const cf  = (req.body.confirm_password || '').toString();
  const view = (extra) => res.render('account-password', Object.assign(
    { title:'Change Password — MathStudy.in', metaDesc:'', canonical:null, error:null, ok:false }, extra));
  if (!cur || !nw || !cf) return view({ error:'Please fill all fields.' });
  if (nw !== cf)          return view({ error:'New passwords do not match.' });
  if (nw.length < 8)      return view({ error:'New password must be at least 8 characters.' });
  try {
    const [[u]] = await pool.query(`SELECT id,password_hash FROM users WHERE id=?`, [req.session.user.id]);
    const check = u ? await password.verify(cur, u.password_hash) : { ok:false };
    if (!check.ok) return view({ error:'Your current password is incorrect.' });
    await pool.query(`UPDATE users SET password_hash=? WHERE id=?`, [await password.hash(nw), req.session.user.id]);
    return view({ ok:true });
  } catch(e) { console.error('password change failed:', e.message); return view({ error:'Server error. Try again.' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTES — CART (session-based)
// ════════════════════════════════════════════════════════════════════════════
app.post('/cart/add', async (req, res) => {
  const productId = parseInt(req.body.product_id);
  if (!productId) return res.status(400).json({ error:'Invalid product.' });
  try {
    const [[p]] = await pool.query(`SELECT id,title,price,cover_image,slug FROM products WHERE id=? AND is_published=1`,[productId]);
    if (!p) return res.status(404).json({ error:'Product not found.' });
    if (!req.session.cart) req.session.cart = [];
    const exists = req.session.cart.find(i => i.id===p.id);
    if (exists) {
      return req.session.save(() => res.json({ ok:true, count: req.session.cart.length, already: true }));
    }
    req.session.cart.push({ id:p.id, title:p.title, price:parseFloat(p.price), cover:p.cover_image, slug:p.slug });
    req.session.save(err => {
      if (err) return res.status(500).json({ error:'Session error.' });
      res.json({ ok:true, count: req.session.cart.length });
    });
  } catch(e) { console.error('cart/add error:', e); res.status(500).json({ error:'Server error.' }); }
});

app.post('/cart/remove', (req, res) => {
  const productId = parseInt(req.body.product_id);
  req.session.cart = (req.session.cart || []).filter(i => i.id !== productId);
  const total = req.session.cart.reduce((s,i) => s+i.price, 0);
  req.session.save(err => {
    if (err) return res.status(500).json({ error:'Session error.' });
    res.json({ ok:true, count: req.session.cart.length, total, empty: req.session.cart.length === 0 });
  });
});

// Simple self-hosted purchase captcha: a small sum stored in the session,
// verified before an order is created. No third-party service or keys needed.
function newCheckoutCaptcha(req) {
  const a = 2 + crypto.randomInt(8); // 2–9
  const b = 1 + crypto.randomInt(9); // 1–9
  req.session.checkoutCaptcha = a + b;
  return a + ' + ' + b;
}

app.get('/cart', (req, res) => {
  const cart  = req.session.cart || [];
  const total = cart.reduce((s,i) => s+i.price, 0);
  const UPI_ID   = '9873742245@ybl';
  const UPI_NAME = 'MathStudy.in';
  const upiString = 'upi://pay?pa=' + UPI_ID + '&pn=' + encodeURIComponent(UPI_NAME) +
                    '&am=' + total.toFixed(2) + '&cu=INR&tn=' + encodeURIComponent('MathStudy E-Book Purchase');
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=' + encodeURIComponent(upiString);
  res.render('cart', {
    title:'Your Cart — MathStudy.in', metaDesc:'', canonical:null,
    cart, total, upiId: UPI_ID, upiName: UPI_NAME, qrUrl,
    captchaQ: newCheckoutCaptcha(req)
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTES — CHECKOUT (UPI)
// ════════════════════════════════════════════════════════════════════════════

// Generate a readable order reference: BOOKCODE/MM/YY/DD/NNN
function makeOrderRef(cartItems, monthlyCount) {
  // Build book code from first item title
  var title = (cartItems[0] && cartItems[0].title) ? cartItems[0].title : 'BOOK';
  var stop = new Set(['class','mathematics','math','maths','for','the','of','and','with',
                      'in','a','an','to','by','cbse','icse','questions','problems',
                      'solutions','pdf','download','type','bank','wise','sample','papers']);
  var words = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(function(w){ return w.length > 1 && !stop.has(w); });
  var code = words.slice(0, 3).map(function(w){ return w.substring(0, 3).toUpperCase(); }).join('');
  if (!code) code = 'BOOK';

  var now   = new Date();
  var mm    = String(now.getMonth() + 1).padStart(2, '0');
  var yy    = String(now.getFullYear()).slice(-2);
  var dd    = String(now.getDate()).padStart(2, '0');
  var seq   = String(monthlyCount).padStart(3, '0');

  return code + '/' + mm + '/' + yy + '/' + dd + '/' + seq;
}

const checkoutLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many order attempts. Please wait a few minutes and try again.' } });

app.post('/checkout/upi-confirm', checkoutLimiter, requireLogin, async (req, res) => {
  const cart = req.session.cart || [];
  if (!cart.length) return res.status(400).json({ error:'Cart is empty.' });

  // Purchase captcha: the answer must match the sum shown on the cart page.
  // One-time use — right or wrong, a fresh question is issued for the retry.
  const expected = req.session.checkoutCaptcha;
  const given = parseInt((req.body && req.body.captcha) || '', 10);
  if (!Number.isInteger(expected) || given !== expected) {
    return res.status(400).json({
      error: 'Security check failed — please answer the small maths question next to the button.',
      captcha_q: newCheckoutCaptcha(req)
    });
  }
  delete req.session.checkoutCaptcha;

  const total = cart.reduce((s,i) => s+i.price, 0);

  try {
    // Count orders placed this month to generate sequential number
    const [[{ cnt }]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM orders
       WHERE YEAR(created_at)=YEAR(NOW()) AND MONTH(created_at)=MONTH(NOW())`
    );
    const orderRef   = makeOrderRef(cart, cnt + 1);
    const adminToken = crypto.randomBytes(24).toString('hex');
    const phone = ((req.body && req.body.phone) || '').toString().trim().slice(0, 25) || null;
    const note  = ((req.body && req.body.note)  || '').toString().trim().slice(0, 500) || null;

    const [orderResult] = await pool.query(
      `INSERT INTO orders (user_id,total_amount,payment_id,status,admin_token,customer_phone,customer_note)
       VALUES (?,?,?,'pending',?,?,?)`,
      [req.session.user.id, total, orderRef, adminToken, phone, note]
    );
    const orderId = orderResult.insertId;

    for (const item of cart) {
      await pool.query(
        `INSERT INTO order_items (order_id,product_id,price) VALUES (?,?,?)`,
        [orderId, item.id, item.price]
      );
    }

    // Notify the admin by email with Approve/Reject links — best effort.
    notify.adminNewOrder({
      order: { id: orderId, payment_id: orderRef, total_amount: total, admin_token: adminToken, customer_phone: phone },
      items: cart.map(c => ({ title: c.title, price: c.price })),
      buyer: req.session.user,
      baseUrl: BASE_URL
    }).catch(e => console.error('admin notify failed:', e.message));

    req.session.cart = [];
    req.session.save(err => {
      if (err) return res.status(500).json({ error:'Session error.' });
      res.json({ ok:true, order_id: orderId, order_ref: orderRef });
    });
  } catch(e) { console.error(e); res.status(500).json({ error:'Failed to place order.' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTES — SECURE DOWNLOAD
// ════════════════════════════════════════════════════════════════════════════
app.get('/download/:token', requireLogin, async (req, res) => {
  try {
    const [[tok]] = await pool.query(
      `SELECT dt.*,p.pdf_file,p.title,p.download_url FROM download_tokens dt
       JOIN products p ON dt.product_id=p.id
       WHERE dt.token=? AND dt.user_id=? AND dt.expires_at > NOW() AND dt.used_count < dt.max_uses`,
      [req.params.token, req.session.user.id]
    );
    if (!tok) return res.status(403).render('error',{title:'Download Expired',message:'This download link has expired or is invalid. Go to your dashboard to get a fresh link.'});

    await pool.query(`UPDATE download_tokens SET used_count=used_count+1 WHERE id=?`,[tok.id]);
    await pool.query(`UPDATE products SET downloads=downloads+1 WHERE id=?`,[tok.product_id]);

    // Preferred: secure external (Google Drive) link, resolved only at click time.
    if (tok.download_url) return res.redirect(driveDownloadUrl(tok.download_url));

    // Fallback: a locally-uploaded PDF.
    const filePath = path.join(__dirname, 'data/ebooks', tok.pdf_file || '');
    if (!tok.pdf_file || !fs.existsSync(filePath)) {
      return res.status(404).render('error',{title:'File Not Found',message:'This download is not available yet. Please contact support@mathstudy.in with your order number.'});
    }
    res.download(filePath, tok.title.replace(/[^a-zA-Z0-9\s]/g,'').trim() + '.pdf');
  } catch(e) { console.error(e); res.status(500).render('error',{title:'Error',message:'Download failed.'}); }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTES — USER DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
app.get('/dashboard', requireLogin, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.id,o.total_amount,o.status,o.created_at,
              GROUP_CONCAT(p.title SEPARATOR '||') AS titles,
              GROUP_CONCAT(dt.token SEPARATOR '||') AS tokens,
              GROUP_CONCAT(p.cover_image SEPARATOR '||') AS covers,
              GROUP_CONCAT(CASE WHEN dt.expires_at > NOW() AND dt.used_count < dt.max_uses THEN 1 ELSE 0 END SEPARATOR '||') AS can_download
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id=o.id
       LEFT JOIN products p ON oi.product_id=p.id
       LEFT JOIN download_tokens dt ON dt.product_id=p.id AND dt.order_id=o.id AND dt.user_id=o.user_id
       WHERE o.user_id=?
       GROUP BY o.id ORDER BY o.created_at DESC`,
      [req.session.user.id]
    );
    res.render('dashboard', {
      title:'My Dashboard — MathStudy.in', metaDesc:'', canonical:null,
      orders
    });
  } catch(e) { console.error(e); res.render('dashboard',{ title:'Dashboard', metaDesc:'', canonical:null, orders:[] }); }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTES — ADMIN
// ════════════════════════════════════════════════════════════════════════════
app.get('/admin', requireAdmin, async (req, res) => {
  try {
    const [[{products}]] = await pool.query(`SELECT COUNT(*) AS products FROM products`);
    const [[{orders}]]   = await pool.query(`SELECT COUNT(*) AS orders FROM orders WHERE status='paid'`);
    const [[{revenue}]]  = await pool.query(`SELECT COALESCE(SUM(total_amount),0) AS revenue FROM orders WHERE status='paid'`);
    const [[{users}]]    = await pool.query(`SELECT COUNT(*) AS users FROM users`);
    const [[{pending}]]  = await pool.query(`SELECT COUNT(*) AS pending FROM orders WHERE status='pending'`);
    const [[{blogs}]]    = await pool.query(`SELECT COUNT(*) AS blogs FROM blogs`);
    const [recent_orders]= await pool.query(
      `SELECT o.id,o.payment_id,u.name AS buyer,u.email,o.total_amount,o.status,o.created_at
       FROM orders o JOIN users u ON o.user_id=u.id ORDER BY o.created_at DESC LIMIT 10`
    );
    const [recent_posts] = await pool.query(
      `SELECT id,title,slug,status,views,created_at FROM blogs ORDER BY created_at DESC LIMIT 5`
    );
    res.render('admin/index', {
      title:'Admin — MathStudy.in', metaDesc:'', canonical:null,
      stats:{ products, orders, revenue, users, pending, blogs }, pendingCount: pending,
      recent_orders, recent_posts
    });
  } catch(e) { console.error(e); res.status(500).send('Admin error: '+e.message); }
});

// Admin — Email health: shows whether order emails can send from THIS server
// (env presence → live SMTP login check → optional test mail). No secrets shown.
app.get('/admin/email-status', requireAdmin, async (req, res) => {
  const status = notify.smtpStatus();
  const verify = await notify.verifySmtp();
  let test = null;
  if (req.query.send === '1') {
    test = await notify.sendEmail(
      status.admin_email,
      'MathStudy email test — order notifications',
      '<p>This is a test from <b>/admin/email-status</b>. If you are reading it, new-order emails work.</p>'
    );
  }
  const row = (label, ok, detail) =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${label}</td>
     <td style="padding:6px 12px;border-bottom:1px solid #eee">${ok ? '✅' : '❌'} ${detail || ''}</td></tr>`;
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Email health — Admin</title></head>
  <body style="font-family:Arial,sans-serif;max-width:640px;margin:30px auto;color:#1f2937">
    <h1 style="font-size:22px">Order-email health</h1>
    <table style="border-collapse:collapse;width:100%">
      ${row('SMTP_HOST', !!status.smtp_host, status.smtp_host || 'not set')}
      ${row('SMTP_PORT', true, String(status.smtp_port))}
      ${row('SMTP_USER', status.smtp_user_set, status.smtp_user_set ? 'set' : 'not set')}
      ${row('SMTP_PASS', status.smtp_pass_set, status.smtp_pass_set ? 'set' : 'not set')}
      ${row('ADMIN_EMAIL (order alerts go here)', !!status.admin_email, status.admin_email || 'not set')}
      ${row('MAIL_FROM', !!status.mail_from, status.mail_from || 'not set')}
      ${row('SMTP login check', verify.ok, verify.ok ? 'connected + authenticated' : verify.error)}
      ${test ? row('Test email', !!test.ok, test.ok ? 'sent to ' + status.admin_email + ' — check the inbox'
                                           : (test.error || test.skipped || '')) : ''}
    </table>
    <p style="margin-top:18px">
      <a href="/admin/email-status?send=1" style="background:#0d9488;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700">Send a test email to ${status.admin_email || 'ADMIN_EMAIL'}</a>
      &nbsp; <a href="/admin">← Back to admin</a>
    </p>
    <p style="color:#64748b;font-size:13px">On this Hostinger server the working recipe is:
    SMTP_HOST=smtp.hostinger.com, SMTP_PORT=465, SMTP_USER=admin@mathstudy.in,
    SMTP_PASS=&lt;that mailbox's password&gt;, ADMIN_EMAIL=admin@mathstudy.in.</p>
  </body></html>`);
});

// Admin — Delivery health: can every published product actually deliver its
// e-book after approval? Mirrors the /download/:token logic: Drive URL first,
// local PDF fallback; bundles deliver via their components.
app.get('/admin/delivery-status', requireAdmin, async (req, res) => {
  try {
    const [products] = await pool.query(
      `SELECT id, slug, title, download_url, pdf_file, bundle_items FROM products WHERE is_published=1 ORDER BY title`);
    const byId = new Map(products.map(p => [p.id, p]));
    const check = (p) => {
      if (p.download_url) return { ok: true, how: '🔒 Google Drive' };
      if (p.pdf_file && fs.existsSync(path.join(__dirname, 'data/ebooks', p.pdf_file)))
        return { ok: true, how: 'Local PDF (' + p.pdf_file + ')' };
      if (p.pdf_file) return { ok: false, how: 'pdf_file set but MISSING on server: ' + p.pdf_file };
      return { ok: false, how: 'No Drive URL and no PDF' };
    };
    const rows = products.map((p) => {
      let ids = [];
      try { ids = Array.isArray(p.bundle_items) ? p.bundle_items : JSON.parse(p.bundle_items || '[]'); } catch (e) {}
      if (ids.length) {
        const comps = ids.map(id => byId.get(id)).filter(Boolean);
        const bad = comps.filter(c => !check(c).ok);
        return { p, ok: !bad.length && comps.length === ids.length,
          how: 'Bundle of ' + ids.length + (bad.length ? ' — components missing delivery: ' + bad.map(c => c.slug).join(', ') : ' — all components deliverable') };
      }
      const r = check(p); return { p, ok: r.ok, how: r.how };
    });
    const bad = rows.filter(r => !r.ok).length;
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Delivery health — Admin</title></head>
    <body style="font-family:Arial,sans-serif;max-width:860px;margin:30px auto;color:#1f2937">
      <h1 style="font-size:22px">E-book delivery health</h1>
      <p>${rows.length} published products — <b style="color:${bad ? '#b91c1c' : '#059669'}">${bad ? bad + ' cannot deliver' : 'all can deliver ✅'}</b>.
      Fix a ❌ by pasting its Google-Drive link into the product's <i>Download URL</i> field in <a href="/admin/products">Products → Edit</a>.</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Product</th>
            <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Delivery</th></tr>
        ${rows.map(r => `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.ok ? '✅' : '❌'} <a href="/admin/products/${r.p.id}/edit">${r.p.title.replace(/</g,'&lt;')}</a><br><span style="color:#94a3b8;font-size:12px">${r.p.slug}</span></td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;color:${r.ok ? '#334155' : '#b91c1c'}">${r.how.replace(/</g,'&lt;')}</td></tr>`).join('')}
      </table>
      <p style="margin-top:16px"><a href="/admin">← Back to admin</a></p>
    </body></html>`);
  } catch (e) { console.error(e); res.status(500).send('Delivery status error: ' + e.message); }
});

// Admin — Products list
app.get('/admin/products', requireAdmin, async (req, res) => {
  // WooCommerce-style catalogue: every product with real sales (paid orders
  // only), revenue, delivery source and publish state.
  const [products] = await pool.query(
    `SELECT p.*, c.name AS cat_name,
            COALESCE(s.units, 0)   AS units_sold,
            COALESCE(s.revenue, 0) AS revenue
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN (
         SELECT oi.product_id, COUNT(*) AS units, SUM(oi.price) AS revenue
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE o.status = 'paid' GROUP BY oi.product_id
       ) s ON s.product_id = p.id
      ORDER BY p.created_at DESC`
  );
  const counts = {
    total: products.length,
    published: products.filter(p => p.is_published).length,
    draft: products.filter(p => !p.is_published).length,
    nofile: products.filter(p => !p.download_url && !p.pdf_file &&
              !(p.bundle_items && p.bundle_items !== '[]' && String(p.bundle_items) !== 'null')).length,
  };
  res.render('admin/products', { title:'E-Books — Admin', metaDesc:'', canonical:null, products, counts });
});

// Admin — Add product form
// Products that can be bundle components (not bundles themselves).
async function bundleCandidates(excludeId) {
  const [rows] = await pool.query(
    `SELECT id, title, price, is_published FROM products
      WHERE (bundle_items IS NULL OR bundle_items = '[]') ${excludeId ? 'AND id != ?' : ''}
      ORDER BY title`, excludeId ? [excludeId] : []);
  return rows;
}

// Parse + sanitise the bundle_items[] checkboxes from the product form.
async function parseBundleItems(body, selfId) {
  let raw = body.bundle_items;
  if (raw == null) return null;
  if (!Array.isArray(raw)) raw = [raw];
  const ids = [...new Set(raw.map(v => parseInt(v, 10)).filter(n => Number.isInteger(n) && n > 0 && n !== Number(selfId)))];
  if (!ids.length) return null;
  // Keep only real, non-bundle products (no nested bundles).
  const [ok] = await pool.query(
    `SELECT id FROM products WHERE id IN (?) AND (bundle_items IS NULL OR bundle_items = '[]')`, [ids]);
  const valid = ok.map(r => r.id);
  return valid.length ? JSON.stringify(valid) : null;
}

app.get('/admin/products/new', requireAdmin, async (req, res) => {
  const [cats] = await pool.query(`SELECT id,name FROM categories ORDER BY sort_order`);
  const candidates = await bundleCandidates(null);
  res.render('admin/product-form', { title:'Add Product', metaDesc:'', canonical:null, product:null, cats, candidates, error:null });
});

// Admin — Edit product form
app.get('/admin/products/:id/edit', requireAdmin, async (req, res) => {
  const [[product]] = await pool.query(`SELECT * FROM products WHERE id=?`,[req.params.id]);
  if (!product) return res.status(404).send('Not found');
  const [cats] = await pool.query(`SELECT id,name FROM categories ORDER BY sort_order`);
  const candidates = await bundleCandidates(product.id);
  res.render('admin/product-form', { title:'Edit Product', metaDesc:'', canonical:null, product, cats, candidates, error:null });
});

// Admin — Save product (new)
app.post('/admin/products/new', requireAdmin, uploadCover.single('cover_image'), verifyCsrf, async (req, res) => {
  const { title,slug,description,short_desc,category_id,price,original_price,grade,board,page_count,meta_title,meta_desc,is_featured,is_published,download_url } = req.body;
  const cover = req.file ? '/uploads/products/'+req.file.filename : null;
  try {
    const bundleJson = await parseBundleItems(req.body, null);
    await pool.query(
      `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,cover_image,grade,board,page_count,meta_title,meta_desc,is_featured,is_published,download_url,bundle_items)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [title,slug,description,short_desc,category_id||null,parseFloat(price),parseFloat(original_price)||null,cover,grade,board,page_count||null,meta_title,meta_desc,is_featured?1:0,is_published?1:0,download_url||null,bundleJson]
    );
    res.redirect('/admin/products');
  } catch(e) {
    const [cats] = await pool.query(`SELECT id,name FROM categories ORDER BY sort_order`);
    const candidates = await bundleCandidates(null);
    res.render('admin/product-form',{ title:'Add Product', metaDesc:'', canonical:null, product:req.body, cats, candidates, error:e.message });
  }
});

// Admin — Save product (edit)
app.post('/admin/products/:id/edit', requireAdmin, uploadCover.single('cover_image'), verifyCsrf, async (req, res) => {
  const { title,slug,description,short_desc,category_id,price,original_price,grade,board,page_count,meta_title,meta_desc,is_featured,is_published,download_url } = req.body;
  const cover = req.file ? '/uploads/products/'+req.file.filename : req.body.existing_cover;
  try {
    const bundleJson = await parseBundleItems(req.body, req.params.id);
    await pool.query(
      `UPDATE products SET title=?,slug=?,description=?,short_desc=?,category_id=?,price=?,original_price=?,cover_image=?,grade=?,board=?,page_count=?,meta_title=?,meta_desc=?,is_featured=?,is_published=?,download_url=?,bundle_items=? WHERE id=?`,
      [title,slug,description,short_desc,category_id||null,parseFloat(price),parseFloat(original_price)||null,cover,grade,board,page_count||null,meta_title,meta_desc,is_featured?1:0,is_published?1:0,download_url||null,bundleJson,req.params.id]
    );
    res.redirect('/admin/products');
  } catch(e) {
    const [[product]] = await pool.query(`SELECT * FROM products WHERE id=?`,[req.params.id]);
    const [cats] = await pool.query(`SELECT id,name FROM categories ORDER BY sort_order`);
    const candidates = await bundleCandidates(req.params.id);
    res.render('admin/product-form',{ title:'Edit Product', metaDesc:'', canonical:null, product, cats, candidates, error:e.message });
  }
});

// Admin — Upload PDF for product
app.post('/admin/products/:id/upload-pdf', requireAdmin, uploadPdf.single('pdf_file'), verifyCsrf, async (req, res) => {
  if (!req.file) return res.status(400).json({ error:'No PDF uploaded.' });
  await pool.query(`UPDATE products SET pdf_file=? WHERE id=?`,[req.file.filename, req.params.id]);
  res.json({ ok:true, filename: req.file.filename });
});

// Admin — Delete product (legacy soft-delete kept for compatibility)
app.delete('/admin/products/:id', requireAdmin, async (req, res) => {
  await pool.query(`UPDATE products SET is_published=0 WHERE id=?`,[req.params.id]);
  res.json({ ok:true });
});

// Admin — toggle a product flag (published / featured) from the list switch
app.post('/admin/products/:id/toggle', requireAdmin, async (req, res) => {
  const field = ['is_published','is_featured'].includes(req.body.field) ? req.body.field : null;
  if (!field) return res.status(400).json({ error:'Invalid field.' });
  await pool.query(`UPDATE products SET ${field}=? WHERE id=?`, [req.body.value ? 1 : 0, req.params.id]);
  res.json({ ok:true });
});

// Admin — permanently delete a product (past order history is preserved)
app.post('/admin/products/:id/delete', requireAdmin, async (req, res) => {
  try {
    await pool.query(`DELETE FROM download_tokens WHERE product_id=?`, [req.params.id]);
    await pool.query(`DELETE FROM products WHERE id=?`, [req.params.id]);
    res.json({ ok:true });
  } catch(e) { console.error('delete product', e.message); res.status(500).json({ error:'Could not delete this product.' }); }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTES — ADMIN CATEGORIES
// ════════════════════════════════════════════════════════════════════════════
function adminSlugify(s){ return String(s||'').toLowerCase().replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-'); }

app.get('/admin/categories', requireAdmin, async (req, res) => {
  const [cats] = await pool.query(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) AS product_count
       FROM categories c ORDER BY c.sort_order, c.name`);
  res.render('admin/categories', { title:'Categories — Admin', metaDesc:'', canonical:null, cats });
});

app.post('/admin/categories', requireAdmin, async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.redirect('/admin/categories');
  const slug = (req.body.slug || '').trim() || adminSlugify(name);
  try {
    await pool.query(`INSERT INTO categories (name,slug,description,sort_order) VALUES (?,?,?,?)`,
      [name, slug, (req.body.description || '').trim() || null, parseInt(req.body.sort_order) || 0]);
  } catch(e) { console.error('cat create', e.message); }
  res.redirect('/admin/categories');
});

app.post('/admin/categories/:id', requireAdmin, async (req, res) => {
  const name = (req.body.name || '').trim();
  const slug = (req.body.slug || '').trim() || adminSlugify(name);
  await pool.query(`UPDATE categories SET name=?,slug=?,description=?,sort_order=? WHERE id=?`,
    [name, slug, (req.body.description || '').trim() || null, parseInt(req.body.sort_order) || 0, req.params.id]);
  res.redirect('/admin/categories');
});

app.post('/admin/categories/:id/delete', requireAdmin, async (req, res) => {
  await pool.query(`UPDATE products SET category_id=NULL WHERE category_id=?`, [req.params.id]);
  await pool.query(`DELETE FROM categories WHERE id=?`, [req.params.id]);
  res.redirect('/admin/categories');
});

// Admin — Orders list
app.get('/admin/orders', requireAdmin, async (req, res) => {
  const [orders] = await pool.query(
    `SELECT o.*, u.name AS buyer, u.email,
            GROUP_CONCAT(p.title ORDER BY p.id SEPARATOR '||') AS item_titles
     FROM orders o
     JOIN users u ON o.user_id = u.id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON oi.product_id = p.id
     GROUP BY o.id
     ORDER BY o.created_at DESC`
  );
  res.render('admin/orders', { title:'Orders — Admin', metaDesc:'', canonical:null, orders });
});

// Admin — Order detail (WooCommerce-style): buyer, purchased products with
// links, delivery readiness, and the buyer's actual download links so they
// can be copied and sent manually if an email ever goes missing.
app.get('/admin/orders/:id', requireAdmin, async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (!orderId) return res.status(404).render('error', { title:'Not found', metaDesc:'', canonical:null, message:'Order not found.' });
  try {
    const [[order]] = await pool.query(
      `SELECT o.*, u.name AS buyer, u.email AS buyer_email FROM orders o
       JOIN users u ON o.user_id = u.id WHERE o.id=?`, [orderId]);
    if (!order) return res.status(404).render('error', { title:'Not found', metaDesc:'', canonical:null, message:'Order not found.' });

    const [items] = await pool.query(
      `SELECT oi.price, p.id, p.title, p.slug, p.download_url, p.pdf_file, p.bundle_items
         FROM order_items oi JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id=?`, [orderId]);

    // Every e-book this order grants (bundles expanded) + its token, if minted.
    const deliverables = await ordersLib.expandDeliverables(pool, orderId);
    const [tokens] = await pool.query(
      `SELECT dt.token, dt.product_id, dt.used_count, dt.max_uses, dt.expires_at
         FROM download_tokens dt WHERE dt.order_id=?`, [orderId]);
    const tokenByProduct = new Map(tokens.map(t => [t.product_id, t]));
    const downloads = deliverables.map(d => ({
      title: d.title,
      token: tokenByProduct.get(d.product_id) || null,
    }));

    res.render('admin/order-detail', {
      title: 'Order #' + order.id + ' — Admin', metaDesc: '', canonical: null,
      order, items, downloads, baseUrl: BASE_URL,
    });
  } catch (e) { console.error('order detail error:', e); res.status(500).send('Order detail error: ' + e.message); }
});

// Admin — Re-send the download email for a paid order (tokens reused/minted).
app.post('/admin/orders/:id/resend', requireAdmin, async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (!orderId) return res.status(400).json({ error: 'Invalid order ID.' });
  try {
    const r = await ordersLib.resendOrder(pool, orderId, BASE_URL);
    if (r.error) return res.status(r.code || 400).json({ error: r.error });
    res.json({ ok: true, emailOk: r.emailOk, count: r.downloads.length, to: r.user.email });
  } catch (e) { console.error('resend error:', e); res.status(500).json({ error: 'Server error. Try again.' }); }
});

// Admin — Approve / Reject a UPI order (from the admin panel). Shares the engine
// in lib/orders.js so the buyer is notified and download links are minted.
app.post('/admin/orders/:id/approve', requireAdmin, async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const action  = req.body.action;
  if (!orderId) return res.status(400).json({ error: 'Invalid order ID.' });
  try {
    const r = action === 'reject'
      ? await ordersLib.rejectOrder(pool, orderId)
      : await ordersLib.approveOrder(pool, orderId, BASE_URL);
    if (r.error && !r.already) return res.status(r.code || 400).json({ error: r.error });
    res.json({ ok: true, tokens: r.downloads ? r.downloads.length : 0, already: !!r.already });
  } catch(e) {
    console.error('approve order error:', e);
    res.status(500).json({ error: 'Server error. Try again.' });
  }
});

// Tap-from-phone Approve / Reject — the links emailed to the admin.
// Secured by the per-order admin_token (no login needed, works on mobile).
app.get('/order-action/:id/:action', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const action  = req.params.action;
  const token   = (req.query.t || '').toString();
  const page = (icon, title, msg) => res.send(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<div style="font-family:Arial,sans-serif;max-width:480px;margin:56px auto;padding:30px;border:1px solid #eee;border-radius:14px;text-align:center">` +
    `<div style="font-size:46px">${icon}</div><h2 style="color:#0f172a;margin:.4em 0">${title}</h2>` +
    `<p style="color:#475569;font-size:15px;line-height:1.6">${msg}</p>` +
    `<a href="/admin/orders" style="display:inline-block;margin-top:14px;color:#0d9488;font-weight:700;text-decoration:none">→ Open admin orders</a></div>`);
  try {
    const order = await ordersLib.getOrder(pool, orderId);
    if (!order) return res.status(404).send('Order not found.');
    if (!order.admin_token || token !== order.admin_token) return res.status(403).send('Invalid or expired action link.');

    if (action === 'approve') {
      const r = await ordersLib.approveOrder(pool, orderId, BASE_URL);
      if (r.error && !r.already) return page('⚠️', 'Could not approve', r.error);
      return page('✅', 'Order approved', r.already ? 'This order was already approved.' : 'The buyer has been emailed their secure download link.');
    }
    if (action === 'reject') {
      const r = await ordersLib.rejectOrder(pool, orderId);
      if (r.error && !r.already) return page('⚠️', 'Could not reject', r.error);
      return page('❌', 'Order rejected', r.already ? 'This order was already rejected.' : 'The buyer was told the payment was not received.');
    }
    return res.status(400).send('Unknown action.');
  } catch(e) { console.error('order-action error:', e); res.status(500).send('Server error.'); }
});

// Admin — Users list
app.get('/admin/users', requireAdmin, async (req, res) => {
  const [users] = await pool.query(
    `SELECT u.*,(SELECT COUNT(*) FROM orders WHERE user_id=u.id AND status='paid') AS order_count FROM users u ORDER BY u.created_at DESC`
  );
  res.render('admin/users', { title:'Users — Admin', metaDesc:'', canonical:null, users });
});

// ── Blog helpers ──────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

// Auto-create blogs table if it doesn't exist yet
pool.query(`CREATE TABLE IF NOT EXISTS blogs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(512) NOT NULL,
  slug         VARCHAR(512) NOT NULL UNIQUE,
  content      LONGTEXT,
  excerpt      TEXT,
  cover_image  VARCHAR(1024) DEFAULT '',
  category     VARCHAR(128) DEFAULT '',
  meta_title   VARCHAR(256) DEFAULT '',
  meta_desc    VARCHAR(512) DEFAULT '',
  status       VARCHAR(20) NOT NULL DEFAULT 'draft',
  author       VARCHAR(128) DEFAULT 'MathStudy Editorial',
  views        INT NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(function(e) {
  console.error('[Blog] Could not create blogs table:', e.message);
});

// ── Public Blog ───────────────────────────────────────────────────────────────
app.get('/blog', async (req, res, next) => {
  try {
    const cat = req.query.cat || '';
    const params = [];
    let q = `SELECT id,title,slug,excerpt,cover_image,category,meta_desc,created_at,views FROM blogs WHERE status='published'`;
    if (cat) { q += ' AND category=?'; params.push(cat); }
    q += ' ORDER BY created_at DESC';
    const [posts] = await pool.query(q, params);
    const [catRows] = await pool.query(`SELECT DISTINCT category FROM blogs WHERE status='published' AND category IS NOT NULL AND category!=''`);
    const categories = catRows.map(function(r){ return r.category; }).filter(Boolean);
    res.render('blog', {
      title: 'Blog — MathStudy.in | Math Tips, Study Guides & Free Resources',
      metaDesc: 'Free math study guides, CBSE tips, JEE prep articles and worksheet downloads from the MathStudy.in team.',
      canonical: process.env.BASE_URL ? process.env.BASE_URL + '/blog' : null,
      posts: posts, categories: categories, activeCat: cat,
    });
  } catch(e) { next(e); }
});

app.get('/blog/:slug', async (req, res, next) => {
  try {
    const [[post]] = await pool.query(`SELECT * FROM blogs WHERE slug=? AND status='published'`, [req.params.slug]);
    if (!post) return res.status(404).render('error', { title:'404 — Post Not Found', metaDesc:'', canonical:null, message:'This post does not exist or has been unpublished.' });
    pool.query(`UPDATE blogs SET views=views+1 WHERE id=?`, [post.id]).catch(function(){});
    res.render('blog-post', {
      title: post.meta_title || post.title + ' — MathStudy.in',
      metaDesc: post.meta_desc || post.excerpt || '',
      // Canonical is the ROOT url (/<slug>) — matches the original WordPress permalink.
      canonical: process.env.BASE_URL ? process.env.BASE_URL + '/' + post.slug : null,
      ogImage: post.cover_image || null,
      post: post,
    });
  } catch(e) { next(e); }
});

// ── Admin Blog ────────────────────────────────────────────────────────────────
app.get('/admin/blog', requireAdmin, async (req, res, next) => {
  try {
    const [posts] = await pool.query(`SELECT id,title,slug,status,category,views,created_at,cover_image FROM blogs ORDER BY created_at DESC`);
    res.render('admin/blog', { title:'Blog — Admin', metaDesc:'', canonical:null, posts: posts, success: req.query.success || null });
  } catch(e) { next(e); }
});

app.get('/admin/blog/new', requireAdmin, (req, res) => {
  res.render('admin/blog-form', { title:'New Post — Admin', metaDesc:'', canonical:null, post: null, error: null });
});

app.post('/admin/blog/new', requireAdmin, async (req, res, next) => {
  try {
    const { title, content, excerpt, category, meta_title, meta_desc, cover_image, status } = req.body;
    if (!title || !title.trim()) {
      return res.render('admin/blog-form', { title:'New Post — Admin', metaDesc:'', canonical:null, post: req.body, error: 'Post title is required.' });
    }
    if (!content || content.trim() === '' || content.trim() === '<p><br></p>') {
      return res.render('admin/blog-form', { title:'New Post — Admin', metaDesc:'', canonical:null, post: req.body, error: 'Post content cannot be empty — please write something in the editor.' });
    }
    let slug = slugify(title.trim());
    if (!slug) slug = 'post-' + Date.now();
    const [ex] = await pool.query(`SELECT id FROM blogs WHERE slug=?`, [slug]);
    if (ex.length) slug = slug + '-' + Date.now().toString().slice(-4);
    await pool.query(
      `INSERT INTO blogs (title,slug,content,excerpt,cover_image,category,meta_title,meta_desc,status,author) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [title.trim(), slug, content, excerpt||'', cover_image||'', category||'', meta_title||title.trim(), meta_desc||excerpt||'', status||'draft', 'MathStudy Editorial']
    );
    res.redirect('/admin/blog?success=Post+created+successfully');
  } catch(e) { next(e); }
});

app.get('/admin/blog/:id/edit', requireAdmin, async (req, res, next) => {
  try {
    const [[post]] = await pool.query(`SELECT * FROM blogs WHERE id=?`, [req.params.id]);
    if (!post) return res.redirect('/admin/blog');
    res.render('admin/blog-form', { title:'Edit Post — Admin', metaDesc:'', canonical:null, post: post, error: null });
  } catch(e) { next(e); }
});

app.post('/admin/blog/:id/edit', requireAdmin, async (req, res, next) => {
  try {
    const { title, content, excerpt, category, meta_title, meta_desc, cover_image, status } = req.body;
    if (!title || !title.trim()) {
      const [[post]] = await pool.query(`SELECT * FROM blogs WHERE id=?`, [req.params.id]);
      return res.render('admin/blog-form', { title:'Edit Post — Admin', metaDesc:'', canonical:null, post: Object.assign({}, post, req.body), error: 'Post title is required.' });
    }
    if (!content || content.trim() === '' || content.trim() === '<p><br></p>') {
      const [[post]] = await pool.query(`SELECT * FROM blogs WHERE id=?`, [req.params.id]);
      return res.render('admin/blog-form', { title:'Edit Post — Admin', metaDesc:'', canonical:null, post: Object.assign({}, post, req.body), error: 'Post content cannot be empty.' });
    }
    await pool.query(
      `UPDATE blogs SET title=?,content=?,excerpt=?,cover_image=?,category=?,meta_title=?,meta_desc=?,status=?,updated_at=NOW() WHERE id=?`,
      [title.trim(), content, excerpt||'', cover_image||'', category||'', meta_title||title.trim(), meta_desc||excerpt||'', status||'draft', req.params.id]
    );
    res.redirect('/admin/blog?success=Post+updated+successfully');
  } catch(e) { next(e); }
});

app.post('/admin/blog/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM blogs WHERE id=?`, [req.params.id]);
    res.redirect('/admin/blog?success=Post+deleted');
  } catch(e) { next(e); }
});

app.post('/admin/blog/:id/toggle', requireAdmin, async (req, res, next) => {
  try {
    const [[post]] = await pool.query(`SELECT status FROM blogs WHERE id=?`, [req.params.id]);
    if (!post) return res.json({ ok: false, error: 'Post not found' });
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    await pool.query(`UPDATE blogs SET status=?,updated_at=NOW() WHERE id=?`, [newStatus, req.params.id]);
    res.json({ ok: true, status: newStatus });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

// Admin — API: toggle publish
app.patch('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const { is_published, is_featured } = req.body;
  const updates = [];
  const vals    = [];
  if (typeof is_published !== 'undefined') { updates.push('is_published=?'); vals.push(is_published?1:0); }
  if (typeof is_featured  !== 'undefined') { updates.push('is_featured=?');  vals.push(is_featured?1:0);  }
  if (!updates.length) return res.status(400).json({error:'Nothing to update.'});
  vals.push(req.params.id);
  await pool.query(`UPDATE products SET ${updates.join(',')} WHERE id=?`, vals);
  res.json({ ok:true });
});

// ── Sitemap ─────────────────────────────────────────────────────────────────
app.get('/sitemap.xml', async (req, res) => {
  const base = process.env.BASE_URL || 'https://mathstudy.in';
  const [products] = await pool.query(`SELECT slug,updated_at FROM products WHERE is_published=1`);
  // Only categories that actually have something to show. Listing empty ones
  // (or a category whose stock has moved and now 301s) puts thin and redirecting
  // URLs in front of Google for no gain.
  const [cats]     = await pool.query(
    `SELECT c.slug FROM categories c
     JOIN products p ON p.category_id = c.id AND p.is_published = 1
     GROUP BY c.slug`);
  const [blogs]    = await pool.query(`SELECT slug,updated_at FROM blogs WHERE status='published'`);
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += '<url><loc>' + base + '/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n';
  xml += '<url><loc>' + base + '/shop</loc><changefreq>daily</changefreq><priority>0.9</priority></url>\n';
  xml += '<url><loc>' + base + '/shop/case-studies</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n';
  xml += '<url><loc>' + base + '/blog</loc><changefreq>daily</changefreq><priority>0.7</priority></url>\n';
  // Blog posts at their ORIGINAL root URL (/<slug>) — preserves the indexed WordPress URLs.
  blogs.forEach(function(b) {
    xml += '<url><loc>' + base + '/' + b.slug + '</loc>';
    if (b.updated_at) xml += '<lastmod>' + new Date(b.updated_at).toISOString().split('T')[0] + '</lastmod>';
    xml += '<changefreq>monthly</changefreq><priority>0.7</priority></url>\n';
  });
  products.forEach(function(p) {
    xml += '<url><loc>' + base + '/shop/product/' + p.slug + '</loc>';
    if (p.updated_at) xml += '<lastmod>' + new Date(p.updated_at).toISOString().split('T')[0] + '</lastmod>';
    xml += '<changefreq>weekly</changefreq><priority>0.8</priority></url>\n';
  });
  // Submit the category *landing pages*. The old '/shop?cat=' form was a
  // filtered view of /shop that canonicalises back to /shop, so every one of
  // those URLs told Google to ignore it — while the real landing pages, which
  // carry their own title and canonical, were never listed at all.
  cats.forEach(function(c) {
    xml += '<url><loc>' + base + '/shop/category/' + c.slug + '</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n';
  });
  xml += '</urlset>';
  res.set('Content-Type', 'application/xml').send(xml);
});

// ── robots.txt ───────────────────────────────────────────────────────────────
app.get('/robots.txt', function(req, res) {
  const base = (process.env.BASE_URL || 'https://mathstudy.in').replace(/\/+$/, '');
  const lines = [
    'User-agent: *',
    'Allow: /',
    // Keep private / transactional paths out of the index.
    'Disallow: /admin',
    'Disallow: /dashboard',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /download',
    'Disallow: /auth',
    'Disallow: /order-action',
    '',
    // Block AI training/scraper bots (per SEO-PACK).
    'User-agent: GPTBot',
    'Disallow: /',
    'User-agent: CCBot',
    'Disallow: /',
    'User-agent: anthropic-ai',
    'Disallow: /',
    'User-agent: ClaudeBot',
    'Disallow: /',
    'User-agent: Google-Extended',
    'Disallow: /',
    'User-agent: PerplexityBot',
    'Disallow: /',
    '',
    'Sitemap: ' + base + '/sitemap.xml',
    ''
  ];
  res.type('text/plain').send(lines.join('\n'));
});

// ── Legacy WordPress root URLs ───────────────────────────────────────────────
// WordPress served posts/pages at the root (/<slug>/). Imported posts live in the
// blogs table; serve them at their ORIGINAL root URL so Google's indexed links keep
// working. Runs last (after every real route), only for single-segment paths.
app.get('/:slug', async (req, res, next) => {
  const slug = req.params.slug;
  if (!slug || slug.indexOf('.') !== -1) return next();   // skip files (sitemap.xml, etc.)
  try {
    const [[post]] = await pool.query(`SELECT * FROM blogs WHERE slug=? AND status='published'`, [slug]);
    if (!post) return next();
    pool.query(`UPDATE blogs SET views=views+1 WHERE id=?`, [post.id]).catch(function(){});
    res.render('blog-post', {
      title: post.meta_title || post.title + ' — MathStudy.in',
      metaDesc: post.meta_desc || post.excerpt || '',
      canonical: process.env.BASE_URL ? process.env.BASE_URL + '/' + post.slug : null,
      ogImage: post.cover_image || null,
      post: post,
    });
  } catch(e) { next(e); }
});

// ── Delivery health (public, secret-free counts only) ───────────────────────
// How many published (non-bundle) products still lack any delivery file, and
// how many have a Drive URL wired. Used for remote verification/monitoring.
app.get('/health/delivery', async (req, res) => {
  try {
    const [[{ missing }]] = await pool.query(
      `SELECT COUNT(*) AS missing FROM products
        WHERE is_published=1 AND download_url IS NULL AND pdf_file IS NULL
          AND (bundle_items IS NULL OR bundle_items = '[]')`);
    const [[{ linked }]] = await pool.query(
      `SELECT COUNT(*) AS linked FROM products WHERE is_published=1 AND download_url IS NOT NULL`);
    res.json({ ok: true, products_missing_delivery: missing, products_with_drive_url: linked });
  } catch (e) { res.status(500).json({ ok: false }); }
});

// ── 404 / Error ──────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).render('error', {
  title: '404 — Page Not Found', metaDesc: '', canonical: null,
  message: 'The page you are looking for does not exist.'
}));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', {
    title: '500 — Server Error', metaDesc: '', canonical: null,
    message: 'Something went wrong. Try again in a moment.'
  });
});

app.listen(PORT, function() { console.log('MathStudy.in running on http://localhost:' + PORT); });
