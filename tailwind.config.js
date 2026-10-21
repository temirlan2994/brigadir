/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f4f1ea', // фон
        ink: '#17191c', // текст
        dark: '#1f2937', // тёмные карточки и кнопки
        line: '#e6e1d6', // линии
        accent: '#ffc400', // жёлтый — главное действие
        money: {
          in: '#1b7f3b', // пришли — зелёный
          out: '#c62828', // ушли — красный
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.05), 0 6px 18px rgba(31,41,55,.06)',
      },
    },
  },
  plugins: [],
};
