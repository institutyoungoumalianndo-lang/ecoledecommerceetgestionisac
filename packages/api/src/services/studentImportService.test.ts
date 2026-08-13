import { describe, expect, it } from "vitest";
import { normalizeGender, normalizeMaritalStatus } from "./studentImportService.js";

describe("normalizeGender", () => {
  it("reconnaît les variantes usuelles du masculin", () => {
    expect(normalizeGender("M")).toBe("M");
    expect(normalizeGender("m")).toBe("M");
    expect(normalizeGender("Masculin")).toBe("M");
    expect(normalizeGender("Homme")).toBe("M");
  });

  it("reconnaît les variantes usuelles du féminin", () => {
    expect(normalizeGender("F")).toBe("F");
    expect(normalizeGender("Féminin")).toBe("F");
    expect(normalizeGender("Femme")).toBe("F");
  });

  it("retourne null pour une valeur non reconnue", () => {
    expect(normalizeGender("")).toBeNull();
    expect(normalizeGender("autre")).toBeNull();
  });
});

describe("normalizeMaritalStatus", () => {
  it("retourne CELIBATAIRE par défaut si absent", () => {
    expect(normalizeMaritalStatus(undefined)).toBe("CELIBATAIRE");
    expect(normalizeMaritalStatus(null)).toBe("CELIBATAIRE");
  });

  it("reconnaît célibataire avec ou sans accent", () => {
    expect(normalizeMaritalStatus("Célibataire")).toBe("CELIBATAIRE");
    expect(normalizeMaritalStatus("Celibataire")).toBe("CELIBATAIRE");
  });

  it("reconnaît marié(e)", () => {
    expect(normalizeMaritalStatus("Marié(e)")).toBe("MARIE");
    expect(normalizeMaritalStatus("mariee")).toBe("MARIE");
  });

  it("retombe sur AUTRE pour toute autre valeur", () => {
    expect(normalizeMaritalStatus("Veuf")).toBe("AUTRE");
  });
});
