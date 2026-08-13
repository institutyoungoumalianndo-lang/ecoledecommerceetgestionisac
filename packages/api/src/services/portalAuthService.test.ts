import { describe, expect, it } from "vitest";
import { resolveDisplayName, resolvePrincipalType } from "./portalAuthService.js";

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

  it("utilise l'identité de l'enseignant", () => {
    const name = resolveDisplayName({
      student: null,
      teacher: { firstName: "Ousmane", lastName: "Cissé" },
      guardian: null,
      username: "ocisse",
    } as any);
    expect(name).toBe("Ousmane Cissé");
  });

  it("utilise l'identité du tuteur", () => {
    const name = resolveDisplayName({
      student: null,
      teacher: null,
      guardian: { firstName: "Hawa", lastName: "Keita" },
      username: "hkeita",
    } as any);
    expect(name).toBe("Hawa Keita");
  });

  it("retombe sur l'identifiant sans principal résolu", () => {
    const name = resolveDisplayName({ student: null, teacher: null, guardian: null, username: "compte42" } as any);
    expect(name).toBe("compte42");
  });
});
