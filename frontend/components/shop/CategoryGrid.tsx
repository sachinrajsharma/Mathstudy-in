import Link from 'next/link';
import type { Category } from '@/lib/api';

const CATEGORY_ICONS: Record<string, string> = {
  'primary-maths':  '&#x1F4D7;',
  'middle-maths':   '&#x1F4D8;',
  'cbse-9-10':      '&#x1F4D9;',
  'cbse-11-12':     '&#x1F4D3;',
  'jee':            '&#x1F3AF;',
  'cuet':           '&#x1F393;',
  'cat-quant':      '&#x1F4CA;',
  'icse':           '&#x1F4DC;',
  'worksheets':     '&#x270F;',
  'sample-papers':  '&#x1F4CB;',
  'case-studies':   '&#x1F4DD;',
  'revision-notes': '&#x1F4A1;',
};

const DEFAULT_ICON = '&#x1F4D6;';

interface CategoryGridProps {
  categories: Category[];
  activeSlug?: string;
}

export default function CategoryGrid({ categories, activeSlug }: CategoryGridProps) {
  return (
    <section aria-labelledby="categories-heading">
      <div className="container section">
        <div className="section-header">
          <span className="section-header__label">Browse by Topic</span>
          <h2 className="section-header__title" id="categories-heading">
            Find Your Perfect E-Book
          </h2>
          <p className="section-header__desc">
            From Grade 1 primary maths to JEE Advanced — every level, every board.
          </p>
        </div>

        <div className="category-grid">
          {categories.map(cat => {
            const icon = CATEGORY_ICONS[cat.slug] ?? DEFAULT_ICON;
            const isActive = cat.slug === activeSlug;

            return (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className={`category-card${isActive ? ' category-card--active' : ''}`}
                aria-label={`Browse ${cat.name}${cat.product_count ? ` — ${cat.product_count} books` : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="category-card__icon" aria-hidden="true">
                  <span dangerouslySetInnerHTML={{ __html: icon }} />
                </div>
                <span>{cat.name}</span>
                {cat.product_count != null && (
                  <span className="category-card__count">{cat.product_count} book{cat.product_count !== 1 ? 's' : ''}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
