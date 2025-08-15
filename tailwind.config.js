/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['PingFang SC', 'Microsoft YaHei', '思源黑体', 'sans-serif'],
      },
      borderRadius: {
        'lg': '8px',
      },
    },
  },
  plugins: [],
}
