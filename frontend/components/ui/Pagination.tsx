'use client';

interface PaginationProps {
  current: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ current, total, onPageChange }: PaginationProps) {
  if (total <= 1) return null;

  const pages = buildPageRange(current, total);

  return (
    <nav className="pagination" aria-label="Pagination" role="navigation">
      {/* Prev */}
      <button
        className="pagination__btn"
        onClick={() => onPageChange(current - 1)}
        disabled={current === 1}
        aria-label="Previous page"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} style={{ padding: '0 .25rem', color: 'var(--text-muted)' }} aria-hidden="true">
            &hellip;
          </span>
        ) : (
          <button
            key={page}
            className={`pagination__btn${page === current ? ' pagination__btn--active' : ''}`}
            onClick={() => onPageChange(page as number)}
            aria-label={`Page ${page}`}
            aria-current={page === current ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        className="pagination__btn"
        onClick={() => onPageChange(current + 1)}
        disabled={current === total}
        aria-label="Next page"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </nav>
  );
}

function buildPageRange(current: number, total: number): (number | '...')[] {
  const delta = 2;
  const range: (number | '...')[] = [];
  let last = 0;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      if (last && i - last > 1) range.push('...');
      range.push(i);
      last = i;
    }
  }

  return range;
}
