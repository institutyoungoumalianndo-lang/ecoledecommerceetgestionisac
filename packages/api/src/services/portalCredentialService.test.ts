import { describe, expect, it } from "vitest";
import { resolveDisplayName, resolvePrincipalType, slugifyNamePart } from "./portalCredentialService.js";

describe("resolvePrincipalType", () => {
  it("reconnaît un étudiant via studentId", () => {
    expect(resolvePrincipalType({ studentId: "s1", teacherId: null, guardianId: null } as any)).toBe("STUDENT");
  });

  it("reconnaît un enseignant via teacherId", () => {
    expect(resolvePrincipalType({ studentId: null, teacherId: "t1", guardianId: null } as any)).toBe("TEACHER");
  });

  it("retombe sur tuteur quand ni étudiant ni enseignant", () => {
    expect(resolvePrincipalType({ studentId: null, teacherId: null, guardianId: "g1" } as any)).toBe("GUARDIAN");
  });
});

describe("resolveDisplayName", () => {
  it("utilise l'identité de l'étudiant", () => {
    const name = resolveDisplayName({
      student: { firstName: "Kadiatou", lastName: "Barry" },
      teacher: null,
      guardian: null,
      username: "kbarry",
    } as any);
    expect(name).toBe("Kadiatou Barry");
  });

  it("retombe sur l'identifiant sans principal résolu", () => {
    const name = resolveDisplayName({ student: null, teacher: null, guardian: null, username: "compte42" } as any);
    expect(name).toBe("compte42");
  });
});

describe("slugifyNamePart", () => {
  it("retire accents et met en minuscules", () => {
    expect(slugifyNamePart("Kéïta Ndiaye")).toBe("keitandiaye");
  });

  it("retire les caractères non alphanumériques", () => {
    expect(slugifyNamePart("O'Brien-Touré 3")).toBe("obrientoure3");
  });

  it("retourne une chaîne vide pour une entrée sans caractères alphanumériques", () => {
    expect(slugifyNamePart("---")).toBe("");
  });
});
