import { describe, expect, it } from "vitest";
import { normalizeStatus } from "./enrollmentImportService.js";

describe("normalizeStatus", () => {
  it("retombe sur ANCIEN par défaut si absent (réinscription implicite)", () => {
    expect(normalizeStatus(undefined)).toBe("ANCIEN");
    expect(normalizeStatus(null)).toBe("ANCIEN");
    expect(normalizeStatus("")).toBe("ANCIEN");
  });

  it("reconnaît chaque statut avec ou sans accent/casse", () => {
    expect(normalizeStatus("Nouveau")).toBe("NOUVEAU");
    expect(normalizeStatus("nouveau")).toBe("NOUVEAU");
    expect(normalizeStatus("Redoublant")).toBe("REDOUBLANT");
    expect(normalizeStatus("Transfert")).toBe("TRANSFERT");
    expect(normalizeStatus("Reprise")).toBe("REPRISE");
    expect(normalizeStatus("Ancien")).toBe("ANCIEN");
  });

  it("retombe sur ANCIEN pour une valeur non reconnue", () => {
    expect(normalizeStatus("xyz")).toBe("ANCIEN");
  });
});
