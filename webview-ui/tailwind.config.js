/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: "var(--nexus-bg)",
          sidebar: "var(--nexus-sidebar)",
          border: "var(--nexus-border)",
          accent: "var(--nexus-accent)",
          text: "var(--nexus-text)",
          "text-bright": "var(--nexus-text-bright)",
          "text-muted": "var(--nexus-text-muted)",
          "input-bg": "var(--nexus-input-bg)",
          "input-fg": "var(--nexus-input-fg)",
          "input-border": "var(--nexus-input-border)",
          "focus-border": "var(--nexus-focus-border)",
        },
      },
    },
  },
  plugins: [],
};
