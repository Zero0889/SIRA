import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sira: {
          green: "#17643a",
          leaf: "#3c8b57",
          soil: "#765548",
          sky: "#23648f",
          alert: "#b42318",
          warn: "#9a5b08",
        },
      },
    },
  },
  plugins: [],
};
export default config;
