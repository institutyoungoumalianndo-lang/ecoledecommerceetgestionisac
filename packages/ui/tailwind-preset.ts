import type { Config } from "tailwindcss";

/**
 * Design system partagé ISAC ERP — préréglage Tailwind commun à toutes les
 * apps (desktop, futur portail web/mobile).
 *
 * Palette neutre par défaut (Module 0). Les couleurs d'identité visuelle
 * réelles par établissement (§1.4 de docs/modules/MODULE-00-socle-technique.md)
 * seront rendues configurables au Module 2 (Paramètres) — cette palette reste
 * le filet de sécurité par défaut, jamais codée en dur dans les écrans.
 */
const preset: Partial<Config> = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        window: {
          DEFAULT: "hsl(var(--window))",
          foreground: "hsl(var(--window-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        button: {
          DEFAULT: "hsl(var(--button))",
          foreground: "hsl(var(--button-foreground))",
        },
        menu: {
          DEFAULT: "hsl(var(--menu))",
          foreground: "hsl(var(--menu-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
      },
      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        DEFAULT: "var(--radius)",
        lg: "calc(var(--radius) + 4px)",
      },
      fontFamily: {
        sans: ["Segoe UI", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
};

export default preset;
