import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron, expect, test } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Test E2E de bout en bout : l'application Electron packagée démarre et
 * affiche l'écran de connexion (ou l'assistant de première installation si
 * aucun administrateur n'existe). Fonctionne même sans base de données
 * disponible — les deux écrans se dégradent proprement (voir
 * docs/modules/MODULE-01-identite-acces.md §1.4.1 et principe non
 * négociable n°7 de docs/ARCHITECTURE_MASTER.md).
 *
 * Prérequis avant exécution : `pnpm build` de apps/desktop.
 */
test("l'application démarre et affiche l'écran de connexion ou l'assistant de première installation", async () => {
  const app = await electron.launch({
    args: [path.join(__dirname, "..", "out", "main", "index.js")],
  });

  const window = await app.firstWindow();
  await expect(
    window.getByText(/ISAC ERP|Configuration initiale/).first()
  ).toBeVisible({ timeout: 15_000 });

  await app.close();
});
