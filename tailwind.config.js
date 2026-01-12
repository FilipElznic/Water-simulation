/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        hand: ['"Patrick Hand"', "cursive"],
        mono: ['"Courier Prime"', "monospace"],
      },
      colors: {
        parchment: {
          DEFAULT: "#F2E8D5",
          dark: "#E6DCC9",
        },
        ink: {
          DEFAULT: "#2F3133",
          light: "#4A4D50",
        },
        ocean: {
          DEFAULT: "#2B4C6F",
          light: "#3E6690",
          dark: "#1A334C",
        },
        paper: {
          DEFAULT: "rgba(255, 255, 255, 0.6)",
          overlay: "rgba(242, 232, 213, 0.85)",
        },
      },
      boxShadow: {
        sketch: "2px 3px 0px 0px rgba(47, 49, 51, 0.1)",
        "sketch-hover": "4px 5px 0px 0px rgba(47, 49, 51, 0.2)",
        paper: "0 10px 30px -5px rgba(0, 0, 0, 0.1)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, rgba(47, 49, 51, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(47, 49, 51, 0.05) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
