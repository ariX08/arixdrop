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
        ink: "var(--ink)",
        paper: "var(--bg)",
        surface: "var(--surface)",
        border: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
        },
        success: "var(--success)",
        error: "var(--error)",
        muted: "var(--muted)",
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
