/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#003647",
          navy: "#002b3a",
          ocean: "#075a78",
          cream: "#f4efe6",
          sand: "#fbf6ec",
          gold: "#f8ad24",
          goldDark: "#df9512",
          brick: "#8b3a1e",
          border: "#ded4c4",
        },
      },
      fontFamily: {
        display: ['"Georgia"', '"Times New Roman"', "serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 45px rgba(0, 54, 71, 0.12)",
      },
    },
  },
  plugins: [],
};