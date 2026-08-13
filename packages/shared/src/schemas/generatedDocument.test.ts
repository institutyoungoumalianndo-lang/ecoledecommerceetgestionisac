import { describe, expect, it } from "vitest";
import { generateDocumentInputSchema } from "./generatedDocument.js";

describe("generateDocumentInputSchema", () => {
  it("accepte un CERTIFICAT_SCOLARITE avec studentId", () => {
    const result = generateDocumentInputSchema.safeParse({
      documentType: "CERTIFICAT_SCOLARITE",
      studentId: "11111111-1111-1111-1111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("rejette un CERTIFICAT_SCOLARITE sans studentId", () => {
    const result = generateDocumentInputSchema.safeParse({ documentType: "CERTIFICAT_SCOLARITE" });
    expect(result.success).toBe(false);
  });

  it("accepte un LISTE_ENSEIGNANTS sans aucune référence (catalogue global)", () => {
    const result = generateDocumentInputSchema.safeParse({ documentType: "LISTE_ENSEIGNANTS" });
    expect(result.success).toBe(true);
  });

  it("rejette un type de document Tier 2 non implémenté (ex. DIPLOME)", () => {
    const result = generateDocumentInputSchema.safeParse({
      documentType: "DIPLOME",
      studentId: "11111111-1111-1111-1111-111111111111",
    });
    expect(result.success).toBe(false);
  });

  it("accepte un EMPLOI_DU_TEMPS filtré par classe ou par enseignant", () => {
    expect(
      generateDocumentInputSchema.safeParse({
        documentType: "EMPLOI_DU_TEMPS",
        classId: "11111111-1111-1111-1111-111111111111",
      }).success
    ).toBe(true);
    expect(
      generateDocumentInputSchema.safeParse({
        documentType: "EMPLOI_DU_TEMPS",
        teacherId: "11111111-1111-1111-1111-111111111111",
      }).success
    ).toBe(true);
  });
});
