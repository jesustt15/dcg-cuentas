/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Obsidian surfaces
        obsidian: "#131316",
        "obsidian-dim": "#0e0e11",
        "obsidian-low": "#1b1b1e",
        "obsidian-base": "#1f1f22",
        "obsidian-high": "#2a2a2d",
        "obsidian-highest": "#353438",
        surface: {
          dim: "#131316",
          low: "#1b1b1e",
          base: "#1f1f22",
          high: "#2a2a2d",
          highest: "#353438",
          bright: "#39393c",
        },
        gold: { DEFAULT: "#D4AF37", light: "#E5C158", dark: "#B89628" },
        status: { success: "#10B981", error: "#EF4444", info: "#38BDF8" },
        neutral: { DEFAULT: "#F4F4F5", muted: "#71717A", subtle: "#A1A1AA" },
        divider: "#27272A",
        border: "#3F3F46",
      },
      fontFamily: {
        heading: ["Chivo", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: { DEFAULT: "0.25rem", md: "0.375rem", lg: "0.5rem" },
    },
  },
  plugins: [],
};
