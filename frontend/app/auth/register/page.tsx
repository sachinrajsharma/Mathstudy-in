'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Registration failed. Please try again.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Connection error. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">Math<span>Study</span>.in</div>
        <h1 className="auth-card__title">Create your account</h1>
        <p className="auth-card__sub">Free account — pay only for the books you want</p>

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
            <label className="form-label" htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="Your full name"
              value={form.name}
              onChange={set('name')}
              required
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
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
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={set('password')}
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              className={`form-input${form.confirm && form.confirm !== form.password ? ' form-input--error' : ''}`}
              placeholder="Repeat your password"
              value={form.confirm}
              onChange={set('confirm')}
              required
              autoComplete="new-password"
            />
            {form.confirm && form.confirm !== form.password && (
              <span className="form-error">Passwords don&rsquo;t match</span>
            )}
          </div>

          <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            By creating an account you agree to our{' '}
            <Link href="/terms" style={{ color: 'var(--primary)' }}>Terms of Use</Link>{' '}
            and{' '}
            <Link href="/privacy-policy" style={{ color: 'var(--primary)' }}>Privacy Policy</Link>.
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full btn--lg"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account?{' '}
          <Link href="/auth/login">Log in</Link>
        </div>
      </div>
    </main>
  );
}
