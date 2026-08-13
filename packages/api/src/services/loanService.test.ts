import { describe, expect, it } from "vitest";
import { resolveBorrowerName } from "./loanService.js";

describe("resolveBorrowerName", () => {
  it("retourne null sans emprunteur", () => {
    expect(
      resolveBorrowerName({ borrowerStudent: null, borrowerTeacher: null, borrowerEmployee: null } as any)
    ).toBeNull();
  });

  it("utilise l'identité de l'étudiant emprunteur", () => {
    const name = resolveBorrowerName({
      borrowerStudent: { firstName: "Aïssatou", lastName: "Sylla" },
      borrowerTeacher: null,
      borrowerEmployee: null,
    } as any);
    expect(name).toBe("Aïssatou Sylla");
  });

  it("lit l'identité depuis l'enseignant lié, jamais l'employé, pour un employé-enseignant payé", () => {
    const name = resolveBorrowerName({
      borrowerStudent: null,
      borrowerTeacher: null,
      borrowerEmployee: { firstName: null, lastName: null, teacher: { firstName: "Sékou", lastName: "Touré" } },
    } as any);
    expect(name).toBe("Sékou Touré");
  });

  it("utilise l'employé administratif pur quand il n'est pas lié à un enseignant", () => {
    const name = resolveBorrowerName({
      borrowerStudent: null,
      borrowerTeacher: null,
      borrowerEmployee: { firstName: "Mariam", lastName: "Bah", teacher: null },
    } as any);
    expect(name).toBe("Mariam Bah");
  });

  it("utilise l'enseignant directement emprunteur", () => {
    const name = resolveBorrowerName({
      borrowerStudent: null,
      borrowerTeacher: { firstName: "Ibrahima", lastName: "Diallo" },
      borrowerEmployee: null,
    } as any);
    expect(name).toBe("Ibrahima Diallo");
  });
});
