/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          'dark': '#202225',
          'darker': '#1e1f23',
          'medium': '#2f3136',
          'lighter': '#36393f',
          'light': '#40444b',
          'blue': '#5865f2',
          'blue-dark': '#404eed',
          'text': '#b5b9c0',
          'text-light': '#dcddde',
          'text-lighter': '#ffffff',
          'text-muted': '#949ba4',
          'text-muted-light': '#afafaf',
          'hover': 'rgba(79, 84, 92, 0.4)',
          'border': '#202225',
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
