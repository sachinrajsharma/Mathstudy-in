import type { Metadata } from 'next';
import { homepageMetadata } from '@/lib/seo';
import { getFeaturedProducts, getCategories } from '@/lib/api';
import { websiteSchema, organizationSchema, itemListSchema, jsonLd } from '@/lib/schema';
import Hero from '@/components/shop/Hero';
import CategoryGrid from '@/components/shop/CategoryGrid';
import ProductGrid from '@/components/shop/ProductGrid';
import TrustBar from '@/components/ui/TrustBar';
import WhySection from '@/components/ui/WhySection';

export const metadata: Metadata = homepageMetadata();
export const revalidate = 600;

export default async function HomePage() {
  const [featured, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema()) }}
      />
      {featured.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(itemListSchema(featured)) }}
        />
      )}

      <Hero />
      <TrustBar />
      <CategoryGrid categories={categories} />
      {featured.length > 0 && (
        <section className="section" style={{ background: 'var(--white)', borderTop: '1px solid var(--border)' }}>
          <div className="container">
            <div className="section-head">
              <span className="section-tag">Featured</span>
              <h2>Most Popular E-Books</h2>
              <p>Hand-picked by educators. Used by thousands of students for board exam and JEE prep.</p>
            </div>
            <ProductGrid products={featured} />
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <a href="/ebooks" className="btn btn-outline">View All E-Books &rarr;</a>
            </div>
          </div>
        </section>
      )}
      <WhySection />
    </>
  );
}
