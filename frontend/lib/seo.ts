/**
 * Metadata factory — generates Next.js Metadata objects for every page type.
 * Uses the Next.js 14 App Router metadata API (no react-helmet needed).
 */

import type { Metadata } from 'next';
import type { Product, Category } from './api';

const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL || 'https://mathstudy.in';
const SITE_NAME = 'MathStudy.in';
const DEFAULT_OG = `${SITE_URL}/images/og-default.png`;

// ── Base metadata (merged into every page) ────────────────────────────────────
export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  authors: [{ name: 'MathStudy Editorial', url: SITE_URL }],
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? '',
  },
};

// ── Homepage ──────────────────────────────────────────────────────────────────
export function homepageMetadata(): Metadata {
  const title = 'Premium Math E-Books for CBSE, JEE, ICSE | MathStudy.in';
  const desc  = 'Download high-quality math e-books for Grades 1–12, JEE Main & Advanced, CUET, CAT. CBSE & ICSE aligned. Instant PDF download. Starting ₹7. No transaction fees — pay direct UPI.';
  return {
    ...baseMetadata,
    title,
    description: desc,
    alternates: { canonical: SITE_URL },
    openGraph: {
      type: 'website', title, description: desc,
      url: SITE_URL, siteName: SITE_NAME,
      images: [{ url: DEFAULT_OG, width: 1200, height: 630, alt: SITE_NAME }],
      locale: 'en_IN',
    },
    twitter: { card: 'summary_large_image', title, description: desc, images: [DEFAULT_OG] },
  };
}

// ── Shop / category listing ───────────────────────────────────────────────────
export function shopMetadata(opts: {
  category?: Category;
  page?: number;
  q?: string;
}): Metadata {
  const { category, page = 1, q } = opts;
  const pageStr = page > 1 ? ` — Page ${page}` : '';

  let title: string;
  let desc: string;
  let canonical: string;

  if (q) {
    title = `"${q}" Math E-Books${pageStr} | MathStudy.in`;
    desc  = `Search results for "${q}" — download CBSE/JEE math e-books instantly as PDF.`;
    canonical = `${SITE_URL}/ebooks?q=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ''}`;
  } else if (category) {
    title = `${category.name} E-Books & Study Material${pageStr} | MathStudy.in`;
    desc  = category.description
      ? `${category.description} Instant PDF download, CBSE aligned.`
      : `Download ${category.name} e-books as PDF. CBSE/ICSE aligned worksheets and case studies. Instant download after UPI payment.`;
    canonical = `${SITE_URL}/category/${category.slug}${page > 1 ? `?page=${page}` : ''}`;
  } else {
    title = `Math E-Books Shop — All Grades & Exams${pageStr} | MathStudy.in`;
    desc  = 'Browse 42+ premium math e-books for Grades 1–12, JEE, CAT, CUET. Case studies, worksheets, sample papers. Instant PDF download via UPI. No hidden fees.';
    canonical = `${SITE_URL}/ebooks${page > 1 ? `?page=${page}` : ''}`;
  }

  return {
    ...baseMetadata,
    title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      type: 'website', title, description: desc,
      url: canonical, siteName: SITE_NAME,
      images: [{ url: DEFAULT_OG, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description: desc },
  };
}

// ── Product detail ────────────────────────────────────────────────────────────
export function productMetadata(product: Product): Metadata {
  const title = product.meta_title
    || `${product.title} — Download PDF | MathStudy.in`;
  const desc  = product.meta_desc
    || `Download ${product.title} as PDF instantly. ${product.grade ? product.grade + ' | ' : ''}CBSE/ICSE aligned. Direct UPI payment — ₹${Math.round(product.price)}.`;
  const canonical = `${SITE_URL}/ebooks/${product.slug}`;
  const image     = product.cover_image
    ? `${SITE_URL}${product.cover_image}` : DEFAULT_OG;

  return {
    ...baseMetadata,
    title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      type: 'website', title, description: desc,
      url: canonical, siteName: SITE_NAME,
      images: [{ url: image, width: 800, height: 1067, alt: product.title }],
    },
    twitter: {
      card: 'summary_large_image', title, description: desc,
      images: [image],
    },
    // Tell Google this product is available for ₹ purchase
    other: {
      'product:price:amount':   String(product.price),
      'product:price:currency': 'INR',
      'product:availability':   'in stock',
    },
  };
}

// ── Category page ─────────────────────────────────────────────────────────────
export function categoryMetadata(category: Category, page = 1): Metadata {
  return shopMetadata({ category, page });
}

// ── Auth pages ────────────────────────────────────────────────────────────────
export function authMetadata(type: 'login' | 'register'): Metadata {
  const isLogin = type === 'login';
  const title   = isLogin ? 'Log In | MathStudy.in' : 'Create Account | MathStudy.in';
  const desc    = isLogin
    ? 'Log in to access your purchased math e-books and download PDFs instantly.'
    : 'Create a free MathStudy.in account to purchase and download premium math e-books.';
  return {
    ...baseMetadata,
    title, description: desc,
    robots: { index: false, follow: false }, // don't index auth pages
    alternates: { canonical: `${SITE_URL}/auth/${type}` },
  };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function dashboardMetadata(): Metadata {
  return {
    ...baseMetadata,
    title: 'My Dashboard | MathStudy.in',
    description: 'Access your purchased e-books and download PDFs.',
    robots: { index: false, follow: false },
  };
}
