import { describe, expect, it } from "vitest";
import { resolveRecipientName } from "./digitalDocumentShareService.js";

describe("resolveRecipientName", () => {
  it("retourne null sans destinataire", () => {
    expect(
      resolveRecipientName({ recipientStudent: null, recipientTeacher: null, recipientEmployee: null } as any)
    ).toBeNull();
  });

  it("utilise l'identité de l'étudiant destinataire", () => {
    const name = resolveRecipientName({
      recipientStudent: { firstName: "Kadiatou", lastName: "Barry" },
      recipientTeacher: null,
      recipientEmployee: null,
    } as any);
    expect(name).toBe("Kadiatou Barry");
  });

  it("lit l'identité depuis l'enseignant lié, jamais l'employé, pour un employé-enseignant payé", () => {
    const name = resolveRecipientName({
      recipientStudent: null,
      recipientTeacher: null,
      recipientEmployee: { firstName: null, lastName: null, teacher: { firstName: "Ousmane", lastName: "Cissé" } },
    } as any);
    expect(name).toBe("Ousmane Cissé");
  });

  it("utilise l'enseignant directement destinataire", () => {
    const name = resolveRecipientName({
      recipientStudent: null,
      recipientTeacher: { firstName: "Hawa", lastName: "Keita" },
      recipientEmployee: null,
    } as any);
    expect(name).toBe("Hawa Keita");
  });
});
