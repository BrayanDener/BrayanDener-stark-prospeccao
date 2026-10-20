import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    // Escala tipográfica da Stark: 12 / 14 / 16 / 20 / 24 / 32
    fontSize: {
      xs: ["0.75rem", { lineHeight: "1rem" }],
      sm: ["0.875rem", { lineHeight: "1.25rem" }],
      base: ["1rem", { lineHeight: "1.5rem" }],
      xl: ["1.25rem", { lineHeight: "1.75rem" }],
      "2xl": ["1.5rem", { lineHeight: "2rem" }],
      "3xl": ["2rem", { lineHeight: "2.5rem" }],
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        background: token("background"),
        foreground: token("foreground"),
        surface: { DEFAULT: token("surface"), 2: token("surface-2") },
        border: "hsl(var(--border) / 0.10)",
        "border-strong": "hsl(var(--border) / 0.18)",
        input: "hsl(var(--border) / 0.14)",
        ring: token("ring"),
        tertiary: token("tertiary"),
        primary: {
          DEFAULT: token("primary"),
          hover: token("primary-hover"),
          solid: token("primary-solid"),
          "solid-hover": token("primary-solid-hover"),
          muted: "hsl(var(--primary) / 0.14)",
          foreground: token("primary-foreground"),
        },
        success: token("success"),
        warning: token("warning"),
        danger: token("danger"),
        violet: token("violet"),
        whatsapp: token("whatsapp"),
        // Aliases esperados pelos componentes do shadcn
        card: { DEFAULT: token("surface"), foreground: token("foreground") },
        popover: { DEFAULT: token("surface"), foreground: token("foreground") },
        secondary: { DEFAULT: token("surface-2"), foreground: token("foreground") },
        muted: { DEFAULT: token("surface-2"), foreground: token("muted-foreground") },
        accent: { DEFAULT: token("surface-2"), foreground: token("foreground") },
        destructive: { DEFAULT: token("danger"), foreground: token("foreground") },
      },
      borderRadius: {
        lg: "var(--radius)", // 12px — cards
        md: "calc(var(--radius) - 2px)", // 10px — botões e inputs
        sm: "calc(var(--radius) - 4px)",
      },
      opacity: { 12: "0.12", 14: "0.14" },
      minWidth: { 11: "2.75rem" },
      letterSpacing: {
        tightish: "-0.015em",
        tighter: "-0.025em",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "light-sweep": {
          "0%": { transform: "scaleX(0)", opacity: "0" },
          "15%": { opacity: "1" },
          "100%": { transform: "scaleX(1)", opacity: "1" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "light-sweep": "light-sweep 1.2s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
