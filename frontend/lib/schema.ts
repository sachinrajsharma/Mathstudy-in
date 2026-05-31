/**
 * JSON-LD Schema Markup generators
 * Called in Server Components — injected into <head> via Next.js metadata API.
 * Covers: Product, Book, Course, FAQPage, BreadcrumbList, WebSite, Organization
 */

import type { Product, Review } from './api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mathstudy.in';
const SITE_NAME = 'MathStudy.in';

// ── Organization (site-wide) ──────────────────────────────────────────────────
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
    sameAs: [
      'https://udgamwelfarefoundation.com',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@mathstudy.in',
      contactType: 'customer support',
    },
  };
}

// ── WebSite (for sitelinks search box) ────────────────────────────────────────
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/ebooks?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// ── Product + Book (product detail pages) ─────────────────────────────────────
export function productSchema(product: Product, reviews: Review[]) {
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  const aggregateRating = reviews.length > 0 ? {
    '@type': 'AggregateRating',
    ratingValue: (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1),
    reviewCount: reviews.length,
    bestRating: '5',
    worstRating: '1',
  } : undefined;

  const reviewSchemas = reviews.slice(0, 5).map(r => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: r.author },
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
    reviewBody: r.body,
    datePublished: r.created_at.split('T')[0],
  }));

  // Book schema (for ISBN-free educational books, use URL as identifier)
  const bookSchema = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: product.title,
    description: product.short_desc || product.description,
    url: `${SITE_URL}/ebooks/${product.slug}`,
    image: product.cover_image ? `${SITE_URL}${product.cover_image}` : undefined,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    inLanguage: 'en-IN',
    numberOfPages: product.page_count ?? undefined,
    bookFormat: 'https://schema.org/EBook',
    ...(aggregateRating && { aggregateRating }),
    ...(reviewSchemas.length && { review: reviewSchemas }),
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/ebooks/${product.slug}`,
      priceCurrency: 'INR',
      price: product.price.toFixed(2),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE_NAME },
      ...(discount > 0 && {
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: product.price.toFixed(2),
          priceCurrency: 'INR',
        },
      }),
    },
  };

  return bookSchema;
}

// ── BreadcrumbList ────────────────────────────────────────────────────────────
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ── FAQPage ───────────────────────────────────────────────────────────────────
export interface FAQItem {
  question: string;
  answer: string;
}

export function faqSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// ── Course (for study material / chapter pages) ───────────────────────────────
export function courseSchema(opts: {
  name: string;
  description: string;
  url: string;
  provider?: string;
  grade?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    provider: {
      '@type': 'Organization',
      name: opts.provider ?? SITE_NAME,
      url: SITE_URL,
    },
    educationalLevel: opts.grade ?? 'Secondary',
    inLanguage: 'en-IN',
    isAccessibleForFree: false,
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: 'PT2H',
    },
  };
}

// ── ItemList (for shop/category pages — helps Google show product carousels) ──
export function itemListSchema(products: Product[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/ebooks/${p.slug}`,
      name: p.title,
    })),
  };
}

// ── Serialize helper (for <script type="application/ld+json"> injection) ──────
export function jsonLd(schema: object): string {
  return JSON.stringify(schema, null, process.env.NODE_ENV === 'development' ? 2 : 0);
}
