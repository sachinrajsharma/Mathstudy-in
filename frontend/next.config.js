/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Compression & Performance ──────────────────────────────────────────────
  compress: true,
  poweredByHeader: false,

  // ── Image optimization ────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      { protocol: 'https', hostname: 'mathstudy.in' },
      { protocol: 'http',  hostname: 'localhost'    },
    ],
  },

  // ── Security + SEO headers ────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff'          },
          { key: 'X-Frame-Options',            value: 'SAMEORIGIN'       },
          { key: 'X-XSS-Protection',           value: '1; mode=block'   },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Aggressive caching for static assets
        source: '/(_next/static|images|fonts)/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  // ── Redirects (clean SEO URLs, migrate from WP) ───────────────────────────
  async redirects() {
    return [
      // WooCommerce product URL → new URL
      { source: '/product/:slug', destination: '/ebooks/:slug', permanent: true },
      // WooCommerce shop → new shop
      { source: '/shop',          destination: '/ebooks',        permanent: true },
      // WP category URLs
      { source: '/product-category/:slug', destination: '/category/:slug', permanent: true },
    ];
  },

  // ── Environment variables exposed to browser ──────────────────────────────
  env: {
    NEXT_PUBLIC_SITE_URL:  process.env.NEXT_PUBLIC_SITE_URL  || 'https://mathstudy.in',
    NEXT_PUBLIC_API_URL:   process.env.NEXT_PUBLIC_API_URL   || 'http://localhost:8000/api',
    NEXT_PUBLIC_RZP_KEY:   process.env.NEXT_PUBLIC_RZP_KEY   || '',
  },

  // ── Experimental ──────────────────────────────────────────────────────────
  experimental: {
    optimizeCss: true,
  },
};

module.exports = nextConfig;
