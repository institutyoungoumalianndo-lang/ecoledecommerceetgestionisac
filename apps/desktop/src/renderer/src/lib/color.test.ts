import { describe, expect, it } from "vitest";
import { contrastForeground, hexToHslString } from "./color";

describe("hexToHslString", () => {
  it("convertit un bleu foncé connu", () => {
    expect(hexToHslString("#0B1F44")).toBe("219 72% 15%");
  });

  it("convertit le blanc et le noir (cas achromatiques)", () => {
    expect(hexToHslString("#FFFFFF")).toBe("0 0% 100%");
    expect(hexToHslString("#000000")).toBe("0 0% 0%");
  });

  it("accepte un hex sans le dièse", () => {
    expect(hexToHslString("FFFFFF")).toBe("0 0% 100%");
  });

  it("retourne null pour une entrée invalide", () => {
    expect(hexToHslString("pas-une-couleur")).toBeNull();
    expect(hexToHslString("#FFF")).toBeNull();
  });
});

describe("contrastForeground", () => {
  it("choisit un texte sombre sur une couleur claire (ex. mauve pâle configuré par l'établissement)", () => {
    expect(contrastForeground("#E5DCDC")).toBe("222 47% 11%");
  });

  it("choisit un texte blanc sur une couleur foncée (ex. bleu marine par défaut)", () => {
    expect(contrastForeground("#0B1F44")).toBe("0 0% 100%");
  });

  it("choisit un texte blanc sur la couleur de fenêtre par défaut", () => {
    expect(contrastForeground("#0284C7")).toBe("0 0% 100%");
  });

  it("retourne null pour une entrée invalide", () => {
    expect(contrastForeground("pas-une-couleur")).toBeNull();
  });
});
