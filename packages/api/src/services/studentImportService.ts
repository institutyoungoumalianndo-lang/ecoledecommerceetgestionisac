import { prisma } from "@isac-erp/db";
import type {
  ExecuteStudentImportInput,
  ExecuteStudentImportOutput,
  Gender,
  MaritalStatus,
  StudentImportRowData,
  StudentImportRowResult,
  ValidateStudentImportInput,
  ValidateStudentImportOutput,
} from "@isac-erp/shared";
import { checkStudentDuplicates, createStudent } from "./studentService.js";

export function normalizeGender(raw: string): Gender | null {
  const v = raw.trim().toUpperCase();
  if (["M", "MASCULIN", "HOMME"].includes(v)) return "M";
  if (["F", "FEMININ", "FÉMININ", "FEMME"].includes(v)) return "F";
  return null;
}

export function normalizeMaritalStatus(raw: string | null | undefined): MaritalStatus {
  if (!raw) return "CELIBATAIRE";
  const v = raw.trim().toUpperCase();
  if (v.startsWith("CELIB") || v.startsWith("CÉLIB")) return "CELIBATAIRE";
  if (v.startsWith("MARI")) return "MARIE";
  return "AUTRE";
}

/**
 * Assistant d'import (MODULE-04 §3.8) : validation en deux temps —
 * résolution/normalisation des champs, doublons détectés en base ET entre
 * lignes du même fichier — avant toute écriture. `execute` n'insère que les
 * lignes déjà validées, une par une (une ligne en échec n'annule pas les autres).
 */
export async function validateStudentImport(
  input: ValidateStudentImportInput
): Promise<ValidateStudentImportOutput> {
  const targetClass = await prisma.class.findUniqueOrThrow({ where: { id: input.targetClassId } });

  const classCache = new Map<string, { id: string; filiereId: string; levelId: string } | null>();
  async function resolveClass(code: string) {
    if (!classCache.has(code)) {
      const found = await prisma.class.findFirst({
        where: { code, academicYearId: targetClass.academicYearId },
      });
      classCache.set(
        code,
        found ? { id: found.id, filiereId: found.filiereId, levelId: found.levelId } : null
      );
    }
    return classCache.get(code) ?? null;
  }

  const seenInBatch: { lastName: string; firstName: string; phone: string | null; email: string | null }[] = [];
  const results: StudentImportRowResult[] = [];

  for (const row of input.rows) {
    const errors: string[] = [];
    const duplicateWarnings: string[] = [];

    const lastName = row.lastName.trim();
    const firstName = row.firstName.trim();
    if (!lastName) errors.push("Nom manquant.");
    if (!firstName) errors.push("Prénom manquant.");

    const gender = normalizeGender(row.gender ?? "");
    if (!gender) errors.push("Sexe invalide (attendu M ou F).");

    let birthDate: Date | null = null;
    if (row.birthDate) {
      const parsed = new Date(row.birthDate);
      if (Number.isNaN(parsed.getTime())) {
        errors.push("Date de naissance invalide.");
      } else {
        birthDate = parsed;
      }
    }

    let classId = targetClass.id;
    if (row.classCode?.trim()) {
      const resolved = await resolveClass(row.classCode.trim());
      if (!resolved) {
        errors.push(`Classe "${row.classCode}" introuvable pour l'année sélectionnée.`);
      } else {
        classId = resolved.id;
      }
    }

    if (lastName && firstName) {
      const dbMatches = await checkStudentDuplicates({
        lastName,
        firstName,
        birthDate,
        phonePrimary: row.phonePrimary ?? undefined,
        email: row.email ?? undefined,
      });
      if (dbMatches.length > 0) {
        duplicateWarnings.push(
          `Correspond potentiellement à un étudiant existant (${dbMatches.map((m) => m.matricule).join(", ")}).`
        );
      }
    }

    const dupInBatch = seenInBatch.some(
      (s) =>
        (row.phonePrimary && s.phone === row.phonePrimary) ||
        (row.email && s.email?.toLowerCase() === row.email?.toLowerCase()) ||
        (s.lastName.toLowerCase() === lastName.toLowerCase() && s.firstName.toLowerCase() === firstName.toLowerCase())
    );
    if (dupInBatch) {
      duplicateWarnings.push("Ligne similaire à une autre ligne du même fichier.");
    }
    seenInBatch.push({ lastName, firstName, phone: row.phonePrimary ?? null, email: row.email ?? null });

    const isValid = errors.length === 0;
    const data: StudentImportRowData | null = isValid
      ? {
          lastName,
          firstName,
          gender: gender as Gender,
          birthDate,
          birthPlace: row.birthPlace ?? null,
          nationality: row.nationality ?? null,
          phonePrimary: row.phonePrimary ?? null,
          phoneSecondary: row.phoneSecondary ?? null,
          email: row.email ?? null,
          maritalStatus: normalizeMaritalStatus(row.maritalStatus),
          classId,
        }
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

export async function executeStudentImport(
  input: ExecuteStudentImportInput
): Promise<ExecuteStudentImportOutput> {
  let importedCount = 0;
  const failedRows: { rowNumber: number; error: string }[] = [];

  for (const row of input.rows) {
    try {
      await createStudent({
        lastName: row.data.lastName,
        firstName: row.data.firstName,
        gender: row.data.gender,
        birthDate: row.data.birthDate,
        birthPlace: row.data.birthPlace,
        nationality: row.data.nationality,
        phonePrimary: row.data.phonePrimary,
        phoneSecondary: row.data.phoneSecondary,
        email: row.data.email,
        maritalStatus: row.data.maritalStatus,
        classId: row.data.classId,
      });
      importedCount += 1;
    } catch (error) {
      failedRows.push({
        rowNumber: row.rowNumber,
        error: error instanceof Error ? error.message : "Erreur inconnue.",
      });
    }
  }

  return { importedCount, failedRows };
}
