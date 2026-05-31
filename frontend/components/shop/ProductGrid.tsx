import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/api';

interface ProductGridProps {
  products: Product[];
  heading?: string;
}

export default function ProductGrid({ products, heading }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="cart-empty">
        <div className="cart-empty__icon" aria-hidden="true">&#x1F4DA;</div>
        <p className="cart-empty__text">No books found</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
          Try a different search or browse a category above.
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby={heading ? 'pg-heading' : undefined}>
      {heading && (
        <h2 id="pg-heading" style={{ marginBottom: '1.25rem', fontSize: '1.25rem', fontWeight: 700 }}>
          {heading}
        </h2>
      )}
      <div className="product-grid">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
  const imgSrc   = product.cover_image
    ? `${SITE_URL}${product.cover_image}`
    : '/images/book-placeholder.svg';

  return (
    <article className="card product-card" itemScope itemType="https://schema.org/Product">
      <Link href={`/ebooks/${product.slug}`} aria-label={`View ${product.title}`} tabIndex={-1} aria-hidden="true">
        <div className="product-card__img-wrap">
          <Image
            src={imgSrc}
            alt={`${product.title} cover`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            style={{ objectFit: 'cover' }}
            loading="lazy"
            itemProp="image"
          />
          {discount > 0 && (
            <span className="product-card__badge" aria-label={`${discount}% discount`}>
              -{discount}%
            </span>
          )}
        </div>
      </Link>

      <div className="product-card__body">
        {product.grade && (
          <div className="product-card__grade" aria-label={`Grade level: ${product.grade}`}>
            {product.grade}{product.board ? ` · ${product.board}` : ''}
          </div>
        )}
        <Link href={`/ebooks/${product.slug}`}>
          <h3 className="product-card__title" itemProp="name">{product.title}</h3>
        </Link>
        {product.short_desc && (
          <p className="product-card__desc" itemProp="description">{product.short_desc}</p>
        )}
      </div>

      <div className="product-card__footer" itemProp="offers" itemScope itemType="https://schema.org/Offer">
        <meta itemProp="priceCurrency" content="INR" />
        <meta itemProp="availability" content="https://schema.org/InStock" />
        <div className="product-card__price">
          <span className="product-card__price-current" itemProp="price" content={String(product.price)}>
            &#x20B9;{Math.round(product.price)}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span className="product-card__price-original">
              &#x20B9;{Math.round(product.original_price)}
            </span>
          )}
        </div>
        <Link href={`/ebooks/${product.slug}`} className="btn btn--primary btn--sm">
          Buy
        </Link>
      </div>
    </article>
  );
}
