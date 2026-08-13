import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [
      // @isac-erp/shared exporte encore des .ts en dev — on l'inclut dans le bundle main
      // pour éviter ERR_UNKNOWN_FILE_EXTENSION dans l'exécutable installé (app.asar).
      externalizeDepsPlugin({ exclude: ["@isac-erp/shared"] }),
    ],
    ssr: {
      noExternal: ["@isac-erp/shared"],
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    // Le renderer sandboxé (webPreferences.sandbox: true, main/index.ts) charge le preload via un
    // exécuteur qui ne comprend pas la syntaxe `import` ESM — seulement CommonJS. Sans ce réglage,
    // electron-vite suit le `"type": "module"` de package.json et produit un `.mjs`, qui échoue
    // silencieusement à l'exécution ("Cannot use import statement outside a module"), laissant tout
    // le pont `window.isacErp` indéfini. Jamais repéré avant le premier test de l'exécutable installé
    // (2026-08-10) car `electron-vite dev` ne charge pas le preload de la même façon.
    build: {
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "[name].js",
        },
      },
    },
  },
  renderer: {
    root: "src/renderer",
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer/src"),
      },
    },
    plugins: [react()],
  },
});
