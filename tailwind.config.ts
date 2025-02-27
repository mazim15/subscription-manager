import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        headingText: "var(--heading-text)",
        sidebar: "var(--sidebar)",
        sidebarHover: "var(--sidebar-hover)",
        cardBackground: "var(--card-background)",
        primary: "var(--primary)",
        primaryHover: "var(--primary-hover)",
      },
    },
  },
  plugins: [],
  darkMode: 'media',
} satisfies Config;
