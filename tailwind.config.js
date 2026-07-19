/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Driven by CSS custom properties so themes swap at runtime.
        bg: "var(--marky-bg)",
        surface: "var(--marky-surface)",
        "surface-2": "var(--marky-surface-2)",
        border: "var(--marky-border)",
        accent: "var(--marky-accent)",
        "accent-2": "var(--marky-accent-2)",
        text: "var(--marky-text)",
        "text-muted": "var(--marky-text-muted)",
      },
      fontFamily: {
        mono: ["var(--marky-font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        panel: "8px",
        float: "12px",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      boxShadow: {
        glow: "0 0 8px var(--marky-accent), 0 0 24px color-mix(in srgb, var(--marky-accent) 40%, transparent)",
      },
    },
  },
  plugins: [],
};
