import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        paper: "#F7F6F3",
        surface: "#FFFFFF",
        border: "#E5E2DC",
        accent: {
          DEFAULT: "#E85D04",
          hover: "#D04F00",
          pressed: "#B84400",
        },
        success: "#1A7F4B",
        error: "#C41E3A",
        muted: "#6B6560",
      },
      fontFamily: {
        display: ["var(--font-instrument)", "system-ui", "sans-serif"],
        body: ["var(--font-ibm-plex)", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.4" }],
        sm: ["0.875rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.55" }],
        lg: ["1.125rem", { lineHeight: "1.5" }],
        xl: ["1.25rem", { lineHeight: "1.4" }],
        "2xl": ["1.75rem", { lineHeight: "1.25" }],
        "3xl": ["2.5rem", { lineHeight: "1.15" }],
        "4xl": ["3.5rem", { lineHeight: "1.1" }],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(10,10,10,0.04), 0 4px 12px rgba(10,10,10,0.06)",
        "panel-hover": "0 2px 4px rgba(10,10,10,0.06), 0 8px 24px rgba(10,10,10,0.08)",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
