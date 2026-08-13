import { describe, expect, it } from "vitest";
import { substituteTemplateVariables } from "./messageTemplateService.js";

describe("substituteTemplateVariables", () => {
  it("remplace toutes les variables fournies", () => {
    expect(substituteTemplateVariables("Bonjour {Nom} {Prénom}", { Nom: "Camara", Prénom: "Fatoumata" })).toBe(
      "Bonjour Camara Fatoumata"
    );
  });

  it("laisse une variable absente du jeu fourni telle quelle", () => {
    expect(substituteTemplateVariables("Solde : {ResteÀPayer}", {})).toBe("Solde : {ResteÀPayer}");
  });

  it("gère les accents et caractères spéciaux dans les noms de variable", () => {
    expect(substituteTemplateVariables("{AnnéeUniversitaire} — {MontantPayé}", { AnnéeUniversitaire: "2025-2026", MontantPayé: "50000" })).toBe(
      "2025-2026 — 50000"
    );
  });

  it("remplace la même variable répétée plusieurs fois", () => {
    expect(substituteTemplateVariables("{Nom} {Nom}", { Nom: "Diallo" })).toBe("Diallo Diallo");
  });

  it("ne modifie pas un contenu sans variable", () => {
    expect(substituteTemplateVariables("Message fixe.", { Nom: "Diallo" })).toBe("Message fixe.");
  });
});
