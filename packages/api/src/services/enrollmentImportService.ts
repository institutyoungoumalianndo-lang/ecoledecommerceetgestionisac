import { prisma } from "@isac-erp/db";
import type {
  EnrollmentImportRowData,
  EnrollmentImportRowResult,
  EnrollmentStatus,
  ExecuteEnrollmentImportInput,
  ExecuteEnrollmentImportOutput,
  ValidateEnrollmentImportInput,
  ValidateEnrollmentImportOutput,
} from "@isac-erp/shared";
import { checkEnrollmentConditions, createEnrollment } from "./enrollmentService.js";

export function normalizeStatus(raw: string | null | undefined): EnrollmentStatus {
  if (!raw) return "ANCIEN";
  const v = raw.trim().toUpperCase();
  if (v.startsWith("NOUV")) return "NOUVEAU";
  if (v.startsWith("REDOUB")) return "REDOUBLANT";
  if (v.startsWith("TRANSF")) return "TRANSFERT";
  if (v.startsWith("REPRI")) return "REPRISE";
  return "ANCIEN";
}

/**
 * Import en masse d'inscriptions/réinscriptions (MODULE-04.1 §5.11/§3.10) —
 * mêmes deux temps que l'import d'étudiants du Module 4 : validation puis
 * exécution ligne par ligne, une ligne en échec n'annule pas les autres.
 * Contrairement à l'import d'étudiants, les lignes référencent des
 * étudiants déjà existants (recherchés par matricule).
 */
export async function validateEnrollmentImport(
  input: ValidateEnrollmentImportInput
): Promise<ValidateEnrollmentImportOutput> {
  const targetClass = await prisma.class.findUniqueOrThrow({ where: { id: input.targetClassId } });

  const classCache = new Map<string, { id: string } | null>();
  async function resolveClass(code: string) {
    if (!classCache.has(code)) {
      const found = await prisma.class.findFirst({ where: { code, academicYearId: targetClass.academicYearId } });
      classCache.set(code, found ? { id: found.id } : null);
    }
    return classCache.get(code) ?? null;
  }

  const regimeCache = new Map<string, { id: string } | null>();
  async function resolveRegime(code: string) {
    if (!regimeCache.has(code)) {
      const found = await prisma.enrollmentRegime.findUnique({ where: { code } });
      regimeCache.set(code, found ? { id: found.id } : null);
    }
    return regimeCache.get(code) ?? null;
  }

  const seenMatricules = new Set<string>();
  const results: EnrollmentImportRowResult[] = [];

  for (const row of input.rows) {
    const errors: string[] = [];
    const duplicateWarnings: string[] = [];
    const matricule = row.matricule.trim();

    if (!matricule) {
      errors.push("Matricule manquant.");
    }
    if (matricule && seenMatricules.has(matricule)) {
      duplicateWarnings.push("Matricule répété plusieurs fois dans le même fichier.");
    }
    if (matricule) seenMatricules.add(matricule);

    const student = matricule ? await prisma.student.findUnique({ where: { matricule } }) : null;
    if (matricule && !student) {
      errors.push(`Aucun étudiant trouvé avec le matricule "${matricule}".`);
    }
    if (student?.archivedAt) {
      errors.push("Cet étudiant est archivé.");
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

    let regimeId: string | null = null;
    if (row.regimeCode?.trim()) {
      const resolved = await resolveRegime(row.regimeCode.trim());
      if (!resolved) {
        errors.push(`Régime "${row.regimeCode}" introuvable.`);
      } else {
        regimeId = resolved.id;
      }
    }

    if (student && errors.length === 0) {
      const conditions = await checkEnrollmentConditions({ studentId: student.id, classId });
      if (conditions.alreadyEnrolledThisYear) {
        errors.push("Cet étudiant est déjà inscrit pour cette année universitaire.");
      }
      if (conditions.capacityReached) {
        errors.push("La classe cible a atteint sa capacité maximale.");
      }
      if (conditions.missingRequiredDocumentTypes.length > 0) {
        duplicateWarnings.push("Documents obligatoires manquants au dossier de cet étudiant.");
      }
    }

    const isValid = errors.length === 0;
    const data: EnrollmentImportRowData | null =
      isValid && student
        ? { studentId: student.id, classId, regimeId, status: normalizeStatus(row.status) }
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

export async function executeEnrollmentImport(
  input: ExecuteEnrollmentImportInput
): Promise<ExecuteEnrollmentImportOutput> {
  let importedCount = 0;
  const failedRows: { rowNumber: number; error: string }[] = [];

  for (const row of input.rows) {
    try {
      await createEnrollment({
        studentId: row.data.studentId,
        classId: row.data.classId,
        regimeId: row.data.regimeId ?? undefined,
        status: row.data.status,
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
