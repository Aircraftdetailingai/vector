/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        v: {
          charcoal: 'var(--v-charcoal, #0F1117)',
          navy: 'var(--v-navy, #0D1B2A)',
          sidebar: 'var(--v-sidebar, #080C12)',
          surface: 'var(--v-surface, #1A2236)',
          'surface-light': 'var(--v-surface-light, #1E2A40)',
          gold: 'var(--v-gold, #007CB1)',
          'gold-dim': 'var(--v-gold-dim, #006691)',
          'gold-muted': 'var(--v-gold-muted, #005070)',
          border: 'var(--v-border, #2A3A50)',
          'border-subtle': 'var(--v-border-subtle, #1A2236)',
          'text-primary': 'var(--v-text-primary, #F5F5F5)',
          'text-secondary': 'var(--v-text-secondary, #8A9BB0)',
          success: '#2ECC71',
          danger: '#E74C3C',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['var(--font-poppins)', 'Poppins', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      gridTemplateColumns: {
        '14': 'repeat(14, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
}
