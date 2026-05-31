import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct, getRelatedProducts, getProductReviews } from '@/lib/api';
import { productMetadata } from '@/lib/seo';
import { productSchema, breadcrumbSchema, faqSchema, jsonLd } from '@/lib/schema';
import ProductImages from '@/components/shop/ProductImages';
import ProductCTA from '@/components/shop/ProductCTA';
import ReviewList from '@/components/shop/ReviewList';
import ProductGrid from '@/components/shop/ProductGrid';

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return {};
  return productMetadata(product);
}

export const revalidate = 600;

// Standard FAQs injected on every product page (great for featured snippets)
const PRODUCT_FAQS = [
  {
    question: 'How do I download the e-book after payment?',
    answer: 'After completing your UPI payment, a secure download link appears on screen immediately and is also sent to your account dashboard. The PDF downloads instantly — no waiting.',
  },
  {
    question: 'Is the payment secure?',
    answer: 'Yes. Payments go directly via UPI to our official business account (mathstudy.in). No card details are stored on our servers. Your bank displays our verified merchant name.',
  },
  {
    question: 'How many times can I download the PDF?',
    answer: 'You can re-download your purchased e-book up to 5 times within 48 hours via the secure link. It also remains permanently available in your My Orders dashboard.',
  },
  {
    question: 'Are the e-books aligned with the latest CBSE/ICSE syllabus?',
    answer: 'Yes. All our e-books are aligned with the current CBSE and ICSE syllabi and updated annually to reflect any board changes.',
  },
];

export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const [reviews, related] = await Promise.all([
    getProductReviews(product.id),
    getRelatedProducts(product.id, product.category.id),
  ]);

  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100) : 0;

  const breadcrumbs = [
    { name: 'Home',     url: 'https://mathstudy.in' },
    { name: 'E-Books',  url: 'https://mathstudy.in/ebooks' },
    { name: product.category.name, url: `https://mathstudy.in/category/${product.category.slug}` },
    { name: product.title, url: `https://mathstudy.in/ebooks/${product.slug}` },
  ];

  return (
    <>
      {/* Schema injection */}
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(productSchema(product, reviews)) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(breadcrumbs)) }} />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(PRODUCT_FAQS)) }} />

      <div className="container" style={{ paddingTop: '28px', paddingBottom: '60px' }}>

        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="breadcrumb">
          <a href="/">Home</a><span>/</span>
          <a href="/ebooks">E-Books</a><span>/</span>
          <a href={`/category/${product.category.slug}`}>{product.category.name}</a><span>/</span>
          <span>{product.title}</span>
        </nav>

        <div className="product-detail">
          {/* ── Left: Cover + Preview ── */}
          <div className="product-cover-wrap">
            <ProductImages product={product} />
            {/* Trust badge */}
            <div style={{ marginTop: '16px', padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px' }}>
              <p style={{ fontSize: '0.82rem', color: '#166534', fontWeight: 600, marginBottom: '4px' }}>
                Secure UPI Payment
              </p>
              <p style={{ fontSize: '0.78rem', color: '#15803d' }}>
                Pay directly to mathstudy.in via GPay, PhonePe or BHIM. Zero transaction fees. Instant download.
              </p>
            </div>
          </div>

          {/* ── Right: Info + CTA ── */}
          <div className="product-info">
            <div className="product-meta">
              <span className="product-badge">{product.category.name}</span>
              {product.grade  && <span className="product-badge" style={{ background: '#dcfce7', color: '#166534' }}>{product.grade}</span>}
              {product.board  && <span className="product-badge" style={{ background: '#fef9c3', color: '#854d0e' }}>{product.board}</span>}
              {product.page_count && <span className="product-badge" style={{ background: '#f3f4f6', color: '#374151' }}>{product.page_count} pages</span>}
            </div>

            <h1>{product.title}</h1>

            <div className="product-price">
              <span className="price-current">&#8377;{Math.round(product.price)}</span>
              {product.original_price && product.original_price > product.price && (
                <>
                  <span className="price-original">&#8377;{Math.round(product.original_price)}</span>
                  <span className="price-discount">{discount}% OFF</span>
                </>
              )}
            </div>

            {/* Aggregate rating (microdata) */}
            {reviews.length > 0 && (
              <div
                itemScope itemType="https://schema.org/AggregateRating"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}
              >
                <span style={{ color: '#f59e0b', fontSize: '1rem' }}>
                  {'★'.repeat(Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length))}
                </span>
                <span style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
                  <meta itemProp="ratingValue" content={(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1)} />
                  <meta itemProp="reviewCount" content={String(reviews.length)} />
                  {(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1)} / 5 ({reviews.length} review{reviews.length!==1?'s':''})
                </span>
              </div>
            )}

            {product.short_desc && <p className="product-desc">{product.short_desc}</p>}
            {product.description && (
              <div
                style={{ fontSize: '0.93rem', color: 'var(--mid)', lineHeight: 1.8, marginBottom: '24px' }}
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}

            {/* ── UPI Checkout CTA (Client Component) ── */}
            <ProductCTA product={product} />

            {/* Features */}
            <div className="product-features" style={{ marginTop: '20px' }}>
              {[
                'Instant PDF download',
                'Zero transaction fees (UPI)',
                `${product.board ?? 'CBSE'}/ICSE aligned`,
                `${product.page_count ?? '?'} pages`,
                'Re-download anytime',
                'Works on all devices',
              ].map(f => (
                <div className="feature-item" key={f}>
                  <span className="feature-icon">✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CRAWLABLE PREVIEW TEXT (for SEO — NOT behind blur for bots) ── */}
        {/* This section renders the first chapter as plain HTML text so Googlebot
            can index the actual content and establish topical relevance.
            The JS blur effect only applies to screen rendering. */}
        <section style={{ marginTop: '48px' }} aria-label="Book preview">
          <h2 style={{ marginBottom: '16px' }}>Preview: Table of Contents</h2>
          <div
            className="book-preview-text"
            /* data-preview-pages tells JS how many to blur */
            data-preview-pages={product.preview_pages ?? 1}
          >
            {/* Server renders full preview text — GoogleBot indexes this.
                Client JS applies progressive blur beyond preview_pages. */}
            <p style={{ color: 'var(--mid)', fontSize: '0.9rem', lineHeight: 1.8 }}>
              {product.description}
            </p>
          </div>
        </section>

        {/* FAQ section */}
        <section style={{ marginTop: '48px' }} aria-labelledby="faq-heading">
          <h2 id="faq-heading" style={{ marginBottom: '20px' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {PRODUCT_FAQS.map(faq => (
              <details
                key={faq.question}
                style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 18px' }}
              >
                <summary style={{ fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
                  {faq.question}
                </summary>
                <p style={{ marginTop: '10px', color: 'var(--mid)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section style={{ marginTop: '48px' }} aria-labelledby="reviews-heading">
            <h2 id="reviews-heading" style={{ marginBottom: '20px' }}>Student Reviews</h2>
            <ReviewList reviews={reviews} />
          </section>
        )}

        {/* Related */}
        {related.length > 0 && (
          <section style={{ marginTop: '60px' }} aria-labelledby="related-heading">
            <h2 id="related-heading" style={{ marginBottom: '24px' }}>You Might Also Like</h2>
            <ProductGrid products={related} />
          </section>
        )}
      </div>
    </>
  );
}
