export default function WhySection() {
  const reasons = [
    {
      icon: '&#x1F4C4;',
      title: 'Written by Real Educators',
      desc:  'Every book is authored by experienced CBSE/ICSE teachers — not auto-generated content. Problems match actual board exam patterns.',
    },
    {
      icon: '&#x26A1;',
      title: 'Instant Download, No Wait',
      desc:  'Pay via UPI and your PDF link is ready in under 30 seconds. No shipping, no delays — study starts immediately.',
    },
    {
      icon: '&#x20B9;',
      title: 'Fair Pricing, Zero Fees',
      desc:  'Books start at just &#x20B9;7. We use UPI direct pay so 100% of your money reaches us — no 2&#x2013;3% payment gateway cut passed to you.',
    },
    {
      icon: '&#x1F510;',
      title: 'Secure & Permanent Access',
      desc:  'Your downloads are tied to your account. Lost your PDF? Log in and re-download anytime — no re-purchase needed.',
    },
  ];

  return (
    <section className="section why-section" aria-labelledby="why-heading">
      <div className="container">
        <div className="section-header">
          <span className="section-header__label">Why MathStudy.in</span>
          <h2 className="section-header__title" id="why-heading">
            Built for Indian Students, Priced Honestly
          </h2>
          <p className="section-header__desc">
            We started MathStudy.in because good math material was either too expensive or too generic.
            Here&rsquo;s what makes us different.
          </p>
        </div>
        <div className="why-grid">
          {reasons.map(({ icon, title, desc }) => (
            <article className="why-card" key={title}>
              <div className="why-card__icon" aria-hidden="true">
                <span dangerouslySetInnerHTML={{ __html: icon }} />
              </div>
              <h3 className="why-card__title">{title}</h3>
              <p className="why-card__desc" dangerouslySetInnerHTML={{ __html: desc }} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
