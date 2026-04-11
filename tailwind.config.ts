import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b1215",
        mist: "#eef4ef",
        tide: "#0e7490",
        ember: "#f97316",
        leaf: "#1f7a5c"
      },
      boxShadow: {
        glow: "0 20px 60px rgba(14, 116, 144, 0.18)"
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(rgba(11, 18, 21, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(11, 18, 21, 0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;

