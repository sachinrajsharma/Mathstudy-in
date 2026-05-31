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

const app  = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = (process.env.BASE_URL || 'https://mathstudy.in').replace(/\/+$/, '');

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
                   "https://cdn.jsdelivr.net", "https://cdn.quilljs.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com",
                   "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net",
                   "https://cdn.quilljs.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
      imgSrc:     ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdn.quilljs.com"],
      scriptSrcAttr:  ["'unsafe-inline'"]
    }
  }
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 200 }));
app.use('/auth/', rateLimit({ windowMs: 15*60*1000, max: 30 }));
app.use('/download/', rateLimit({ windowMs: 60*60*1000, max: 20 }));

// ── Session ───────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'mathstudy-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// ── View engine ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// ── Static files & body parsing ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

// Category landing pages for SEO
app.get('/shop/category/:slug', async (req, res) => {
  try {
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

    res.render('product', {
      title: product.meta_title || product.title + ' — MathStudy.in',
      metaDesc: product.meta_desc || product.short_desc || 'Download this math ebook instantly.',
      canonical: (process.env.BASE_URL||'https://mathstudy.in')+'/shop/product/'+product.slug,
      ogImage: product.cover_image || '/images/og-default.png',
      product, related, alreadyOwned,
      razorpayKey: process.env.RAZORPAY_KEY_ID || ''
    });
  } catch(e) { console.error(e); res.status(500).render('error',{title:'Error',message:'Something went wrong.'}); }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTES — AUTH
// ════════════════════════════════════════════════════════════════════════════
app.get('/auth/login',    (req, res) => res.render('auth/login',    { title:'Log In — MathStudy.in',    metaDesc:'', canonical:null, error:null, next: req.query.next||'/dashboard' }));
app.get('/auth/register', (req, res) => res.render('auth/register', { title:'Sign Up — MathStudy.in', metaDesc:'', canonical:null, error:null }));

app.post('/auth/login', async (req, res) => {
  const { email, password, next } = req.body;
  if (!email || !password) return res.render('auth/login',{ title:'Log In', metaDesc:'', canonical:null, error:'Please fill all fields.', next:next||'/dashboard' });
  try {
    const [[user]] = await pool.query(
      `SELECT id,name,email,role,is_active FROM users WHERE email=? AND password_hash=?`,
      [email.toLowerCase().trim(), sha256(password)]
    );
    if (!user || !user.is_active) return res.render('auth/login',{ title:'Log In', metaDesc:'', canonical:null, error:'Invalid email or password.', next:next||'/dashboard' });
    req.session.user = { id:user.id, name:user.name, email:user.email, role:user.role };
    res.redirect(next && next.startsWith('/') ? next : '/dashboard');
  } catch(e) { console.error(e); res.render('auth/login',{ title:'Log In', metaDesc:'', canonical:null, error:'Server error. Try again.', next:next||'/dashboard' }); }
});

app.post('/auth/register', async (req, res) => {
  const { name, email, password, confirm_password } = req.body;
  if (!name||!email||!password) return res.render('auth/register',{ title:'Sign Up', metaDesc:'', canonical:null, error:'Please fill all fields.' });
  if (password !== confirm_password) return res.render('auth/register',{ title:'Sign Up', metaDesc:'', canonical:null, error:'Passwords do not match.' });
  if (password.length < 8) return res.render('auth/register',{ title:'Sign Up', metaDesc:'', canonical:null, error:'Password must be at least 8 characters.' });
  try {
    await pool.query(
      `INSERT INTO users (name,email,password_hash) VALUES (?,?,?)`,
      [name.trim(), email.toLowerCase().trim(), sha256(password)]
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
    cart, total, upiId: UPI_ID, upiName: UPI_NAME, qrUrl
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

app.post('/checkout/upi-confirm', requireLogin, async (req, res) => {
  const cart = req.session.cart || [];
  if (!cart.length) return res.status(400).json({ error:'Cart is empty.' });
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

    // Notify the admin (Telegram + email) with Approve/Reject tap-links — best effort.
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
    const [recent_orders]= await pool.query(
      `SELECT o.id,o.payment_id,u.name AS buyer,u.email,o.total_amount,o.status,o.created_at
       FROM orders o JOIN users u ON o.user_id=u.id ORDER BY o.created_at DESC LIMIT 10`
    );
    res.render('admin/index', {
      title:'Admin — MathStudy.in', metaDesc:'', canonical:null,
      stats:{ products, orders, revenue, users, pending }, pendingCount: pending, recent_orders
    });
  } catch(e) { console.error(e); res.status(500).send('Admin error: '+e.message); }
});

// Admin — Products list
app.get('/admin/products', requireAdmin, async (req, res) => {
  const [products] = await pool.query(
    `SELECT p.*,c.name AS cat_name FROM products p LEFT JOIN categories c ON p.category_id=c.id ORDER BY p.created_at DESC`
  );
  res.render('admin/products', { title:'Products — Admin', metaDesc:'', canonical:null, products });
});

// Admin — Add product form
app.get('/admin/products/new', requireAdmin, async (req, res) => {
  const [cats] = await pool.query(`SELECT id,name FROM categories ORDER BY sort_order`);
  res.render('admin/product-form', { title:'Add Product', metaDesc:'', canonical:null, product:null, cats, error:null });
});

// Admin — Edit product form
app.get('/admin/products/:id/edit', requireAdmin, async (req, res) => {
  const [[product]] = await pool.query(`SELECT * FROM products WHERE id=?`,[req.params.id]);
  if (!product) return res.status(404).send('Not found');
  const [cats] = await pool.query(`SELECT id,name FROM categories ORDER BY sort_order`);
  res.render('admin/product-form', { title:'Edit Product', metaDesc:'', canonical:null, product, cats, error:null });
});

// Admin — Save product (new)
app.post('/admin/products/new', requireAdmin, uploadCover.single('cover_image'), async (req, res) => {
  const { title,slug,description,short_desc,category_id,price,original_price,grade,board,page_count,meta_title,meta_desc,is_featured,is_published,download_url } = req.body;
  const cover = req.file ? '/uploads/products/'+req.file.filename : null;
  try {
    await pool.query(
      `INSERT INTO products (title,slug,description,short_desc,category_id,price,original_price,cover_image,grade,board,page_count,meta_title,meta_desc,is_featured,is_published,download_url)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [title,slug,description,short_desc,category_id||null,parseFloat(price),parseFloat(original_price)||null,cover,grade,board,page_count||null,meta_title,meta_desc,is_featured?1:0,is_published?1:0,download_url||null]
    );
    res.redirect('/admin/products');
  } catch(e) {
    const [cats] = await pool.query(`SELECT id,name FROM categories ORDER BY sort_order`);
    res.render('admin/product-form',{ title:'Add Product', metaDesc:'', canonical:null, product:req.body, cats, error:e.message });
  }
});

// Admin — Save product (edit)
app.post('/admin/products/:id/edit', requireAdmin, uploadCover.single('cover_image'), async (req, res) => {
  const { title,slug,description,short_desc,category_id,price,original_price,grade,board,page_count,meta_title,meta_desc,is_featured,is_published,download_url } = req.body;
  const cover = req.file ? '/uploads/products/'+req.file.filename : req.body.existing_cover;
  try {
    await pool.query(
      `UPDATE products SET title=?,slug=?,description=?,short_desc=?,category_id=?,price=?,original_price=?,cover_image=?,grade=?,board=?,page_count=?,meta_title=?,meta_desc=?,is_featured=?,is_published=?,download_url=? WHERE id=?`,
      [title,slug,description,short_desc,category_id||null,parseFloat(price),parseFloat(original_price)||null,cover,grade,board,page_count||null,meta_title,meta_desc,is_featured?1:0,is_published?1:0,download_url||null,req.params.id]
    );
    res.redirect('/admin/products');
  } catch(e) {
    const [[product]] = await pool.query(`SELECT * FROM products WHERE id=?`,[req.params.id]);
    const [cats] = await pool.query(`SELECT id,name FROM categories ORDER BY sort_order`);
    res.render('admin/product-form',{ title:'Edit Product', metaDesc:'', canonical:null, product, cats, error:e.message });
  }
});

// Admin — Upload PDF for product
app.post('/admin/products/:id/upload-pdf', requireAdmin, uploadPdf.single('pdf_file'), async (req, res) => {
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

// Tap-from-phone Approve / Reject — the links sent to the admin over Telegram &
// email. Secured by the per-order admin_token (no login needed, works on mobile).
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
      canonical: process.env.BASE_URL ? process.env.BASE_URL + '/blog/' + post.slug : null,
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
  const [cats]     = await pool.query(`SELECT slug FROM categories`);
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += '<url><loc>' + base + '/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n';
  xml += '<url><loc>' + base + '/shop</loc><changefreq>daily</changefreq><priority>0.9</priority></url>\n';
  products.forEach(function(p) {
    xml += '<url><loc>' + base + '/shop/product/' + p.slug + '</loc>';
    if (p.updated_at) xml += '<lastmod>' + new Date(p.updated_at).toISOString().split('T')[0] + '</lastmod>';
    xml += '<changefreq>weekly</changefreq><priority>0.8</priority></url>\n';
  });
  cats.forEach(function(c) {
    xml += '<url><loc>' + base + '/shop?cat=' + c.slug + '</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n';
  });
  xml += '</urlset>';
  res.set('Content-Type', 'application/xml').send(xml);
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
