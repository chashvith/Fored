import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0b0b12",
        surface: "#12121a",
        text: "#f1f1f1",
        mist: "#c7d3f6",
        blueSoft: "#7db6cf",
        indigoSoft: "#7a7fc5",
        purpleSoft: "#5b3db4",
        purpleDeep: "#3b0444",
      },
      boxShadow: {
        glowBlue:
          "0 0 0 1px rgba(125, 182, 207, 0.14), 0 0 32px rgba(125, 182, 207, 0.18)",
        glowPurple:
          "0 0 0 1px rgba(122, 127, 197, 0.14), 0 0 36px rgba(91, 61, 180, 0.22)",
      },
      backgroundImage: {
        "read-gradient":
          "linear-gradient(135deg, #7db6cf 0%, #7a7fc5 38%, #5b3db4 72%, #3b0444 100%)",
      },
      keyframes: {
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.65" },
        },
      },
      animation: {
        floatSlow: "floatSlow 6s ease-in-out infinite",
        glowPulse: "glowPulse 4s ease-in-out infinite",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        reader: ["var(--font-reader)", "serif"],
        accent: ["var(--font-accent)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
