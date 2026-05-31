'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authMetadata } from '@/lib/seo';

// Metadata must be exported from a server component — wire it in a parent layout if needed.
// For now the page is client-side; metadata is applied at segment level via layout.

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Invalid email or password. Please try again.');
      } else {
        // Store token in httpOnly cookie via the API route, then redirect
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">Math<span>Study</span>.in</div>
        <h1 className="auth-card__title">Welcome back</h1>
        <p className="auth-card__sub">Log in to access your purchased e-books</p>

        {error && (
          <div className="alert alert--error" role="alert" style={{ marginBottom: '1rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handle} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '1.25rem' }}>
            <Link href="/auth/forgot-password" style={{ fontSize: '.85rem', color: 'var(--primary)' }}>
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full btn--lg"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="auth-switch">
          Don&rsquo;t have an account?{' '}
          <Link href="/auth/register">Create one free</Link>
        </div>
      </div>
    </main>
  );
}
