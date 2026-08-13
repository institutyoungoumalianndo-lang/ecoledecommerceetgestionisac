import type { Config } from "tailwindcss";
import sharedPreset from "@isac-erp/ui/tailwind-preset";

export default {
  presets: [sharedPreset as Config],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
} satisfies Config;
