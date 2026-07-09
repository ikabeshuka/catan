/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'none': '0',
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '4px',
        'lg': '5px',
        'xl': '6px',
        '2xl': '8px',
        '3xl': '10px',
        'full': '9999px',
      },
      fontFamily: {
        serif: ['"Frank Ruhl Libre"', 'Georgia', 'serif'],
        sans: ['Assistant', 'Heebo', 'Rubik', 'system-ui', 'sans-serif'],
      },
      colors: {
        amber: {
          50: '#fcf8f3',
          100: '#f7f0e0',
          200: '#ede0c3',
          300: '#e0c89e',
          400: '#d1ae74',
          500: '#c29653',
          600: '#a67d46',
          700: '#866337',
          800: '#674a2a',
          900: '#49341e',
          950: '#312111',
        },
        orange: {
          50: '#fdfaf8',
          100: '#f9f1ec',
          200: '#f1e0d3',
          300: '#e6c8b4',
          400: '#d9a98e',
          500: '#cc8c6c',
          600: '#b37657',
          700: '#915c44',
          800: '#6d4532',
          900: '#4a2f20',
          950: '#311d13',
        },
        slate: {
          50: '#f8f8f8',
          100: '#e9e9e9',
          200: '#d4d4d4',
          300: '#b6b6b6',
          400: '#909090',
          500: '#6d6d6d',
          600: '#545454',
          700: '#434343',
          800: '#383838',
          850: '#2d2d2d',
          900: '#222222',
          905: '#1a1a1a',
          950: '#111111',
        }
      }
    },
  },
  plugins: [],
}
