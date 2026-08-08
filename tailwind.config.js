/** @type {import('tailwindcss').Config} */

/** Allow opacity modifiers (e.g. bg-discord-blue/50) with CSS variable RGB channels */
const withRgb = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          'dark': withRgb('--discord-dark-rgb'),
          'darker': withRgb('--discord-darker-rgb'),
          'medium': withRgb('--discord-medium-rgb'),
          'lighter': withRgb('--discord-lighter-rgb'),
          'light': withRgb('--discord-light-rgb'),
          'blue': withRgb('--discord-blue-rgb'),
          'blue-dark': withRgb('--discord-blue-dark-rgb'),
          'text': withRgb('--discord-text-rgb'),
          'text-light': withRgb('--discord-text-light-rgb'),
          'text-lighter': withRgb('--discord-text-lighter-rgb'),
          'text-muted': withRgb('--discord-text-muted-rgb'),
          'text-muted-light': withRgb('--discord-text-muted-light-rgb'),
          'hover': 'rgb(var(--discord-hover-rgb) / 0.4)',
          'border': withRgb('--discord-border-rgb'),
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
