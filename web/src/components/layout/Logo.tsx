interface LogoProps {
  size?: number;
  showText?: boolean;
}

// La marca de QueueLess: el circulo con la flecha en naranja (toma el color de --color-brand)
// mas el wordmark. Se usa en el sidebar y la pantalla de acceso.
export function Logo({ size = 24, showText = true }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className="text-brand">
        <circle cx="28" cy="28" r="20" stroke="currentColor" strokeWidth="5" />
        <path
          d="M40 36 L34 48 L42 48 L36 60 L52 44 L44 44 L50 36 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span className="font-bold tracking-tight text-ink" style={{ fontSize: Math.round(size * 0.82) }}>
          QueueLess
        </span>
      )}
    </span>
  );
}
