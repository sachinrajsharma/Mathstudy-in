'use client';

/**
 * UPI QR Code Checkout Component
 * - Hits Laravel backend to generate a unique UPI deep-link + transaction ID
 * - Renders a live QR code on canvas (zero-fee, direct UPI payment)
 * - Polls backend every 4s to detect payment and unlock download
 *
 * Uses qrcode package (npm install qrcode @types/qrcode)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Product } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface Props { product: Product }

type Stage = 'idle' | 'loading' | 'qr' | 'paid' | 'error';

export default function ProductCTA({ product }: Props) {
  const [stage,   setStage]   = useState<Stage>('idle');
  const [txId,    setTxId]    = useState<string | null>(null);
  const [dlUrl,   setDlUrl]   = useState<string | null>(null);
  const [errMsg,  setErrMsg]  = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup polling on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Poll for payment confirmation ───────────────────────────────────────────
  const startPolling = useCallback((transactionId: string) => {
    let attempts = 0;
    const MAX_ATTEMPTS = 75; // 5 minutes at 4s intervals

    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(pollRef.current!);
        setStage('error');
        setErrMsg('Payment not detected after 5 minutes. If you paid, please contact support with your transaction ID.');
        return;
      }

      try {
        const res = await fetch(`${API_URL}/payment/status/${transactionId}`, {
          credentials: 'include',
        });
        const data = await res.json();

        if (data.status === 'paid') {
          clearInterval(pollRef.current!);
          setDlUrl(data.download_url);
          setStage('paid');
        }
      } catch {
        // Network blip — keep polling
      }
    }, 4000);
  }, []);

  // ── Initiate UPI payment ────────────────────────────────────────────────────
  const handleBuyClick = async () => {
    setStage('loading');
    setErrMsg('');

    try {
      const res = await fetch(`${API_URL}/payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ product_id: product.id, amount: product.price }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to initiate payment');
      }

      const data: {
        success: boolean;
        transaction_id: string;
        upi_string: string;
        amount: number;
      } = await res.json();

      if (!data.success) throw new Error('Server returned failure');

      setTxId(data.transaction_id);
      setStage('qr');

      // Dynamic import so QR lib is not in the initial bundle
      const QRCode = (await import('qrcode')).default;
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, data.upi_string, {
          width: 240,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
      }

      startPolling(data.transaction_id);

    } catch (e: unknown) {
      setStage('error');
      setErrMsg(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    }
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStage('idle');
    setTxId(null);
    setDlUrl(null);
    setErrMsg('');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="product-cta">

      {/* ── IDLE: Show buy button ── */}
      {stage === 'idle' && (
        <button className="btn btn-primary btn-lg" onClick={handleBuyClick}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          Buy Now — &#8377;{Math.round(product.price)}
          <span style={{ fontSize: '0.72rem', opacity: 0.8, marginLeft: '4px' }}>(Zero Fees · UPI)</span>
        </button>
      )}

      {/* ── LOADING ── */}
      {stage === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
          <div className="spinner" />
          <span style={{ fontSize: '0.9rem', color: '#0369a1' }}>Generating your payment QR...</span>
        </div>
      )}

      {/* ── QR CODE displayed ── */}
      {(stage === 'qr') && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', maxWidth: '320px' }}>
          <h3 style={{ marginBottom: '4px', fontSize: '1rem' }}>Scan to Pay</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '16px' }}>
            Open GPay, PhonePe, Paytm or BHIM — scan the QR below
          </p>

          {/* Canvas renders the UPI QR */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <canvas
              ref={canvasRef}
              style={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            />
          </div>

          {/* Merchant verification */}
          <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
              ✓ Verified Merchant: mathstudy.in
            </p>
            <p style={{ fontSize: '0.72rem', color: '#15803d' }}>
              &#8377;{product.price.toFixed(2)} · Your bank will display this name
            </p>
          </div>

          {/* Amount */}
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
              &#8377;{Math.round(product.price)}
            </span>
          </div>

          {/* Polling status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontSize: '0.8rem', color: '#0369a1' }}>
            <div className="pulse-dot" />
            Waiting for payment... do not close this page
          </div>

          {txId && (
            <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--muted)', marginTop: '8px' }}>
              Ref: {txId}
            </p>
          )}

          <button
            onClick={reset}
            style={{ display: 'block', width: '100%', marginTop: '14px', padding: '8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '7px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--muted)' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── PAID: Download unlocked ── */}
      {stage === 'paid' && dlUrl && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '14px', padding: '24px', maxWidth: '320px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px', textAlign: 'center' }}>🎉</div>
          <h3 style={{ color: '#166534', marginBottom: '8px', textAlign: 'center' }}>Payment Confirmed!</h3>
          <p style={{ fontSize: '0.85rem', color: '#15803d', marginBottom: '20px', textAlign: 'center' }}>
            Your download is ready. The link is also saved in your account dashboard.
          </p>
          <a
            href={dlUrl}
            className="btn btn-secondary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            download
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PDF Now
          </a>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6b7280', marginTop: '10px' }}>
            Link valid for 15 minutes. <a href="/dashboard" style={{ color: 'var(--primary)' }}>My Dashboard</a> for permanent access.
          </p>
        </div>
      )}

      {/* ── ERROR ── */}
      {stage === 'error' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px', maxWidth: '320px' }}>
          <p style={{ color: '#991b1b', fontSize: '0.88rem', marginBottom: '12px' }}>{errMsg}</p>
          <button className="btn btn-outline btn-sm" onClick={reset}>Try Again</button>
        </div>
      )}

      {/* Animated styles */}
      <style>{`
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid #bae6fd;
          border-top-color: #0369a1;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        .pulse-dot {
          width: 8px; height: 8px;
          background: #3b82f6;
          border-radius: 50%;
          animation: pulse 1.2s ease-in-out infinite;
        }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
      `}</style>
    </div>
  );
}
