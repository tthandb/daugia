import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: "#1C1917",
        "charcoal-light": "#44403C",
        gold: "#A16207",
        "gold-light": "#CA8A04",
        "gold-pale": "#FEF3C7",
        "warm-white": "#FAFAF9",
        "warm-border": "#D6D3D1",
        "muted-fg": "#78716C",
        fg: "#0C0A09",
      },
      fontFamily: {
        heading: ["Playfair Display", "serif"],
        body: ["Be Vietnam Pro", "sans-serif"],
        document: ["Times New Roman", "Times", "serif"],
      },
      keyframes: {
        "overlay-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "dialog-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.97)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "overlay-in": "overlay-in 160ms ease-out",
        "dialog-in": "dialog-in 180ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
      typography: {
        DEFAULT: {
          css: {
            "--tw-prose-body": "#0C0A09",
            "--tw-prose-headings": "#1C1917",
            "--tw-prose-links": "#A16207",
            "--tw-prose-bold": "#1C1917",
            "--tw-prose-quotes": "#44403C",
            "--tw-prose-quote-borders": "#A16207",
            maxWidth: "none",
            h1: { fontFamily: "Playfair Display, serif" },
            h2: { fontFamily: "Playfair Display, serif" },
            h3: { fontFamily: "Playfair Display, serif" },
            h4: { fontFamily: "Playfair Display, serif" },
            a: {
              color: "#A16207",
              textDecoration: "none",
              "&:hover": { color: "#CA8A04" },
            },
            blockquote: {
              borderLeftColor: "#A16207",
              fontStyle: "normal",
            },
            table: {
              fontSize: "0.813rem",
              lineHeight: "1.5",
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontVariantNumeric: "tabular-nums",
            },
            "thead th": {
              fontSize: "0.688rem",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
              padding: "0.625rem 0.75rem",
              backgroundColor: "#1C1917",
              color: "#FFFFFF",
              borderBottom: "2px solid #1C1917",
              textAlign: "left",
            },
            "thead th:first-child": {
              borderTopLeftRadius: "0.375rem",
            },
            "thead th:last-child": {
              borderTopRightRadius: "0.375rem",
            },
            "tbody td": {
              padding: "0.5rem 0.75rem",
              verticalAlign: "top",
              borderBottom: "1px solid #E7E5E4",
              color: "#1C1917",
            },
            "tbody tr:nth-child(even)": {
              backgroundColor: "#FAFAF9",
            },
            "tbody tr:hover": {
              backgroundColor: "#F5F5F4",
            },
            "tbody tr:last-child td": {
              borderBottom: "none",
            },
            "tbody tr:last-child td:first-child": {
              borderBottomLeftRadius: "0.375rem",
            },
            "tbody tr:last-child td:last-child": {
              borderBottomRightRadius: "0.375rem",
            },
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
