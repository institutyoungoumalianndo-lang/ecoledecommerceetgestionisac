import { describe, expect, it } from "vitest";
import { formatLocationLabel, requireSingleResponsible, resolveResponsibleName } from "./assetService.js";

describe("formatLocationLabel", () => {
  it("retourne null pour une localisation absente", () => {
    expect(formatLocationLabel(null)).toBeNull();
  });

  it("joint bâtiment/étage/lieu avec un séparateur", () => {
    expect(formatLocationLabel({ building: "Bâtiment principal", floor: "1er étage", label: "Salle 12" })).toBe(
      "Bâtiment principal / 1er étage / Salle 12"
    );
  });

  it("omet l'étage quand il est absent", () => {
    expect(formatLocationLabel({ building: "Bâtiment principal", floor: null, label: "Entrepôt" })).toBe(
      "Bâtiment principal / Entrepôt"
    );
  });
});

describe("resolveResponsibleName", () => {
  it("retourne null sans responsable", () => {
    expect(resolveResponsibleName({ responsibleEmployee: null, responsibleTeacher: null } as any)).toBeNull();
  });

  it("utilise l'identité de l'employé administratif pur", () => {
    const name = resolveResponsibleName({
      responsibleEmployee: { firstName: "Awa", lastName: "Camara", teacher: null },
      responsibleTeacher: null,
    } as any);
    expect(name).toBe("Awa Camara");
  });

  it("lit l'identité depuis l'enseignant lié, jamais l'employé, pour un employé-enseignant payé", () => {
    const name = resolveResponsibleName({
      responsibleEmployee: { firstName: null, lastName: null, teacher: { firstName: "Moussa", lastName: "Diallo" } },
      responsibleTeacher: null,
    } as any);
    expect(name).toBe("Moussa Diallo");
  });

  it("utilise l'enseignant directement responsable quand aucun employé n'est renseigné", () => {
    const name = resolveResponsibleName({
      responsibleEmployee: null,
      responsibleTeacher: { firstName: "Fatou", lastName: "Bah" },
    } as any);
    expect(name).toBe("Fatou Bah");
  });
});

describe("requireSingleResponsible", () => {
  it("ne lève pas d'erreur si aucun ou un seul responsable est fourni", () => {
    expect(() => requireSingleResponsible(null, null)).not.toThrow();
    expect(() => requireSingleResponsible("emp-1", null)).not.toThrow();
    expect(() => requireSingleResponsible(null, "tch-1")).not.toThrow();
  });

  it("lève une erreur si employé ET enseignant sont fournis", () => {
    expect(() => requireSingleResponsible("emp-1", "tch-1")).toThrow(/un seul responsable/);
  });
});
