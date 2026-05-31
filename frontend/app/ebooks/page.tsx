import type { Metadata } from 'next';
import { shopMetadata } from '@/lib/seo';
import { getProducts, getCategories } from '@/lib/api';
import { itemListSchema, jsonLd } from '@/lib/schema';
import ProductGrid from '@/components/shop/ProductGrid';
import ShopFilters from '@/components/shop/ShopFilters';
import Pagination from '@/components/ui/Pagination';

interface Props {
  searchParams: { page?: string; cat?: string; sort?: string; q?: string };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { getCategory } = await import('@/lib/api');
  const cat = searchParams.cat ? await getCategory(searchParams.cat) : undefined;
  return shopMetadata({
    category: cat ?? undefined,
    page: Number(searchParams.page ?? 1),
    q: searchParams.q,
  });
}

export const revalidate = 300;

export default async function ShopPage({ searchParams }: Props) {
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const [{ data: products, total, last_page }, categories] = await Promise.all([
    getProducts({
      page,
      per_page: 12,
      category: searchParams.cat,
      sort: searchParams.sort as 'latest' | 'price_asc' | 'price_desc' | 'popular' | undefined,
      q: searchParams.q,
    }),
    getCategories(),
  ]);

  return (
    <>
      {products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(itemListSchema(products)) }}
        />
      )}

      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        {/* Page header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', marginBottom: '8px' }}>
            {searchParams.q
              ? `Results for "${searchParams.q}"`
              : searchParams.cat
              ? categories.find(c => c.slug === searchParams.cat)?.name ?? 'E-Books'
              : 'All Math E-Books'}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
            {total} book{total !== 1 ? 's' : ''} — instant PDF download via UPI
          </p>
        </div>

        <div className="shop-wrap">
          <ShopFilters categories={categories} activeCat={searchParams.cat} />
          <div>
            <div className="shop-header">
              <span className="shop-count">{products.length} of {total}</span>
              <select
                className="sort-select"
                defaultValue={searchParams.sort ?? 'latest'}
                // Sort change handled by client component wrapper
              >
                <option value="latest">Latest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📚</div>
                <h3>No products found</h3>
                <p style={{ marginTop: '8px' }}><a href="/ebooks">Clear filters</a></p>
              </div>
            ) : (
              <ProductGrid products={products} />
            )}

            {last_page > 1 && (
              <Pagination
                currentPage={page}
                totalPages={last_page}
                basePath="/ebooks"
                params={{ cat: searchParams.cat, sort: searchParams.sort, q: searchParams.q }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
