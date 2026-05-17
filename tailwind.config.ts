/**
 * AURELIA Pro X1 — Tailwind 4 config
 * Reference: docs/02-ui-design-system.md
 *
 * Notes:
 * - Tailwind 4 is CSS-first; this file is loaded via `@config "../tailwind.config.ts"`
 *   directive in app/globals.css for backward compatibility utility generation.
 * - Only `extend` is used — base Tailwind palette is preserved but the project rule
 *   is to NEVER use default colors (G6 in §G.1). All UI must reference brand tokens.
 * - All token names mirror the semantic tokens in §B.5 of design system doc.
 */

import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx,js,jsx,mdx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      // ─────────────────────────────────────────────────────────────────
      // COLORS — see design-system §B (warm neutrals, copper, cream)
      // All scales are full 11-step but only checked tokens are in active use.
      // ─────────────────────────────────────────────────────────────────
      colors: {
        // Neutral (warm-tinted, base #0A0A0A)
        neutral: {
          50:  '#F8F6F2',
          100: '#EDE9E2',
          200: '#D6D0C5',
          300: '#A8A096',
          400: '#7C7468',
          500: '#5A534A',
          600: '#403A33',
          700: '#2A2622',  // bg-elevated (panel, picker)
          800: '#1A1714',  // bg-surface
          900: '#0F0D0B',
          950: '#0A0A0A',  // bg-canvas (totem background)
        },
        // Copper (accent, base #B87333)
        copper: {
          50:  '#FBF3EA',
          100: '#F4DFC4',
          200: '#E5BB8A',
          300: '#D49A5C',  // hover (rare)
          400: '#C68548',
          500: '#B87333',  // accent primary — pin, ring, dot, chevron, icon
          600: '#9D6128',  // pressed
          700: '#7E4D1F',
          800: '#5F3A18',
          900: '#3F2710',
          950: '#2A1A0A',
        },
        // Cream (text, base #F5F1E8)
        cream: {
          50:  '#FDFBF6',
          100: '#F5F1E8',  // text-primary (default body / headline on dark)
          200: '#E8E2D2',
          300: '#D2CAB5',  // text-secondary
          400: '#B5AC95',  // text-muted (tagline, microhint)
          500: '#928874',
          600: '#6F6757',
          700: '#534D40',
          800: '#3A352D',
          900: '#26221C',
          950: '#1A1714',
        },
        // Semantic aliases (preferred in components — rebind if palette shifts)
        canvas:    '#0A0A0A',
        surface:   '#1A1714',
        elevated:  '#2A2622',
        accent:    '#B87333',
        // text-* aliases use cream-* directly to avoid shadowing Tailwind text utilities
      },

      // ─────────────────────────────────────────────────────────────────
      // FONT FAMILIES — see design-system §C.1
      // ─────────────────────────────────────────────────────────────────
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'Consolas', 'monospace'],
      },

      // ─────────────────────────────────────────────────────────────────
      // FONT SIZES — see design-system §C.2
      // Tuple: [size, { lineHeight, letterSpacing, fontWeight? }]
      // All values respect 1.2m read distance (min 18px body).
      // ─────────────────────────────────────────────────────────────────
      fontSize: {
        // Hero attractor — clamp(4rem, 3rem + 4vw, 6rem) → 64-96px
        'hero':     ['clamp(4rem, 3rem + 4vw, 6rem)',         { lineHeight: '0.95', letterSpacing: '-0.020em' }],
        // H1 product name — 48-64px
        'h1':       ['clamp(3rem, 2rem + 3vw, 4rem)',         { lineHeight: '1.00', letterSpacing: '-0.015em' }],
        // H2 hotspot title — 28-32px
        'h2':       ['clamp(1.75rem, 1.4rem + 1vw, 2rem)',    { lineHeight: '1.20', letterSpacing: '-0.005em' }],
        // H3 subsection — 20-22px
        'h3':       ['clamp(1.25rem, 1.15rem + 0.4vw, 1.375rem)', { lineHeight: '1.30', letterSpacing: '0' }],
        // Body large — 20px fixed (1.2m distance)
        'body-lg':  ['1.25rem',                                { lineHeight: '1.50', letterSpacing: '0' }],
        // Body — 18px fixed (1.2m distance)
        'body':     ['1.125rem',                               { lineHeight: '1.60', letterSpacing: '0' }],
        // Spec mono — 16px fixed
        'spec':     ['1rem',                                   { lineHeight: '1.40', letterSpacing: '0' }],
        // Micro UI — 14px uppercase
        'micro':    ['0.875rem',                               { lineHeight: '1.20', letterSpacing: '0.10em' }],
        // Tagline footer (italic) — 22px
        'tagline':  ['clamp(1.25rem, 1.1rem + 0.5vw, 1.375rem)', { lineHeight: '1.30', letterSpacing: '0.005em' }],
        // Tagline attractor — 24-28px
        'tagline-lg': ['clamp(1.5rem, 1.25rem + 0.8vw, 1.75rem)', { lineHeight: '1.30', letterSpacing: '0.010em' }],
      },

      // ─────────────────────────────────────────────────────────────────
      // SPACING — 4px base + micro adjustments — see design-system §D.1
      // ─────────────────────────────────────────────────────────────────
      spacing: {
        // Micro adjustments (additive to default 4px scale)
        '14': '14px',
        '18': '18px',
        '22': '22px',
        '28': '28px',
        // Touch and safe-area shortcuts
        'touch':       '56px',  // min touch target
        'safe-h-port': '24px',  // portrait left/right
        'safe-v-port': '32px',  // portrait top/bottom
        'safe-h-land': '48px',  // landscape left/right
        'safe-v-land': '32px',  // landscape top/bottom
        'panel-port':  '480px', // DetailPanel width portrait
        'panel-land':  '640px', // DetailPanel height landscape
      },

      // ─────────────────────────────────────────────────────────────────
      // BORDER RADIUS — see design-system §D.4
      // Rule: panels MAX 8px (G1). Only pin / pill use 999px.
      // ─────────────────────────────────────────────────────────────────
      borderRadius: {
        'none':   '0',
        'sharp':  '2px',
        'soft':   '4px',
        'panel':  '8px',
        'pin':    '999px',
        'pill':   '999px',
      },

      // ─────────────────────────────────────────────────────────────────
      // KEYFRAMES — see design-system §E.3
      // ─────────────────────────────────────────────────────────────────
      keyframes: {
        'attractor-pulse': {
          '0%':   { transform: 'scale(1)',     opacity: '1' },
          '50%':  { transform: 'scale(1.04)',  opacity: '0.92' },
          '100%': { transform: 'scale(1)',     opacity: '1' },
        },
        'attractor-pulse-slow': {
          '0%':   { transform: 'scale(1)',     opacity: '1' },
          '50%':  { transform: 'scale(1.03)',  opacity: '0.7' },
          '100%': { transform: 'scale(1)',     opacity: '1' },
        },
        'core-pulse': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        'copper-glow': {
          '0%':   { boxShadow: '0 0 0 rgba(184, 115, 51, 0)' },
          '50%':  { boxShadow: '0 0 24px rgba(184, 115, 51, 0.30)' },
          '100%': { boxShadow: '0 0 16px rgba(184, 115, 51, 0.18)' },
        },
        'fade-up': {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'panel-slide-in-right': {
          '0%':   { transform: 'translateX(100%)', opacity: '0.6' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        'panel-slide-in-bottom': {
          '0%':   { transform: 'translateY(100%)', opacity: '0.6' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'picker-stagger': {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
      },

      // ─────────────────────────────────────────────────────────────────
      // ANIMATION mappings (durations + easing) — see design-system §E.2
      // ─────────────────────────────────────────────────────────────────
      animation: {
        'attractor-pulse':       'attractor-pulse 3000ms cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'attractor-pulse-slow':  'attractor-pulse-slow 5000ms cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'core-pulse':            'core-pulse 1200ms cubic-bezier(0.16, 1, 0.3, 1) infinite',
        'copper-glow':           'copper-glow 600ms cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-up':               'fade-up 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'panel-slide-in-right':  'panel-slide-in-right 480ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'panel-slide-in-bottom': 'panel-slide-in-bottom 480ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'picker-stagger':        'picker-stagger 280ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },

      // ─────────────────────────────────────────────────────────────────
      // BOX SHADOWS — see design-system §F.2
      // BANNED: shadow-md, shadow-lg, shadow-xl Tailwind defaults.
      // Only the 4 brand tokens below.
      // ─────────────────────────────────────────────────────────────────
      boxShadow: {
        'deep':         '0 32px 64px -12px rgba(0, 0, 0, 0.85)',
        'copper-soft':  '0 0 32px rgba(184, 115, 51, 0.15)',
        'copper-tight': '0 0 12px rgba(184, 115, 51, 0.25)',
        'rim':          'inset 0 1px 0 rgba(245, 241, 232, 0.06)',
      },

      // ─────────────────────────────────────────────────────────────────
      // EASING — see design-system §E.1
      // Token name mirrors CSS variable --ease-quiet.
      // ─────────────────────────────────────────────────────────────────
      transitionTimingFunction: {
        'quiet':    'cubic-bezier(0.16, 1, 0.3, 1)',
        'quiet-in': 'cubic-bezier(0.7, 0, 0.84, 0)',
      },

      // ─────────────────────────────────────────────────────────────────
      // TRANSITION DURATIONS — see design-system §E.2
      // ─────────────────────────────────────────────────────────────────
      transitionDuration: {
        'micro':    '150ms',
        'fast':     '250ms',
        'normal':   '400ms',
        'slow':     '700ms',
        'ambient': '1200ms',
      },

      // ─────────────────────────────────────────────────────────────────
      // Z-INDEX — see design-system §J (mirrors UX §2.2 authoritative map)
      // ─────────────────────────────────────────────────────────────────
      zIndex: {
        'base':      '0',
        'canvas':    '10',
        'pin':       '20',
        'chrome':    '30',
        'dim':       '40',
        'panel':     '50',
        'picker':    '60',
        'attractor': '70',
        'grain':     '80',
        'debug':     '9999',
      },
    },
  },
} satisfies Config;
