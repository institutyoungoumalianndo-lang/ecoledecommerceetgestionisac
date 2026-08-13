import { describe, expect, it } from "vitest";
import { computePaymentStatus } from "./feeSummaryService.js";

describe("computePaymentStatus", () => {
  it("aucun paiement -> NON_PAYE", () => {
    expect(computePaymentStatus(1000, 0)).toBe("NON_PAYE");
  });

  it("paiement partiel -> PARTIELLEMENT_PAYE", () => {
    expect(computePaymentStatus(1000, 400)).toBe("PARTIELLEMENT_PAYE");
  });

  it("paiement égal au net dû -> TOTALEMENT_PAYE", () => {
    expect(computePaymentStatus(1000, 1000)).toBe("TOTALEMENT_PAYE");
  });

  it("surplus versé -> TOTALEMENT_PAYE", () => {
    expect(computePaymentStatus(1000, 1500)).toBe("TOTALEMENT_PAYE");
  });

  it("rien dû (net = 0) -> TOTALEMENT_PAYE même sans paiement", () => {
    expect(computePaymentStatus(0, 0)).toBe("TOTALEMENT_PAYE");
  });
});
