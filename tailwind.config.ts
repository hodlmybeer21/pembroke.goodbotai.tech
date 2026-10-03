import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand: navy. Used for header bg, active link, focus ring.
        brand: {
          50: "#eff4ff",
          100: "#dbe5ff",
          500: "#3753b3",
          600: "#2c47a3",
          700: "#233a8a",
          900: "#1e3a8a",
        },
        // Accent: warm amber. Used for "this affects you" / active state.
        accent: {
          50: "#fef8eb",
          100: "#fde9c2",
          400: "#f0b451",
          500: "#e09528",
          600: "#d97706",
          700: "#b25e05",
          900: "#7c3d05",
        },
        // Impact-tag palette. Each maps to a real-world metaphor:
        //   wallet   → terracotta (cost, warmth, "this hits your budget")
        //   commute  → steel     (road sign, gray-blue, neutral)
        //   kids     → forest    (playground, green, growth)
        //   property → indigo    (zoning document, blue)
        //   family   → warm-stone (community hearth, neutral warm)
        impact: {
          wallet:   "#b45309",
          commute:  "#475569",
          kids:     "#15803d",
          property: "#1e3a8a",
          family:   "#78716c",
        },
        // Success green for confirmations ("Saved", "✓", delivery receipts).
        success: "#15803d",
      },
      fontFamily: {
        sans:  ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Source Serif 4"', '"Source Serif Pro"', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: {
        // Custom base size — 16/24 is too airy for content-heavy civic pages.
        'base': ['15px', { lineHeight: '1.6' }],
      },
      maxWidth: {
        'site': '1100px',
      },
    },
  },
  plugins: [],
};

export default config;