import type { MetadataRoute } from 'next';
import { getSitemapProducts, getSitemapCategories } from '@/lib/api';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mathstudy.in';

export const revalidate = 3600; // regenerate hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    getSitemapProducts(),
    getSitemapCategories(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,            lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/ebooks`,lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/blog`,  lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/contact`,lastModified: new Date(),changeFrequency: 'monthly', priority: 0.3 },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map(cat => ({
    url: `${BASE}/category/${cat.slug}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const productPages: MetadataRoute.Sitemap = products.map(p => ({
    url: `${BASE}/ebooks/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
