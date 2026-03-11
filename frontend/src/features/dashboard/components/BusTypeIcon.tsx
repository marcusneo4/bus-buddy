import type { ArrivalSlot } from "../../../lib/apiClient";

interface Props {
  type: ArrivalSlot["busType"];
  className?: string;
}

export function BusTypeIcon({ type, className = "" }: Props) {
  if (type === "single") {
    // Single deck: SBS-like stronger red/purple livery with a thinner white strip.
    return (
      <svg
        viewBox="0 0 28 16"
        className={`h-5 w-9 ${className}`}
        aria-label="Single deck bus"
        role="img"
      >
        <g transform="translate(28, 0) scale(-1, 1)">
        {/* SBS-like single deck shell */}
        <rect x="1" y="3.4" width="26" height="8.8" rx="1.6" fill="#f97316" />
        {/* Roof highlight */}
        <rect x="1.2" y="3.2" width="25.6" height="1.2" rx="0.5" fill="#ea580c" />
        {/* White center livery stripe */}
        <rect x="1.2" y="7.1" width="25.6" height="2.6" rx="0.3" fill="#f8fafc" />
        {/* Purple lower livery, slightly rising to the rear */}
        <path d="M1 10.1h13.5l4.8-0.8H27v2.9H1z" fill="#9333ea" />
        {/* Front black windscreen block */}
        <rect x="22.1" y="4" width="4.1" height="6.9" rx="1" fill="#0b1220" />
        {/* Window row */}
        <rect x="2.4" y="5.1" width="3.1" height="2.4" rx="0.4" fill="#111827" opacity="0.7" />
        <rect x="6.2" y="5.1" width="3.1" height="2.4" rx="0.4" fill="#111827" opacity="0.7" />
        <rect x="10" y="5.1" width="3.1" height="2.4" rx="0.4" fill="#111827" opacity="0.7" />
        <rect x="13.8" y="5.1" width="3.1" height="2.4" rx="0.4" fill="#111827" opacity="0.7" />
        <rect x="17.6" y="5.1" width="3.1" height="2.4" rx="0.4" fill="#111827" opacity="0.7" />
        {/* Wheels */}
        <circle cx="6" cy="13" r="2" fill="#111827" />
        <circle cx="21" cy="13" r="2" fill="#111827" />
        </g>
      </svg>
    );
  }

  if (type === "double") {
    // Double deck: SG-like two-tone (lime body + black mid band) with red heart mark.
    return (
      <svg
        viewBox="0 0 28 22"
        className={`h-7 w-9 ${className}`}
        aria-label="Double deck bus"
        role="img"
      >
        <g transform="translate(28, 0) scale(-1, 1)">
        {/* SG Bus-like double deck shell */}
        <rect x="1" y="1" width="26" height="17" rx="2" fill="#9bdc28" />
        <rect x="1.2" y="1.2" width="25.6" height="1.3" rx="0.5" fill="#84cc16" />
        {/* Upper deck windows */}
        <rect x="3" y="3.2" width="3.6" height="3.6" rx="0.4" fill="#0b1220" opacity="0.72" />
        <rect x="7.4" y="3.2" width="3.6" height="3.6" rx="0.4" fill="#0b1220" opacity="0.72" />
        <rect x="11.8" y="3.2" width="3.6" height="3.6" rx="0.4" fill="#0b1220" opacity="0.72" />
        <rect x="16.2" y="3.2" width="3.6" height="3.6" rx="0.4" fill="#0b1220" opacity="0.72" />
        <rect x="20.6" y="3.2" width="3.6" height="3.6" rx="0.4" fill="#0b1220" opacity="0.72" />
        {/* Lower deck windows and front windscreen */}
        <rect x="8.2" y="11.7" width="3.4" height="3.1" rx="0.4" fill="#0b1220" opacity="0.72" />
        <rect x="12.5" y="11.7" width="3.4" height="3.1" rx="0.4" fill="#0b1220" opacity="0.72" />
        <rect x="16.8" y="11.7" width="3.4" height="3.1" rx="0.4" fill="#0b1220" opacity="0.72" />
        <rect x="22" y="3.8" width="4.3" height="11.2" rx="1" fill="#0b1220" />
        <rect x="21.1" y="3.8" width="0.8" height="11.2" rx="0.2" fill="#e5e7eb" />
        {/* SG heart accent */}
        <path
          d="M10.6 9.8c-0.5 0-0.9-0.4-0.9-0.9s0.4-0.9 0.9-0.9c0.4 0 0.6 0.2 0.8 0.5 0.2-0.3 0.4-0.5 0.8-0.5 0.5 0 0.9 0.4 0.9 0.9s-0.4 0.9-0.9 0.9h-0.1l-0.7 0.8-0.7-0.8h-0.1z"
          fill="#ef4444"
        />
        {/* Wheels */}
        <circle cx="6" cy="20" r="2" fill="#111827" />
        <circle cx="21" cy="20" r="2" fill="#111827" />
        </g>
      </svg>
    );
  }

  if (type === "bendy") {
    // Bendy/articulated: two coaches joined by an accordion
    return (
      <svg
        viewBox="0 0 38 16"
        className={`h-5 w-12 fill-current ${className}`}
        aria-label="Bendy bus"
        role="img"
      >
        <g transform="translate(38, 0) scale(-1, 1)">
        {/* Front coach */}
        <rect x="1" y="4" width="15" height="8" rx="1.5" />
        {/* Front cab bump */}
        <rect x="1" y="3" width="5" height="5" rx="1" opacity="0.7" />
        <rect x="7"  y="5.5" width="3" height="3" rx="0.5" fill="black" opacity="0.45" />
        <rect x="11" y="5.5" width="3" height="3" rx="0.5" fill="black" opacity="0.45" />
        {/* Accordion joint */}
        <rect x="17" y="5" width="4" height="6" rx="0" fill="black" opacity="0.2" />
        <line x1="18" y1="5" x2="18" y2="11" stroke="black" strokeWidth="0.5" opacity="0.3" />
        <line x1="19.5" y1="5" x2="19.5" y2="11" stroke="black" strokeWidth="0.5" opacity="0.3" />
        <line x1="21" y1="5" x2="21" y2="11" stroke="black" strokeWidth="0.5" opacity="0.3" />
        {/* Rear coach */}
        <rect x="22" y="4" width="15" height="8" rx="1.5" />
        <rect x="24" y="5.5" width="3" height="3" rx="0.5" fill="black" opacity="0.45" />
        <rect x="29" y="5.5" width="3" height="3" rx="0.5" fill="black" opacity="0.45" />
        <rect x="34" y="5.5" width="2" height="3" rx="0.5" fill="black" opacity="0.45" />
        {/* Wheels */}
        <circle cx="6"  cy="13" r="2" />
        <circle cx="32" cy="13" r="2" />
        </g>
      </svg>
    );
  }

  return null;
}
