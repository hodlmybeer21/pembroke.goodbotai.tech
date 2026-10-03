// components/Wordmark.tsx — small SVG mark for the header.
//
// Sun over a stylized Suncook River. Adapted from the Pembroke town
// seal (the actual seal has a sun and water but is a detailed
// engraving). This is a simplified, modern interpretation that scales
// to favicon size and looks clean at 24-32px.

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-label="Pembroke, NH"
      role="img"
    >
      {/* River — three wavy lines */}
      <path
        d="M2 24 Q 5 22 8 24 T 14 24 T 20 24 T 26 24 T 32 24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M2 27 Q 5 25 8 27 T 14 27 T 20 27 T 26 27 T 32 27"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M2 30 Q 5 28 8 30 T 14 30 T 20 30 T 26 30 T 32 30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* Sun — circle above the river */}
      <circle
        cx="16"
        cy="12"
        r="6"
        fill="currentColor"
        opacity="0.95"
      />
      {/* Sun rays */}
      <line x1="16" y1="3" x2="16" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="19" x2="16" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="23" y1="12" x2="25" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9.5" y1="5.5" x2="10.9" y2="6.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="21.1" y1="17.1" x2="22.5" y2="18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9.5" y1="18.5" x2="10.9" y2="17.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="21.1" y1="6.9" x2="22.5" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}