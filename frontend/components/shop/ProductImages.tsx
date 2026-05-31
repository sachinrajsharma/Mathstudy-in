'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ProductImagesProps {
  src: string | null;
  alt: string;
  previewPages: number; // pages visible without blur (SEO crawlable)
}

export default function ProductImages({ src, alt, previewPages }: ProductImagesProps) {
  const [zoomed, setZoomed] = useState(false);
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';
  const imgSrc   = src ? `${SITE_URL}${src}` : '/images/book-placeholder.svg';

  return (
    <>
      {/* Main cover */}
      <div
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          cursor: 'zoom-in',
          aspectRatio: '3/4',
          background: 'var(--surface-3)',
          maxWidth: '360px',
          margin: '0 auto',
        }}
        onClick={() => setZoomed(true)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setZoomed(true)}
        aria-label={`View full cover of ${alt}`}
        data-preview-pages={previewPages}
      >
        <Image
          src={imgSrc}
          alt={`${alt} — e-book cover`}
          fill
          priority
          sizes="(max-width: 768px) 90vw, 360px"
          style={{ objectFit: 'cover' }}
          itemProp="image"
        />

        {/* Preview badge */}
        <div style={{
          position: 'absolute',
          bottom: '.75rem',
          left: '.75rem',
          background: 'rgba(0,0,0,.6)',
          color: '#fff',
          fontSize: '.72rem',
          fontWeight: 700,
          padding: '.3rem .65rem',
          borderRadius: '4px',
          backdropFilter: 'blur(4px)',
          letterSpacing: '.04em',
        }}>
          {previewPages} preview page{previewPages !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Zoom lightbox */}
      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed book cover"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(0,0,0,.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            cursor: 'zoom-out',
          }}
          onClick={() => setZoomed(false)}
          onKeyDown={e => e.key === 'Escape' && setZoomed(false)}
        >
          <div style={{ position: 'relative', maxWidth: '480px', maxHeight: '90vh', aspectRatio: '3/4', width: '100%' }}>
            <Image
              src={imgSrc}
              alt={`${alt} — full cover`}
              fill
              style={{ objectFit: 'contain', borderRadius: 'var(--radius)' }}
            />
          </div>
          <button
            style={{
              position: 'fixed',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255,255,255,.15)',
              border: 'none',
              color: '#fff',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setZoomed(false)}
            aria-label="Close zoom"
          >
            &#x2715;
          </button>
        </div>
      )}
    </>
  );
}
