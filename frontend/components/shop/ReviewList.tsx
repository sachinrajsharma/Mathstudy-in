import type { Review } from '@/lib/api';

interface ReviewListProps {
  reviews: Review[];
}

function stars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

export default function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="reviews__empty" role="status">
        No reviews yet — be the first to leave one after purchase.
      </div>
    );
  }

  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <section aria-label="Customer reviews">
      {/* Aggregate summary */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}
        itemProp="aggregateRating"
        itemScope
        itemType="https://schema.org/AggregateRating"
      >
        <meta itemProp="ratingValue" content={avg} />
        <meta itemProp="reviewCount" content={String(reviews.length)} />
        <meta itemProp="bestRating"  content="5" />

        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
          {avg}
        </div>
        <div>
          <div style={{ color: 'var(--accent)', fontSize: '1.25rem', letterSpacing: '-.05em' }} aria-hidden="true">
            {stars(Math.round(parseFloat(avg)))}
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)' }}>
            Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Review list */}
      <div className="reviews">
        {reviews.map(r => (
          <article
            key={r.id}
            className="review-card"
            itemProp="review"
            itemScope
            itemType="https://schema.org/Review"
          >
            <div className="review-card__header">
              <div>
                <div className="review-card__author" itemProp="author" itemScope itemType="https://schema.org/Person">
                  <span itemProp="name">{r.author}</span>
                </div>
                <div
                  className="review-card__stars"
                  aria-label={`${r.rating} out of 5 stars`}
                  itemProp="reviewRating"
                  itemScope
                  itemType="https://schema.org/Rating"
                >
                  <meta itemProp="ratingValue" content={String(r.rating)} />
                  <meta itemProp="bestRating"  content="5" />
                  <span aria-hidden="true">{stars(r.rating)}</span>
                </div>
              </div>
              <time
                className="review-card__date"
                dateTime={r.created_at}
                itemProp="datePublished"
              >
                {new Date(r.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </time>
            </div>
            <p className="review-card__body" itemProp="reviewBody">{r.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
