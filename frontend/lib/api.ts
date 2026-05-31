/**
 * Laravel API client — all server-side data fetching goes through here.
 * Next.js App Router: use in Server Components (no 'use client').
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const API_SECRET = process.env.API_SECRET || '';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Product {
  id: number;
  title: string;
  slug: string;
  short_desc: string;
  description: string;
  price: number;
  original_price: number | null;
  cover_image: string | null;
  page_count: number | null;
  grade: string | null;
  board: string | null;
  category: Category;
  meta_title: string | null;
  meta_desc: string | null;
  is_featured: boolean;
  downloads: number;
  preview_pages: number;   // how many pages are crawlable (SEO)
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  product_count?: number;
}

export interface Review {
  id: number;
  author: string;
  rating: number;        // 1–5
  body: string;
  created_at: string;
}

export interface SearchSuggestion {
  type: 'product' | 'category';
  title: string;
  slug: string;
  url: string;
}

export interface PaginatedProducts {
  data: Product[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

export interface Order {
  id: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  product_id: number;
  title: string;
  cover_image: string | null;
  download_url: string | null;   // signed 15-min URL from Laravel
  download_valid: boolean;
}

// ── Fetch helper ─────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  revalidate: number | false = 3600
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Secret': API_SECRET,
      ...(options.headers ?? {}),
    },
    next: revalidate === false ? { revalidate: 0 } : { revalidate },
  });

  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Product queries ───────────────────────────────────────────────────────────

export async function getProducts(params: {
  page?: number;
  per_page?: number;
  category?: string;
  sort?: 'latest' | 'price_asc' | 'price_desc' | 'popular';
  q?: string;
} = {}): Promise<PaginatedProducts> {
  const qs = new URLSearchParams();
  if (params.page)     qs.set('page',     String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));
  if (params.category) qs.set('category', params.category);
  if (params.sort)     qs.set('sort',     params.sort);
  if (params.q)        qs.set('q',        params.q);
  return apiFetch<PaginatedProducts>(`/products?${qs}`, {}, 300);
}

export async function getProduct(slug: string): Promise<Product | null> {
  try {
    return await apiFetch<Product>(`/products/${slug}`, {}, 600);
  } catch {
    return null;
  }
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/products?featured=1&per_page=8', {}, 600);
}

export async function getRelatedProducts(productId: number, categoryId: number): Promise<Product[]> {
  return apiFetch<Product[]>(`/products?category_id=${categoryId}&exclude=${productId}&per_page=4`, {}, 1800);
}

export async function getProductReviews(productId: number): Promise<Review[]> {
  return apiFetch<Review[]>(`/products/${productId}/reviews`, {}, 3600);
}

// ── Category queries ──────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/categories', {}, 3600);
}

export async function getCategory(slug: string): Promise<Category | null> {
  try {
    return await apiFetch<Category>(`/categories/${slug}`, {}, 3600);
  } catch {
    return null;
  }
}

// ── Search ───────────────────────────────────────────────────────────────────

export async function searchSuggestions(q: string): Promise<SearchSuggestion[]> {
  if (!q || q.length < 2) return [];
  return apiFetch<SearchSuggestion[]>(`/search/suggest?q=${encodeURIComponent(q)}`, {}, false);
}

// ── Sitemap data (for Next.js sitemap.ts) ─────────────────────────────────────

export async function getSitemapProducts(): Promise<{ slug: string; updated_at: string }[]> {
  return apiFetch('/sitemap/products', {}, false);
}

export async function getSitemapCategories(): Promise<{ slug: string }[]> {
  return apiFetch('/sitemap/categories', {}, false);
}

// ── Auth (client-side calls via API routes, not direct) ───────────────────────
// These are called from client-side code via Next.js API routes which proxy to Laravel.
export const AUTH_ENDPOINTS = {
  login:    `${API_BASE}/auth/login`,
  register: `${API_BASE}/auth/register`,
  logout:   `${API_BASE}/auth/logout`,
  me:       `${API_BASE}/auth/me`,
  google:   `${API_BASE}/auth/google`,
} as const;
