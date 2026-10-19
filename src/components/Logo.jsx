import { BRAND } from '../config/brand';

/**
 * Logo "Insight Cloud Solution": nube trazada como circuito con un nodo central
 * (insight / visión).
 */
export function LogoMark({ size = 40, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="8 8 48 48"
      role="img"
      aria-label={BRAND.product}
    >
      <defs>
        <linearGradient id="ics-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand-primary)" />
          <stop offset="1" stopColor="var(--brand-secondary)" />
        </linearGradient>
        <filter id="ics-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#ics-glow)">
        <path
          d="M20 40a8 8 0 0 1 1.5-15.8A11 11 0 0 1 42.6 26 7 7 0 0 1 44 40Z"
          fill="none"
          stroke="url(#ics-g)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M26 40v5M32 36v9M38 40v5" stroke="url(#ics-g)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="26" cy="46.5" r="1.6" fill="var(--brand-primary)" />
        <circle cx="32" cy="46.5" r="1.6" fill="var(--brand-primary)" />
        <circle cx="38" cy="46.5" r="1.6" fill="var(--brand-primary)" />
        <circle cx="32" cy="31" r="4" fill="var(--brand-primary)" />
        <circle cx="32" cy="31" r="7" fill="none" stroke="var(--brand-primary)" strokeOpacity=".5" strokeWidth="1" />
      </g>
    </svg>
  );
}

export function Logo({ size = 40, showText = true, subtitle = true }) {
  return (
    <div className="logo">
      <LogoMark size={size} />
      {showText && (
        <div className="logo-text">
          <span className="logo-title">
            Insight <b>Cloud</b> Solution
          </span>
          {subtitle && <span className="logo-sub">{BRAND.company} · {BRAND.companyName}</span>}
        </div>
      )}
    </div>
  );
}
