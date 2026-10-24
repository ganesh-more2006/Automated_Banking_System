/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        banking: {
          navy: '#0B192C',
          blue: '#1E3E62',
          orange: '#FF6500',
          lightGray: '#F1F8E8',
        }
      }
    },
  },
  plugins: [],
}
