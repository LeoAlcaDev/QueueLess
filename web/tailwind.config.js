/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // el modo oscuro se activa con data-theme="dark" en el <html>, igual que los tokens
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
          strong: 'var(--color-brand-strong)',
          hover: 'var(--color-brand-hover)',
          soft: 'var(--color-brand-soft)',
          text: 'var(--color-text-brand)',
        },
        'on-brand': 'var(--color-on-brand)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          soft: 'var(--color-accent-soft)',
          text: 'var(--color-accent-text)',
        },
        points: {
          DEFAULT: 'var(--color-points)',
          soft: 'var(--color-points-soft)',
          strong: 'var(--color-points-strong)',
        },
        page: 'var(--color-bg-page)',
        surface: {
          DEFAULT: 'var(--color-bg-surface)',
          muted: 'var(--color-bg-surface-2)',
        },
        overlay: 'var(--color-bg-overlay)',
        ink: {
          DEFAULT: 'var(--color-text-primary)',
          soft: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        line: {
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
        },
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
      },
      fontFamily: {
        sans: [
          'Manrope',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        display: ['var(--text-display)', { lineHeight: 'var(--leading-tight)', letterSpacing: '-0.02em', fontWeight: '700' }],
        h1: ['var(--text-h1)', { lineHeight: 'var(--leading-tight)', letterSpacing: '-0.01em', fontWeight: '700' }],
        h2: ['var(--text-h2)', { lineHeight: 'var(--leading-snug)', fontWeight: '600' }],
        h3: ['var(--text-h3)', { lineHeight: 'var(--leading-snug)', fontWeight: '600' }],
        body: ['var(--text-body)', { lineHeight: 'var(--leading-body)' }],
        small: ['var(--text-small)', { lineHeight: '1.45' }],
        badge: ['var(--text-badge)', { lineHeight: '1', letterSpacing: '0.01em', fontWeight: '600' }],
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
      transitionTimingFunction: {
        // out-quart: el easing del sistema, sin rebotes ni elasticidad
        quart: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
