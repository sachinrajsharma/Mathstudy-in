'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/ebooks',  label: 'E-Books' },
  { href: '/blog',    label: 'Blog'    },
  { href: '/about',   label: 'About'   },
  { href: '/contact', label: 'Contact' },
];

// Cart count stored in sessionStorage key 'ms_cart'
function useCartCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    try {
      const raw = sessionStorage.getItem('ms_cart');
      const cart: Array<{ id: number }> = raw ? JSON.parse(raw) : [];
      setCount(cart.length);
    } catch { setCount(0); }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('ms_cart_updated', refresh);
    return () => window.removeEventListener('ms_cart_updated', refresh);
  }, [refresh]);

  return count;
}

export default function Nav() {
  const pathname    = usePathname();
  const cartCount   = useCartCount();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <header className="nav" role="banner">
        <div className="container nav__inner">
          {/* Logo */}
          <Link href="/" className="nav__logo" aria-label="MathStudy.in — Home">
            Math<span>Study</span>.in
          </Link>

          {/* Desktop links */}
          <nav className="nav__links" aria-label="Main navigation">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`nav__link${pathname.startsWith(href) ? ' nav__link--active' : ''}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="nav__actions">
            {/* Cart */}
            <Link href="/cart" className="nav__cart-btn" aria-label={`Shopping cart, ${cartCount} item${cartCount !== 1 ? 's' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {cartCount > 0 && (
                <span className="nav__cart-count" aria-hidden="true">{cartCount > 9 ? '9+' : cartCount}</span>
              )}
            </Link>

            {/* Auth */}
            <Link href="/auth/login" className="btn btn--primary btn--sm" style={{ display: 'none' as const }} id="nav-login-btn">
              Log in
            </Link>
            <Link href="/dashboard" className="btn btn--outline btn--sm" style={{ display: 'none' as const }} id="nav-dash-btn">
              Dashboard
            </Link>

            {/* Hamburger */}
            <button
              className="nav__hamburger"
              onClick={() => setOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={open}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`nav__drawer${open ? ' nav__drawer--open' : ''}`} aria-hidden={!open}>
        <div
          className="nav__drawer-overlay"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
        <div className="nav__drawer-panel" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button className="nav__drawer-close" onClick={() => setOpen(false)} aria-label="Close menu">
            &#x2715;
          </button>
          <Link href="/" className="nav__logo" style={{ fontSize: '1.3rem' }}>
            Math<span>Study</span>.in
          </Link>
          <nav className="nav__drawer-links">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`nav__drawer-link${pathname.startsWith(href) ? ' nav__link--active' : ''}`}
              >
                {label}
              </Link>
            ))}
            <Link href="/cart" className="nav__drawer-link">
              Cart {cartCount > 0 && `(${cartCount})`}
            </Link>
          </nav>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <Link href="/auth/login" className="btn btn--primary btn--full">Log In</Link>
            <Link href="/auth/register" className="btn btn--outline btn--full">Create Account</Link>
          </div>
        </div>
      </div>
    </>
  );
}
