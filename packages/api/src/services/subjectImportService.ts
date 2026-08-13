import { prisma } from "@isac-erp/db";
import type {
  ExecuteSubjectImportInput,
  ExecuteSubjectImportOutput,
  SubjectImportRowData,
  SubjectImportRowResult,
  ValidateSubjectImportInput,
  ValidateSubjectImportOutput,
} from "@isac-erp/shared";
import { createSubject } from "./subjectService.js";

/** Import en masse du catalogue de matières (MODULE-02.1 §6 point 3) — validation en deux temps, comme l'import étudiants (Module 4). */
export async function validateSubjectImport(input: ValidateSubjectImportInput): Promise<ValidateSubjectImportOutput> {
  const existingCodes = new Set((await prisma.subject.findMany({ select: { code: true } })).map((s) => s.code.toUpperCase()));
  const seenInBatch = new Set<string>();
  const results: SubjectImportRowResult[] = [];

  for (const row of input.rows) {
    const errors: string[] = [];
    const duplicateWarnings: string[] = [];

    const code = row.code.trim();
    const name = row.name.trim();
    if (!code) errors.push("Code manquant.");
    if (!name) errors.push("Nom manquant.");

    let credits: number | null = null;
    if (row.credits?.trim()) {
      const parsed = Number(row.credits.trim().replace(",", "."));
      if (Number.isNaN(parsed) || parsed < 0) {
        errors.push("Crédits invalides.");
      } else {
        credits = parsed;
      }
    }

    if (code) {
      const upperCode = code.toUpperCase();
      if (existingCodes.has(upperCode)) {
        errors.push(`Le code "${code}" existe déjà.`);
      }
      if (seenInBatch.has(upperCode)) {
        duplicateWarnings.push("Ligne avec le même code qu'une autre ligne du même fichier.");
      }
      seenInBatch.add(upperCode);
    }

    const isValid = errors.length === 0;
    const data: SubjectImportRowData | null = isValid
      ? { code, name, description: row.description ?? null, credits }
      : null;

    results.push({ rowNumber: row.rowNumber, data, errors, duplicateWarnings, isValid });
  }

  return {
    results,
    validCount: results.filter((r) => r.isValid).length,
    errorCount: results.filter((r) => !r.isValid).length,
    warningCount: results.filter((r) => r.duplicateWarnings.length > 0).length,
  };
}

export async function executeSubjectImport(input: ExecuteSubjectImportInput): Promise<ExecuteSubjectImportOutput> {
  let importedCount = 0;
  const failedRows: { rowNumber: number; error: string }[] = [];

  for (const row of input.rows) {
    try {
      await createSubject({
        code: row.data.code,
        name: row.data.name,
        description: row.data.description,
        credits: row.data.credits,
      });
      importedCount += 1;
    } catch (error) {
      failedRows.push({ rowNumber: row.rowNumber, error: error instanceof Error ? error.message : "Erreur inconnue." });
    }
  }

  return { importedCount, failedRows };
}
