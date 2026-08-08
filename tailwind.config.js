/** @type {import('tailwindcss').Config} */

/** Allow opacity modifiers (e.g. bg-nimbus-blue/50) with CSS variable RGB channels */
const withRgb = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        nimbus: {
          'dark': withRgb('--nimbus-dark-rgb'),
          'darker': withRgb('--nimbus-darker-rgb'),
          'medium': withRgb('--nimbus-medium-rgb'),
          'lighter': withRgb('--nimbus-lighter-rgb'),
          'light': withRgb('--nimbus-light-rgb'),
          'blue': withRgb('--nimbus-blue-rgb'),
          'blue-dark': withRgb('--nimbus-blue-dark-rgb'),
          'text': withRgb('--nimbus-text-rgb'),
          'text-light': withRgb('--nimbus-text-light-rgb'),
          'text-lighter': withRgb('--nimbus-text-lighter-rgb'),
          'text-muted': withRgb('--nimbus-text-muted-rgb'),
          'text-muted-light': withRgb('--nimbus-text-muted-light-rgb'),
          'hover': 'rgb(var(--nimbus-hover-rgb) / 0.4)',
          'border': withRgb('--nimbus-border-rgb'),
        }
      },
      fontFamily: {
        'whitney': ['Whitney', 'sans-serif'],
      },
      animation: {
        'spin': 'spin 1s linear infinite',
      }
    },
  },
  plugins: [],
}
