import { describe, expect, it } from "vitest";
import { calculerMoyenneAnnuelle, calculerMoyennePeriode, calculerNoteFinale, obtenirDecision, obtenirMention } from "./noteService.js";

const POIDS_EGAUX = { poidsOrale: 1, poidsEcrite: 1, poidsComposition: 1 };
const SEUILS = { seuilPassable: 10, seuilAssezBien: 12, seuilBien: 14, seuilTresBien: 16 };

describe("calculerNoteFinale", () => {
  it("fait la moyenne des 3 composantes quand toutes sont renseignées", () => {
    expect(calculerNoteFinale(10, 12, 14, POIDS_EGAUX)).toBe(12);
  });

  it("ignore les composantes non renseignées", () => {
    expect(calculerNoteFinale(10, null, null, POIDS_EGAUX)).toBe(10);
    expect(calculerNoteFinale(10, 14, null, POIDS_EGAUX)).toBe(12);
  });

  it("retourne null si aucune composante n'est renseignée", () => {
    expect(calculerNoteFinale(null, null, null, POIDS_EGAUX)).toBeNull();
  });

  it("respecte des pondérations différentes", () => {
    // écrite pèse 2x plus que orale : (10*1 + 16*2) / 3 = 14
    expect(calculerNoteFinale(10, 16, null, { poidsOrale: 1, poidsEcrite: 2, poidsComposition: 1 })).toBe(14);
  });
});

describe("obtenirMention", () => {
  it("retourne — si la moyenne est null", () => {
    expect(obtenirMention(null, SEUILS)).toBe("—");
  });

  it("respecte le barème (MODULE-06 §1.6)", () => {
    expect(obtenirMention(8, SEUILS)).toBe("Ajourné");
    expect(obtenirMention(10, SEUILS)).toBe("Passable");
    expect(obtenirMention(12, SEUILS)).toBe("Assez Bien");
    expect(obtenirMention(14, SEUILS)).toBe("Bien");
    expect(obtenirMention(16, SEUILS)).toBe("Très Bien");
    expect(obtenirMention(18, SEUILS)).toBe("Très Bien");
  });
});

describe("obtenirDecision", () => {
  it("ADMIS si la moyenne atteint le seuil d'admission, AJOURNE sinon — jamais REDOUBLANT automatique", () => {
    expect(obtenirDecision(10, 10)).toBe("ADMIS");
    expect(obtenirDecision(9.99, 10)).toBe("AJOURNE");
  });
});

describe("calculerMoyennePeriode", () => {
  it("moyenne pondérée par coefficient des matières notées", () => {
    // (12*2 + 8*1) / 3 = 10.666... arrondi à 10.67
    expect(calculerMoyennePeriode([{ noteFinale: 12, coefficient: 2 }, { noteFinale: 8, coefficient: 1 }])).toBe(10.67);
  });

  it("ignore les matières sans note finale", () => {
    expect(calculerMoyennePeriode([{ noteFinale: 12, coefficient: 2 }, { noteFinale: null, coefficient: 3 }])).toBe(12);
  });

  it("retourne null si aucune matière n'est notée", () => {
    expect(calculerMoyennePeriode([{ noteFinale: null, coefficient: 2 }])).toBeNull();
  });
});

describe("calculerMoyenneAnnuelle", () => {
  it("moyenne des périodes calculables, pondération égale (généralise 2 modules à N périodes)", () => {
    expect(calculerMoyenneAnnuelle([12, 14])).toBe(13);
    expect(calculerMoyenneAnnuelle([12, 14, 16])).toBe(14);
  });

  it("ignore les périodes sans moyenne", () => {
    expect(calculerMoyenneAnnuelle([12, null, 16])).toBe(14);
  });

  it("retourne null si aucune période n'a de moyenne", () => {
    expect(calculerMoyenneAnnuelle([null, null])).toBeNull();
  });
});
