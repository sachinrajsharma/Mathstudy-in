import type { Metadata } from 'next';
import { baseMetadata } from '@/lib/seo';
import Nav from '@/components/ui/Nav';
import Footer from '@/components/ui/Footer';
import '@/styles/globals.css';

export const metadata: Metadata = baseMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        {/* Preconnect for external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
