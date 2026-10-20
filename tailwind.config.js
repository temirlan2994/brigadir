/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        money: {
          in: '#15803d', // пришли — зелёный
          out: '#b91c1c', // ушли — красный
        },
      },
    },
  },
  plugins: [],
};
