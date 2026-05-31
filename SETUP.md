# MathStudy.in — Setup Guide

## Project Structure

```
F:\MATHSTUDY\
├── api/          ← Laravel 11 REST API  (php artisan serve → :8000)
├── frontend/     ← Next.js 14 SSR       (npm run dev     → :3000)
├── server.js     ← Legacy Node.js shop  (node server.js  → :3001)
└── SETUP.md
```

---

## 1. Laravel API (`api/`)

### Prerequisites
- PHP 8.2+  (`php -v`)
- Composer   (`composer -V`)
- MySQL 8.0+

### Install

```bash
cd F:\MATHSTUDY\api

# 1. Install dependencies
composer install

# 2. Create .env from example
cp .env.example .env

# 3. Fill in .env values:
#    DB_DATABASE, DB_USERNAME, DB_PASSWORD
#    UPI_ID (your UPI VPA, e.g. mathstudy@icici)
#    UPI_NAME (mathstudy.in)
#    APP_SIGNED_URL_SECRET  ← openssl rand -base64 48
#    PAYMENT_WEBHOOK_SECRET

# 4. Generate app key
php artisan key:generate

# 5. Run migrations (creates all tables + seeds 16 categories)
php artisan migrate

# 6. Install Sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

# 7. Start dev server
php artisan serve
# → http://localhost:8000
```

### Create Admin User (run once in tinker)

```bash
php artisan tinker
```
```php
App\Models\User::create([
    'name'     => 'Sachin',
    'email'    => 'udgamsachin@gmail.com',
    'password' => 'Admin@mathstudy2026',
    'role'     => 'admin',
]);
```

### Add a Product (via tinker)

```php
$cat = App\Models\Category::where('slug','jee')->first();
App\Models\Product::create([
    'category_id'   => $cat->id,
    'title'         => 'JEE Maths — Integration Mastery',
    'slug'          => 'jee-maths-integration-mastery',
    'short_desc'    => 'Complete integration guide for JEE Main & Advanced',
    'price'         => 49,
    'original_price'=> 99,
    'grade'         => 'Grade 11–12',
    'board'         => 'CBSE',
    'pdf_path'      => 'jee-integration.pdf',  // place in storage/ebooks/
    'preview_pages' => 5,
    'is_featured'   => true,
    'is_active'     => true,
]);
```

---

## 2. Next.js Frontend (`frontend/`)

### Prerequisites
- Node.js 18+  (`node -v`)
- npm 9+

### Install

```bash
cd F:\MATHSTUDY\frontend

npm install

# Create .env.local
cp .env.local.example .env.local

# Set values:
NEXT_PUBLIC_SITE_URL=https://mathstudy.in
NEXT_PUBLIC_API_URL=http://localhost:8000/api
API_SECRET=          # matches Laravel X-API-Secret header (optional)
```

### Dev

```bash
npm run dev
# → http://localhost:3000
```

### Production Build

```bash
npm run build
npm start
```

---

## 3. UPI Payment Flow

```
Student clicks "Buy Now"
       ↓
POST /api/payment/initiate  → returns { transaction_id, upi_string, amount }
       ↓
qrcode.toCanvas(canvas, upi_string)  → QR rendered in browser
       ↓
Student scans with GPay / PhonePe / Paytm
       ↓
Bank sends payment to UPI_ID
       ↓
[Automated] POST /api/payment/webhook  ← your bank / UPI monitor calls this
  — OR —
[Manual]    Admin visits dashboard → Confirm payment → POST /api/payment/confirm
       ↓
Order status set to "paid", download tokens issued
       ↓
Frontend poll detects status=paid
       ↓
Student sees "Download PDF" button with signed URL
       ↓
GET /api/download/{token}?expires=…&sig=…  → PDF streamed
```

### Manual Payment Confirmation (API call)

```bash
curl -X POST https://api.mathstudy.in/api/payment/confirm \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transaction_id":"MS1A2B3C4D5E","upi_ref":"UTR123456789"}'
```

---

## 4. File Storage

PDFs must be placed in:

```
F:\MATHSTUDY\api\storage\ebooks\
```

They are **never exposed publicly**. The download endpoint streams them
after validating the signed token.

---

## 5. SEO Notes

- Sitemap is auto-generated at `https://mathstudy.in/sitemap.xml` (Next.js ISR, refreshed every hour)
- JSON-LD schema injected on every product page (Book + AggregateRating + FAQPage + BreadcrumbList)
- AI scraper bots (GPTBot, CCBot, anthropic-ai, Google-Extended) are blocked in `robots.ts`
- Product pages include crawlable full description text for Googlebot even before purchase
