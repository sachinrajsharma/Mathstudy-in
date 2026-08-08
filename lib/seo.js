'use strict';
// lib/seo.js — programmatic SEO for MathStudy product pages.
// Generates buy-intent titles/descriptions, schema.org Product + FAQPage
// structured data, and tailored FAQs — automatically for every product
// (current 40 and any future one). Admin-set meta_title/meta_desc always win.

const SITE = (process.env.BASE_URL || 'https://mathstudy.in').replace(/\/+$/, '');
const BRAND = 'MathStudy.in';

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function clean(s) { return String(s || '').replace(/\s*[—–-]\s*$/, '').replace(/\s+/g, ' ').trim(); }
function abs(u) { if (!u) return SITE + '/images/og-default.png'; return /^https?:\/\//i.test(u) ? u : SITE + (u.charAt(0) === '/' ? u : '/' + u); }
function cut(s, n) { s = String(s || '').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; }

function jsonLdScript(obj) {
  return '<script type="application/ld+json">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';
}

function productUrl(p) { return SITE + '/shop/product/' + p.slug; }

// ── Buy-intent title / description (fallbacks; admin meta_* override these) ──
function seoTitle(p) {
  if (p.meta_title && p.meta_title.trim()) return p.meta_title.trim();
  let t = clean(p.title);
  if (!/pdf/i.test(t)) t += ' PDF';
  let title = t + ' — Instant Download';
  if (title.length <= 47) title += ' | ' + BRAND;
  return cut(title, 60);
}
function seoDesc(p) {
  if (p.meta_desc && p.meta_desc.trim()) return p.meta_desc.trim();
  const base = p.short_desc ? clean(p.short_desc) : ('Download ' + clean(p.title) + ' as a PDF');
  return cut(base.replace(/\.*$/, '') + '. Instant PDF download, exam-ready. Buy now on ' + BRAND + '.', 155);
}

// ── Tailored FAQs by product type (unique-enough for FAQ rich results) ──
function faqsFor(p) {
  const title = clean(p.title);
  const t = title.toLowerCase();
  const cls = (title.match(/class\s*\d+|grade\s*\d+|\bclass\s*x{1,3}i*\b/i) || [])[0] || '';
  const faqs = [];
  const delivery = { q: 'How do I get the PDF after paying?', a: 'After your UPI payment is confirmed, your secure download link is emailed to you — open it on any phone, laptop or print it.' };

  if (/case stud/i.test(t)) {
    faqs.push({ q: 'Are full solutions included?', a: 'Yes — every case-study question comes with a clear, step-by-step solution.' });
    faqs.push({ q: 'Does it follow the latest CBSE pattern?', a: 'Yes, the questions use the current competency / case-based format that CBSE now asks in the exam' + (cls ? ' for ' + cls + '.' : '.') });
  } else if (/worksheet|word problem|workbook/i.test(t)) {
    faqs.push({ q: 'Is it a printable PDF?', a: 'Yes — instant printable PDF. Print as many copies as you need at home or in class.' });
    faqs.push({ q: 'Is an answer key included?', a: 'Yes, every worksheet comes with an answer key.' });
  } else if (/formula/i.test(t)) {
    faqs.push({ q: 'What does the formula book cover?', a: 'Every important maths formula, organised chapter-wise — algebra, trigonometry, calculus, coordinate geometry, vectors and more.' });
    faqs.push({ q: 'Is it useful for JEE and boards?', a: 'Yes — ideal for quick revision before JEE Main, Advanced and Class 11–12 board exams.' });
  } else if (/\bdpp\b/i.test(t)) {
    faqs.push({ q: 'What is a DPP?', a: 'A Daily Practice Problem sheet — a focused set of exam-level questions on one topic, with full solutions, to build speed and accuracy.' });
    faqs.push({ q: 'Are the solutions included?', a: 'Yes, every problem has a worked solution.' });
  } else if (/ncert solution/i.test(t)) {
    faqs.push({ q: 'Are all chapters and exercises covered?', a: 'Yes — complete, exercise-by-exercise NCERT solutions, fully solved.' });
    faqs.push({ q: 'Is it aligned to the latest syllabus?', a: 'Yes, matched to the current CBSE syllabus and NCERT edition.' });
  } else if (/sample paper/i.test(t)) {
    faqs.push({ q: 'Are solutions and marking scheme included?', a: 'Yes — full solutions so you can self-check exactly like the real exam.' });
    faqs.push({ q: 'Is it the latest exam pattern?', a: 'Yes, the papers follow the current board / exam pattern' + (cls ? ' for ' + cls + '.' : '.') });
  } else if (/mcq|objective|question bank/i.test(t)) {
    faqs.push({ q: 'Are answers provided?', a: 'Yes — every objective / MCQ comes with the correct answer.' });
    faqs.push({ q: 'How many questions are there?', a: 'A large, chapter-wise bank of practice questions to drill the whole syllabus.' });
  } else if (/hots/i.test(t)) {
    faqs.push({ q: 'What are HOTS questions?', a: 'High-Order Thinking Skills questions — the application and analysis questions that decide top marks.' });
    faqs.push({ q: 'Are solutions included?', a: 'Yes, with full solutions.' });
  } else {
    faqs.push({ q: 'What do I get?', a: 'A ready-to-use maths practice PDF' + (cls ? ' for ' + cls : '') + ' — exam-focused questions you can study or print.' });
    faqs.push({ q: 'Are answers / solutions included?', a: 'Yes, answers are included so you can check your work.' });
  }
  faqs.push(delivery);
  faqs.push({ q: 'What if I have a problem with my download?', a: 'Email us your order number and we will sort it out quickly — your purchase is always honoured.' });
  return faqs;
}

function productJsonLd(p, rd) {
  const node = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: clean(p.title),
    image: [abs(p.cover_image)],
    description: cut(p.meta_desc || p.short_desc || ('Maths practice PDF: ' + clean(p.title)), 300),
    sku: 'MS-' + p.id,
    brand: { '@type': 'Brand', name: BRAND },
    category: p.cat_name || 'Maths e-books',
    offers: {
      '@type': 'Offer',
      url: productUrl(p),
      priceCurrency: 'INR',
      price: Number(p.price || 0).toFixed(2),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: BRAND }
    }
  };
  // ⭐ Real reviews only (never fabricated) → AggregateRating + Review → star snippet.
  if (rd && rd.count > 0) {
    node.aggregateRating = { '@type': 'AggregateRating', ratingValue: Number(rd.avg).toFixed(1), reviewCount: rd.count };
    node.review = (rd.reviews || []).slice(0, 5).map((r) => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      author: { '@type': 'Person', name: r.author_name || 'Verified buyer' },
      datePublished: r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : undefined,
      reviewBody: clean(r.body || r.title || 'Great resource.')
    }));
  }
  return jsonLdScript(node);
}

function faqJsonLd(faqs) {
  if (!faqs || !faqs.length) return '';
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
  });
}

// BreadcrumbList → Google shows the crumb trail instead of the raw URL.
function breadcrumbJsonLd(p) {
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: SITE + '/shop' },
      { '@type': 'ListItem', position: 3, name: clean(p.title), item: productUrl(p) }
    ]
  });
}

// Sitewide Organization + WebSite (Part A global), rendered once via layout.
function siteJsonLd() {
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': SITE + '/#org', name: BRAND, url: SITE + '/', logo: SITE + '/images/og-default.png',
        description: 'Premium maths e-books, worksheets and exam practice PDFs for CBSE, ICSE, JEE and more.',
        sameAs: ['https://instagram.com/vidaraorg', 'https://twitter.com/vidaraorg'] },
      { '@type': 'WebSite', '@id': SITE + '/#site', url: SITE + '/', name: BRAND, publisher: { '@id': SITE + '/#org' },
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: SITE + '/shop?s={q}' }, 'query-input': 'required name=q' } }
    ]
  });
}

// Everything a product page needs, in one call.
function forProduct(p, reviewData) {
  const faqs = faqsFor(p);
  return {
    title: seoTitle(p),
    metaDesc: seoDesc(p),
    canonical: productUrl(p),
    ogType: 'product',
    faqs,
    jsonLd: productJsonLd(p, reviewData) + faqJsonLd(faqs) + breadcrumbJsonLd(p)
  };
}

module.exports = { SITE, BRAND, forProduct, seoTitle, seoDesc, faqsFor, productJsonLd, faqJsonLd, breadcrumbJsonLd, siteJsonLd, productUrl, esc };
