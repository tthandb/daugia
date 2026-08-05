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
        // ── New "official gazette" system ──────────────────────────────
        paper: "#F4F6F1", // warm-cool off-white with a faint green bias
        card: "#FFFFFF",
        ink: "#16211C", // pine near-black — text, headers, dark sections
        "ink-soft": "#4C574F", // muted secondary text
        "ink-faint": "#7C867E", // metadata, captions
        line: "#DEE3D8", // borders / dividers
        pine: "#1B4332", // primary brand green — buttons, links, accents
        "pine-bright": "#2D6A4F", // hover / lighter green
        "pine-deep": "#122F23", // darkest green — hero, footer
        "pine-pale": "#E7EFE8", // green tint — chips, hover surfaces
        brass: "#9A6B1E", // accent — wordmark, emphasis, active
        "brass-ink": "#7E5514", // brass for small text on light (AA)
        "brass-pale": "#F5ECDA", // brass tint background
        // auction status semantics (separate from brand accent)
        "status-open": "#15803D",
        "status-open-bg": "#E4F2E8",
        "status-soon": "#B45309",
        "status-soon-bg": "#F9EEDD",
        "status-ended": "#6B7280",
        "status-ended-bg": "#EEEFEC",

        // ── Legacy aliases (remapped so un-refactored pages re-theme) ───
        charcoal: "#16211C",
        "charcoal-light": "#3A463F",
        gold: "#9A6B1E",
        "gold-light": "#B98526",
        "gold-pale": "#F5ECDA",
        "warm-white": "#F4F6F1",
        "warm-border": "#DEE3D8",
        "muted-fg": "#4C574F",
        fg: "#16211C",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Lora", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        // aliases used throughout existing markup
        heading: ["var(--font-serif)", "Lora", "serif"],
        body: ["var(--font-sans)", "sans-serif"],
        document: ["var(--font-serif)", "Lora", "serif"], // was Times New Roman
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
            "--tw-prose-body": "#22302A",
            "--tw-prose-headings": "#16211C",
            "--tw-prose-links": "#1B4332",
            "--tw-prose-bold": "#16211C",
            "--tw-prose-quotes": "#3A463F",
            "--tw-prose-quote-borders": "#9A6B1E",
            maxWidth: "none",
            h1: { fontFamily: "var(--font-serif), serif" },
            h2: { fontFamily: "var(--font-serif), serif" },
            h3: { fontFamily: "var(--font-serif), serif" },
            h4: { fontFamily: "var(--font-serif), serif" },
            a: {
              color: "#1B4332",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              "&:hover": { color: "#9A6B1E" },
            },
            blockquote: {
              borderLeftColor: "#9A6B1E",
              fontStyle: "normal",
            },
            table: {
              fontSize: "0.813rem",
              lineHeight: "1.5",
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--font-sans), sans-serif",
              fontVariantNumeric: "tabular-nums",
            },
            "thead th": {
              fontSize: "0.688rem",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
              padding: "0.625rem 0.75rem",
              backgroundColor: "#1B4332",
              color: "#FFFFFF",
              borderBottom: "2px solid #1B4332",
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
              borderBottom: "1px solid #E7EAE3",
              color: "#22302A",
            },
            "tbody tr:nth-child(even)": {
              backgroundColor: "#F4F6F1",
            },
            "tbody tr:hover": {
              backgroundColor: "#EDF1EA",
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
