import { describe, expect, it } from "vitest";
import { buildSoldeMessage } from "./paymentNotificationService.js";

describe("buildSoldeMessage", () => {
  it("précise le montant restant en cas de paiement partiel (MODULE-12 §1.11)", () => {
    const message = buildSoldeMessage(50000);
    expect(message).toContain("Reste à payer");
    expect(message).toContain("50");
    expect(message).toContain("000 GNF.");
  });

  it("précise que la totalité est soldée quand le reste à payer est nul", () => {
    expect(buildSoldeMessage(0)).toBe("Totalité des frais de scolarité soldée.");
  });
});
