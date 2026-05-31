import Link from 'next/link';

const CATEGORIES = [
  { label: 'Grade 1–5 Maths',  href: '/category/primary-maths'   },
  { label: 'Grade 6–8 Maths',  href: '/category/middle-maths'    },
  { label: 'Grade 9–10 CBSE',  href: '/category/cbse-9-10'       },
  { label: 'Grade 11–12 CBSE', href: '/category/cbse-11-12'      },
  { label: 'JEE Main & Adv.',  href: '/category/jee'             },
  { label: 'CUET Maths',       href: '/category/cuet'            },
  { label: 'CAT Quant',        href: '/category/cat-quant'       },
  { label: 'ICSE Maths',       href: '/category/icse'            },
];

const QUICK_LINKS = [
  { label: 'All E-Books',    href: '/ebooks'           },
  { label: 'Blog',           href: '/blog'             },
  { label: 'About Us',       href: '/about'            },
  { label: 'Contact',        href: '/contact'          },
  { label: 'My Dashboard',   href: '/dashboard'        },
  { label: 'Privacy Policy', href: '/privacy-policy'   },
  { label: 'Refund Policy',  href: '/refund-policy'    },
  { label: 'Terms of Use',   href: '/terms'            },
];

const SUPPORT_LINKS = [
  { label: 'How to Download?',     href: '/blog/how-to-download-ebooks'   },
  { label: 'Payment via UPI',      href: '/blog/upi-payment-guide'        },
  { label: 'Re-download PDF',      href: '/dashboard'                     },
  { label: 'Email: support@mathstudy.in', href: 'mailto:support@mathstudy.in' },
];

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div>
            <div className="footer__brand-name">Math<span>Study</span>.in</div>
            <p className="footer__tagline">
              Premium math e-books for CBSE, ICSE, JEE, CUET and CAT — written by experienced educators,
              delivered instantly as PDF. Starting at just &#x20B9;7.
            </p>
            <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.4)', marginTop: '1rem' }}>
              An initiative of{' '}
              <a
                href="https://udgamwelfarefoundation.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'rgba(255,255,255,.6)', textDecoration: 'underline' }}
              >
                Udgam Welfare Foundation
              </a>
            </p>
          </div>

          {/* Categories */}
          <div>
            <div className="footer__col-title">Categories</div>
            <nav aria-label="Product categories">
              {CATEGORIES.map(({ label, href }) => (
                <Link key={href} href={href} className="footer__link">{label}</Link>
              ))}
            </nav>
          </div>

          {/* Quick Links */}
          <div>
            <div className="footer__col-title">Quick Links</div>
            <nav aria-label="Quick links">
              {QUICK_LINKS.map(({ label, href }) => (
                <Link key={href} href={href} className="footer__link">{label}</Link>
              ))}
            </nav>
          </div>

          {/* Support */}
          <div>
            <div className="footer__col-title">Support</div>
            <nav aria-label="Support links">
              {SUPPORT_LINKS.map(({ label, href }) => (
                <Link key={href} href={href} className="footer__link">{label}</Link>
              ))}
            </nav>
            <div style={{ marginTop: '1.25rem', fontSize: '.78rem', color: 'rgba(255,255,255,.45)' }}>
              Payment via UPI only.<br />
              Zero transaction fees &#8212; you pay exactly what you see.
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer__bottom">
          <span>&#169; {new Date().getFullYear()} MathStudy.in &mdash; All rights reserved.</span>
          <div className="footer__trust">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <span style={{ color: 'rgba(255,255,255,.5)' }}>SSL Secured &middot; CBSE/ICSE Aligned &middot; Instant PDF Download</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
