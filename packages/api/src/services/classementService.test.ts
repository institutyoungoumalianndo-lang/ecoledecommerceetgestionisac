import { describe, expect, it } from "vitest";
import { attribuerRangs } from "./classementService.js";

describe("attribuerRangs", () => {
  it("attribue un rang croissant sans ex-æquo", () => {
    const lignes = [{ id: "a", moyenne: 16 }, { id: "b", moyenne: 14 }, { id: "c", moyenne: 12 }];
    const resultat = attribuerRangs(lignes);
    expect(resultat.map((r) => r.rang)).toEqual([1, 2, 3]);
  });

  it("gère les ex-æquo façon classement sportif (le rang suivant saute — ex. 1, 1, 3)", () => {
    const lignes = [{ id: "a", moyenne: 16 }, { id: "b", moyenne: 16 }, { id: "c", moyenne: 12 }];
    const resultat = attribuerRangs(lignes);
    expect(resultat.map((r) => r.rang)).toEqual([1, 1, 3]);
  });

  it("gère plusieurs groupes d'ex-æquo consécutifs", () => {
    const lignes = [
      { id: "a", moyenne: 16 },
      { id: "b", moyenne: 14 },
      { id: "c", moyenne: 14 },
      { id: "d", moyenne: 14 },
      { id: "e", moyenne: 10 },
    ];
    const resultat = attribuerRangs(lignes);
    expect(resultat.map((r) => r.rang)).toEqual([1, 2, 2, 2, 5]);
  });
});
