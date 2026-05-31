export default function TrustBar() {
  const items = [
    { icon: <DownloadIcon />, text: 'Instant PDF Download' },
    { icon: <CheckIcon />,    text: 'CBSE & ICSE Aligned'  },
    { icon: <RupeeIcon />,    text: 'Zero Transaction Fees' },
    { icon: <LockIcon />,     text: 'Secure UPI Payment'   },
    { icon: <StarIcon />,     text: '4.8 ★ Avg Rating'    },
  ];

  return (
    <div className="trust-bar" role="region" aria-label="Key features">
      <div className="container trust-bar__inner">
        {items.map(({ icon, text }) => (
          <div className="trust-bar__item" key={text}>
            {icon}
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}

function RupeeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="3" x2="18" y2="3"/>
      <line x1="6" y1="8" x2="18" y2="8"/>
      <line x1="6" y1="13" x2="12" y2="21"/>
      <line x1="6" y1="8" x2="16" y2="21"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
