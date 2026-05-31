import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mathstudy.in';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow all public pages
        userAgent: '*',
        allow: ['/', '/ebooks/', '/category/', '/blog/'],
        disallow: [
          '/dashboard',          // private user area
          '/cart',               // transient cart state
          '/auth/',              // login/register
          '/api/',               // API routes
          '/checkout/',          // payment pages — no SEO value
          '/download/',          // secure download endpoints
          '/*?*',                // paginated/filtered URLs with query params (avoid duplicate content)
          '/_next/',             // Next.js internals
        ],
      },
      {
        // Block AI scrapers from training on paid content
        userAgent: ['GPTBot', 'Google-Extended', 'CCBot', 'anthropic-ai'],
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
