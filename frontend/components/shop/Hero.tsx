'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchSuggestion } from '@/lib/api';

export default function Hero() {
  const router              = useRouter();
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) setResults(await res.json());
      } catch { /* silent */ }
      setLoading(false);
    }, 320);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/ebooks?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSelect = (item: SearchSuggestion) => {
    setQuery('');
    setResults([]);
    router.push(item.url);
  };

  const showDropdown = focused && results.length > 0;

  return (
    <section className="hero" aria-label="Search math e-books">
      <div className="container hero__inner">
        {/* Badge */}
        <div className="hero__badge" role="text">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          42+ Premium Math E-Books
        </div>

        {/* Heading */}
        <h1 className="hero__title">
          Master Maths with <em>Expert-Written</em> E-Books
        </h1>
        <p className="hero__desc">
          CBSE &amp; ICSE aligned worksheets, sample papers and case studies for Grade&nbsp;1&ndash;12,
          JEE, CUET and CAT. Download instantly as PDF. Starting at just &#x20B9;7.
        </p>

        {/* Search */}
        <div className="hero__search">
          <form onSubmit={handleSubmit} role="search">
            <label htmlFor="hero-search" className="sr-only">Search math e-books</label>
            <div style={{ position: 'relative' }}>
              <span className="hero__search-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                ref={inputRef}
                id="hero-search"
                type="search"
                className="hero__search-input"
                placeholder="Search e.g. &ldquo;Grade 10 Circles&rdquo; or &ldquo;JEE Integration&rdquo;"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 180)}
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="hero-search-results"
                aria-expanded={showDropdown}
              />
            </div>
          </form>

          {/* Autocomplete dropdown */}
          {showDropdown && (
            <ul
              className="hero__search-results"
              id="hero-search-results"
              role="listbox"
              aria-label="Search suggestions"
            >
              {results.map(item => (
                <li
                  key={`${item.type}-${item.slug}`}
                  role="option"
                  aria-selected="false"
                >
                  <button
                    className="hero__search-item"
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => handleSelect(item)}
                    type="button"
                  >
                    <span className="hero__search-item-type">{item.type === 'product' ? 'Book' : 'Category'}</span>
                    <span>{item.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {loading && (
            <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-live="polite" aria-label="Searching…" />
          )}
        </div>

        {/* Stats */}
        <div className="hero__stats" aria-label="Site statistics">
          <div className="hero__stat"><strong>10,000+</strong> downloads</div>
          <div className="hero__stat"><strong>42+</strong> e-books</div>
          <div className="hero__stat"><strong>16</strong> categories</div>
          <div className="hero__stat"><strong>4.8 &#9733;</strong> average rating</div>
        </div>
      </div>
    </section>
  );
}
