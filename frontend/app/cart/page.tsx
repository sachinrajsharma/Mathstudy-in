'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface CartProduct {
  id:             number;
  title:          string;
  slug:           string;
  price:          number;
  original_price: number | null;
  cover_image:    string | null;
  grade:          string | null;
}

const CART_KEY = 'ms_cart';

function getCart(): CartProduct[] {
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCart(cart: CartProduct[]) {
  sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('ms_cart_updated'));
}

export default function CartPage() {
  const [items,   setItems]   = useState<CartProduct[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(getCart());
    setMounted(true);
  }, []);

  const remove = (id: number) => {
    const next = items.filter(i => i.id !== id);
    setItems(next);
    saveCart(next);
  };

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

  if (!mounted) return null; // prevent hydration mismatch

  return (
    <main className="cart-page">
      <div className="container">
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '1.75rem' }}>
          Shopping Cart{items.length > 0 && ` (${items.length})`}
        </h1>

        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty__icon" aria-hidden="true">&#x1F6D2;</div>
            <p className="cart-empty__text">Your cart is empty</p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Browse our e-books and add one to get started.
            </p>
            <Link href="/ebooks" className="btn btn--primary">Browse E-Books</Link>
          </div>
        ) : (
          <div className="cart-layout">
            {/* Items */}
            <div>
              <div className="cart-items">
                {items.map(item => {
                  const imgSrc = item.cover_image
                    ? `${SITE_URL}${item.cover_image}`
                    : '/images/book-placeholder.svg';
                  return (
                    <div key={item.id} className="cart-item">
                      <Link href={`/ebooks/${item.slug}`} tabIndex={-1} aria-hidden="true">
                        <Image
                          src={imgSrc}
                          alt={`${item.title} cover`}
                          width={72}
                          height={96}
                          className="cart-item__img"
                          style={{ objectFit: 'cover' }}
                        />
                      </Link>
                      <div className="cart-item__body">
                        {item.grade && (
                          <div className="cart-item__grade">{item.grade}</div>
                        )}
                        <Link href={`/ebooks/${item.slug}`}>
                          <div className="cart-item__title">{item.title}</div>
                        </Link>
                        <div className="cart-item__price">&#x20B9;{Math.round(item.price)}</div>
                      </div>
                      <button
                        className="cart-item__remove"
                        onClick={() => remove(item.id)}
                        aria-label={`Remove ${item.title} from cart`}
                        title="Remove"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                <Link href="/ebooks" className="btn btn--ghost btn--sm">
                  &#x2190; Continue Shopping
                </Link>
                <button
                  className="btn btn--ghost btn--sm"
                  style={{ color: 'var(--error)' }}
                  onClick={() => { setItems([]); saveCart([]); }}
                >
                  Clear Cart
                </button>
              </div>
            </div>

            {/* Summary */}
            <div>
              <div className="cart-summary">
                <div className="cart-summary__title">Order Summary</div>

                {items.map(item => (
                  <div key={item.id} className="cart-summary__line">
                    <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </span>
                    <span>&#x20B9;{Math.round(item.price)}</span>
                  </div>
                ))}

                <div className="cart-summary__total">
                  <span>Total</span>
                  <span>&#x20B9;{Math.round(subtotal)}</span>
                </div>

                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                  {/* Note: each product has its own UPI checkout on the product page */}
                  <p style={{ fontSize: '.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    Each book is purchased separately via UPI on the product page. Click any book title
                    above to go to its checkout.
                  </p>
                  {items.length === 1 && (
                    <Link href={`/ebooks/${items[0].slug}`} className="btn btn--primary btn--full">
                      Buy Now &#x20B9;{Math.round(items[0].price)}
                    </Link>
                  )}
                </div>

                {/* Trust */}
                <div style={{
                  marginTop: '1.25rem',
                  padding: '1rem',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius)',
                  fontSize: '.78rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.65,
                }}>
                  <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '.35rem' }}>
                    Secure UPI Payment
                  </strong>
                  Pay directly via GPay, PhonePe, or Paytm. Zero transaction fees.
                  Your PDF is delivered instantly after payment confirmation.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
