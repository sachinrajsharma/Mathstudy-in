'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { Category } from '@/lib/api';

interface ShopFiltersProps {
  categories: Category[];
  activeCategory?: string;
  activeSort?: string;
}

const SORT_OPTIONS = [
  { value: 'latest',     label: 'Newest First'    },
  { value: 'popular',    label: 'Most Downloaded'  },
  { value: 'price_asc',  label: 'Price: Low → High'},
  { value: 'price_desc', label: 'Price: High → Low'},
];

export default function ShopFilters({ categories, activeCategory, activeSort = 'latest' }: ShopFiltersProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else        params.delete(key);
    params.delete('page'); // reset to page 1
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  return (
    <aside className="shop-sidebar" aria-label="Filter e-books">
      <div className="filters">
        <div className="filters__title">Filters</div>

        {/* Sort */}
        <div className="filter-group">
          <label className="filter-group__label" htmlFor="sort-select">Sort by</label>
          <select
            id="sort-select"
            className="form-input"
            value={activeSort}
            onChange={e => updateParam('sort', e.target.value)}
            style={{ padding: '.55rem .75rem', fontSize: '.875rem' }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="filter-group">
          <span className="filter-group__label" id="cat-filter-label">Category</span>
          <div role="radiogroup" aria-labelledby="cat-filter-label">
            {/* All */}
            <label className={`filter-option${!activeCategory ? ' filter-option--active' : ''}`}>
              <input
                type="radio"
                name="category"
                value=""
                checked={!activeCategory}
                onChange={() => updateParam('category', null)}
              />
              All Categories
            </label>

            {categories.map(cat => (
              <label
                key={cat.id}
                className={`filter-option${activeCategory === cat.slug ? ' filter-option--active' : ''}`}
              >
                <input
                  type="radio"
                  name="category"
                  value={cat.slug}
                  checked={activeCategory === cat.slug}
                  onChange={() => updateParam('category', cat.slug)}
                />
                {cat.name}
                {cat.product_count != null && (
                  <span style={{ marginLeft: 'auto', fontSize: '.72rem', color: 'var(--text-muted)' }}>
                    {cat.product_count}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Clear filters */}
        {(activeCategory || activeSort !== 'latest') && (
          <button
            className="btn btn--ghost btn--sm btn--full"
            onClick={() => router.push('/ebooks')}
            type="button"
          >
            Clear Filters
          </button>
        )}
      </div>
    </aside>
  );
}
