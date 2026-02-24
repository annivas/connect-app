/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: {
          primary: 'var(--color-background-primary)',
          secondary: 'var(--color-background-secondary)',
          tertiary: 'var(--color-background-tertiary)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
          hover: 'var(--color-surface-hover)',
        },
        accent: {
          primary: 'var(--color-accent-primary)',
          secondary: 'var(--color-accent-secondary)',
          tertiary: 'var(--color-accent-tertiary)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          inverse: 'var(--color-text-inverse)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
          emphasis: 'var(--color-border-emphasis)',
        },
        status: {
          success: 'var(--color-status-success)',
          warning: 'var(--color-status-warning)',
          error: 'var(--color-status-error)',
          info: 'var(--color-status-info)',
        },
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
    },
  },
  plugins: [],
};
