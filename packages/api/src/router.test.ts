import { describe, expect, it } from "vitest";
import { appRouter } from "./router.js";

describe("appRouter", () => {
  it("expose la procédure health.check", () => {
    // Test structurel uniquement : l'appel réel de health.check nécessite une
    // base PostgreSQL démarrée (pnpm db:up) et est couvert par le test E2E
    // Playwright de apps/desktop, pas ici.
    expect(appRouter.health.check).toBeDefined();
  });
});
