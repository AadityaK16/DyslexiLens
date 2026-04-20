/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-atkinson)", "Arial", "sans-serif"],
        display: ["var(--font-lexend)", "sans-serif"],
      },
      colors: {
        cream: {
          50:  "#FFFDF5",
          100: "#FFF8E7",
          200: "#FFF0C8",
        },
        ink: {
          900: "#1A1209",
          700: "#3D2E18",
          500: "#6B5A42",
          300: "#A8977E",
        },
        focus: {
          DEFAULT: "#F4A723",
          light:   "#FDE68A",
          dark:    "#C77B0A",
        },
        leaf: {
          DEFAULT: "#3D8A5E",
          light:   "#D1FAE5",
        },
        sky: {
          DEFAULT: "#4A7FB5",
          light:   "#DBEAFE",
        },
      },
      letterSpacing: {
        dyslexic: "0.08em",
      },
      lineHeight: {
        dyslexic: "1.9",
      },
    },
  },
  plugins: [],
};
