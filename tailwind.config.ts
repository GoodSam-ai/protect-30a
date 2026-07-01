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
        protect: {
          teal: "#0e3b38",
          tealSoft: "#1d5f5a",
          aqua: "#8fcdc4",
          cream: "#fbf8f1",
          sand: "#ead9bd",
          terra: "#c56b4a",
          ink: "#22312f"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"]
      }
    }
  },
  plugins: []
};

export default config;
