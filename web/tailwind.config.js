/** @type {import('tailwindcss').Config} */
// Los colores, radios, sombras y tipografía se cablean a los TOKENS SEMÁNTICOS
// de src/styles/tokens.css (var(--color-*)). Así una clase como `bg-brand` sigue
// la marca activa (data-brand) y el tema (data-theme) sin tocar hex crudos.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    // Mobile-first. Breakpoints alineados a las referencias del design system:
    // móvil 390px (base, sin prefijo), tablet 768px (md), web admin 1280px (xl).
    // `lg` (1024px) es el corte para pasar a layout de escritorio (sidebar).
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Marca (acción primaria = brand-strong)
        brand: {
          DEFAULT: 'var(--color-brand)',
          strong: 'var(--color-brand-strong)',
          hover: 'var(--color-brand-hover)',
          soft: 'var(--color-brand-soft)',
        },
        onbrand: 'var(--color-on-brand)',
        // Acento de soporte
        accent: {
          DEFAULT: 'var(--color-accent)',
          soft: 'var(--color-accent-soft)',
          text: 'var(--color-accent-text)',
        },
        // QueuePoints (morado, exclusivo del flujo de puntos)
        points: {
          DEFAULT: 'var(--color-points)',
          soft: 'var(--color-points-soft)',
          strong: 'var(--color-points-strong)',
        },
        // Neutros — fondos
        page: 'var(--color-bg-page)',
        surface: {
          DEFAULT: 'var(--color-bg-surface)',
          muted: 'var(--color-bg-surface-2)',
        },
        overlay: 'var(--color-bg-overlay)',
        // Neutros — texto
        content: {
          DEFAULT: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
          brand: 'var(--color-text-brand)',
        },
        // Neutros — bordes
        line: {
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
        },
        // Estados semánticos (bg suave + fg AA + dot)
        success: {
          bg: 'var(--color-success-bg)',
          fg: 'var(--color-success-fg)',
          dot: 'var(--color-success-dot)',
        },
        warning: {
          bg: 'var(--color-warning-bg)',
          fg: 'var(--color-warning-fg)',
          dot: 'var(--color-warning-dot)',
        },
        error: {
          bg: 'var(--color-error-bg)',
          fg: 'var(--color-error-fg)',
          dot: 'var(--color-error-dot)',
        },
        info: {
          bg: 'var(--color-info-bg)',
          fg: 'var(--color-info-fg)',
          dot: 'var(--color-info-dot)',
        },
        neutral: {
          bg: 'var(--color-neutral-bg)',
          fg: 'var(--color-neutral-fg)',
          dot: 'var(--color-neutral-dot)',
        },
      },
      borderColor: {
        DEFAULT: 'var(--color-border-default)',
      },
      borderRadius: {
        input: 'var(--radius-input)',
        button: 'var(--radius-button)',
        card: 'var(--radius-card)',
        modal: 'var(--radius-modal)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        focus: 'var(--shadow-focus-ring)',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['var(--text-display)', { lineHeight: 'var(--leading-tight)', fontWeight: '700' }],
        h1: ['var(--text-h1)', { lineHeight: 'var(--leading-tight)', fontWeight: '700' }],
        h2: ['var(--text-h2)', { lineHeight: 'var(--leading-snug)', fontWeight: '600' }],
        h3: ['var(--text-h3)', { lineHeight: 'var(--leading-snug)', fontWeight: '600' }],
        body: ['var(--text-body)', { lineHeight: 'var(--leading-body)' }],
        small: ['var(--text-small)', { lineHeight: '1.45' }],
        badge: ['var(--text-badge)', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
};
