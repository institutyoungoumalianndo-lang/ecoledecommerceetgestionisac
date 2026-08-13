import { describe, expect, it } from "vitest";
import { extractYearParts, padCounter, renderMatriculeTemplate } from "./matriculeService.js";

describe("renderMatriculeTemplate", () => {
  it("remplace toutes les variables du gabarit par défaut", () => {
    expect(
      renderMatriculeTemplate("{FILIERE}-{COMPTEUR}-{SIGLE}-{AA}", {
        FILIERE: "GC",
        COMPTEUR: "134",
        SIGLE: "ISAC",
        AA: "26",
        AAAA: "2026",
      })
    ).toBe("GC-134-ISAC-26");
  });

  it("supporte un gabarit personnalisé utilisant l'année complète", () => {
    expect(
      renderMatriculeTemplate("{SIGLE}/{AAAA}/{FILIERE}{COMPTEUR}", {
        FILIERE: "IN",
        COMPTEUR: "7",
        SIGLE: "ISAC",
        AA: "26",
        AAAA: "2026",
      })
    ).toBe("ISAC/2026/IN7");
  });

  it("remplace toutes les occurrences répétées d'une même variable", () => {
    expect(
      renderMatriculeTemplate("{AA}-{COMPTEUR}-{AA}", {
        FILIERE: "GC",
        COMPTEUR: "1",
        SIGLE: "",
        AA: "26",
        AAAA: "2026",
      })
    ).toBe("26-1-26");
  });
});

describe("padCounter", () => {
  it("ne modifie pas le nombre sans remplissage (padding=0)", () => {
    expect(padCounter(7, 0)).toBe("7");
  });

  it("remplit avec des zéros jusqu'à la largeur demandée", () => {
    expect(padCounter(7, 4)).toBe("0007");
  });

  it("ne tronque pas un nombre déjà plus large que le remplissage", () => {
    expect(padCounter(12345, 3)).toBe("12345");
  });
});

describe("extractYearParts", () => {
  it("extrait les 2 et 4 chiffres de l'année de début", () => {
    expect(extractYearParts("2026-2027")).toEqual({ aa: "26", aaaa: "2026" });
  });

  it("tolère un libellé sans tiret", () => {
    expect(extractYearParts("2026")).toEqual({ aa: "26", aaaa: "2026" });
  });
});
