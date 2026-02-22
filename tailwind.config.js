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
          primary: '#FFF8F0',
          secondary: '#FFF1E6',
          tertiary: '#FFE8D6',
        },
        surface: {
          DEFAULT: '#FFE8D6',
          elevated: '#FFFFFF',
          hover: '#FFD6BA',
        },
        accent: {
          primary: '#D4764E',
          secondary: '#C2956B',
          tertiary: '#8B6F5A',
        },
        text: {
          primary: '#2D1F14',
          secondary: '#7A6355',
          tertiary: '#A8937F',
          inverse: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E8D5C4',
          subtle: '#F0E2D4',
          emphasis: '#D4BFA8',
        },
        status: {
          success: '#2D9F6F',
          warning: '#D4964E',
          error: '#C94F4F',
          info: '#5B8EC9',
        },
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
    },
  },
  plugins: [],
};
