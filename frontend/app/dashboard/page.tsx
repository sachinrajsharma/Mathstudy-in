import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { dashboardMetadata } from '@/lib/seo';
import type { Order } from '@/lib/api';

export const metadata: Metadata = dashboardMetadata();

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function getOrders(token: string): Promise<Order[]> {
  try {
    const res = await fetch(`${API_BASE}/user/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

async function getUser(token: string): Promise<{ name: string; email: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function DashboardPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('ms_token')?.value;

  if (!token) redirect('/auth/login');

  const [user, orders] = await Promise.all([
    getUser(token),
    getOrders(token),
  ]);

  if (!user) redirect('/auth/login');

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

  return (
    <main className="dashboard">
      <div className="container">
        {/* Header */}
        <div className="dashboard__header">
          <h1 className="dashboard__greeting">Hello, {user.name.split(' ')[0]}</h1>
          <p className="dashboard__sub">{user.email}</p>
        </div>

        {/* Stats strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          marginBottom: '2.5rem',
        }}>
          {[
            { label: 'Total Orders',   value: orders.length },
            { label: 'Paid Orders',    value: orders.filter(o => o.status === 'paid').length },
            { label: 'Books Owned',    value: orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.items.length, 0) },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                {value}
              </div>
              <div style={{ fontSize: '.82rem', color: 'var(--text-secondary)', marginTop: '.3rem' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Orders */}
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem' }}>Your Orders</h2>

        {orders.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty__icon" aria-hidden="true">&#x1F4E6;</div>
            <p className="cart-empty__text">No orders yet</p>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Browse our e-books and make your first purchase.
            </p>
            <Link href="/ebooks" className="btn btn--primary">Browse E-Books</Link>
          </div>
        ) : (
          <div className="orders">
            {orders.map(order => (
              <div key={order.id} className="order-card">
                {/* Order header */}
                <div className="order-card__header">
                  <div>
                    <div className="order-card__id">Order #{order.id}</div>
                    <div className="order-card__date">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--primary)' }}>
                      &#x20B9;{Math.round(order.total_amount)}
                    </div>
                    <span className={`status-badge status-badge--${order.status}`}>
                      {order.status === 'paid' ? 'Paid' : order.status === 'pending' ? 'Pending' : 'Failed'}
                    </span>
                  </div>
                </div>

                {/* Order items */}
                <div className="order-card__items">
                  {order.items.map(item => {
                    const imgSrc = item.cover_image
                      ? `${SITE_URL}${item.cover_image}`
                      : '/images/book-placeholder.svg';
                    return (
                      <div key={item.product_id} className="order-item">
                        <Image
                          src={imgSrc}
                          alt={`${item.title} cover`}
                          width={56}
                          height={72}
                          className="order-item__img"
                          style={{ objectFit: 'cover' }}
                        />
                        <div className="order-item__body">
                          <div className="order-item__title">{item.title}</div>
                          {order.status === 'paid' && item.download_valid && item.download_url && (
                            <a
                              href={item.download_url}
                              className="order-item__download"
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Download ${item.title} as PDF`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              Download PDF
                            </a>
                          )}
                          {order.status === 'paid' && !item.download_valid && (
                            <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: '.35rem', display: 'block' }}>
                              Link expired &mdash;{' '}
                              <a href="/contact" style={{ color: 'var(--primary)' }}>contact support</a>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Log out */}
        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="btn btn--outline btn--sm">
              Log Out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
