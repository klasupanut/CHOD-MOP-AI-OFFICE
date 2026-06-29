import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07101f",
        panel: "#0c1930",
        line: "#203651",
        chod: "#ff7a1a",
      },
      boxShadow: {
        panel: "0 24px 70px rgba(0, 0, 0, .34)",
      },
    },
  },
  plugins: [],
};

export default config;
