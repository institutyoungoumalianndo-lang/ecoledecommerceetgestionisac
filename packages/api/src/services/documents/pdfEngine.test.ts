import { describe, expect, it } from "vitest";
import { amountToFrenchWords, amountToFrenchWordsWithCurrency, buildQrPayload, formatDateFr, resolveUploadPath } from "./pdfEngine.js";

describe("buildQrPayload", () => {
  it("inclut le numéro de document, le campus et la date, plus les champs propres au type", () => {
    const payload = buildQrPayload("CS-1-26", "Campus principal", new Date(2026, 6, 29), {
      matricule: "ET-2026-0001",
      nomComplet: "Jean Dupont",
    });

    expect(payload).toEqual({
      numero: "CS-1-26",
      campus: "Campus principal",
      dateGeneration: formatDateFr(new Date(2026, 6, 29)),
      matricule: "ET-2026-0001",
      nomComplet: "Jean Dupont",
    });
  });

  it("reste un payload minimal (jamais une URL) — voir ADR-007, application hors-ligne", () => {
    const payload = buildQrPayload("LEN-1-26", "Campus principal", new Date(), {});
    for (const value of Object.values(payload)) {
      expect(value).not.toMatch(/^https?:\/\//);
    }
  });
});

describe("formatDateFr", () => {
  it("formate au format jour long mois année", () => {
    expect(formatDateFr(new Date(2026, 6, 29))).toBe("29 juillet 2026");
  });
});

describe("resolveUploadPath", () => {
  it("retourne null pour un chemin vide", () => {
    expect(resolveUploadPath(null)).toBeNull();
    expect(resolveUploadPath(undefined)).toBeNull();
    expect(resolveUploadPath("")).toBeNull();
  });

  it("retourne null si le fichier n'existe pas sur le disque", () => {
    expect(resolveUploadPath("/uploads/ce-fichier-n-existe-pas-12345.png")).toBeNull();
  });
});

describe("amountToFrenchWords", () => {
  it("gère les irrégularités de 70-79 et 90-99 (soixante-et-onze, quatre-vingt-onze, sans 'et' à 81/91)", () => {
    expect(amountToFrenchWords(71)).toBe("Soixante-et-onze");
    expect(amountToFrenchWords(80)).toBe("Quatre-vingts");
    expect(amountToFrenchWords(81)).toBe("Quatre-vingt-un");
    expect(amountToFrenchWords(91)).toBe("Quatre-vingt-onze");
    expect(amountToFrenchWords(99)).toBe("Quatre-vingt-dix-neuf");
  });

  it("accorde correctement cent(s) selon qu'il est multiplié et/ou suivi d'un autre nombre", () => {
    expect(amountToFrenchWords(100)).toBe("Cent");
    expect(amountToFrenchWords(101)).toBe("Cent-un");
    expect(amountToFrenchWords(200)).toBe("Deux-cents");
    expect(amountToFrenchWords(201)).toBe("Deux-cent-un");
  });

  it("ne dit jamais 'un mille', contrairement à 'un million'/'un milliard'", () => {
    expect(amountToFrenchWords(1000)).toBe("Mille");
    expect(amountToFrenchWords(2000)).toBe("Deux-mille");
    expect(amountToFrenchWords(1_000_000)).toBe("Un million");
    expect(amountToFrenchWords(1_000_000_000)).toBe("Un milliard");
  });

  it("combine les tranches (milliards/millions/milliers/unités)", () => {
    expect(amountToFrenchWords(3_050_000)).toBe("Trois millions cinquante-mille");
    expect(amountToFrenchWords(4_350_000)).toBe("Quatre millions trois-cent-cinquante-mille");
  });

  it("gère zéro", () => {
    expect(amountToFrenchWords(0)).toBe("Zéro");
  });
});

describe("amountToFrenchWordsWithCurrency", () => {
  it("ajoute 'de' seulement quand million/milliard est le dernier élément numéral (montant rond)", () => {
    expect(amountToFrenchWordsWithCurrency(1_000_000)).toBe("Un million de francs guinéens");
    expect(amountToFrenchWordsWithCurrency(3_050_000)).toBe("Trois millions cinquante-mille francs guinéens");
  });
});
