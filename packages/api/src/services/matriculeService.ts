import { randomUUID } from "node:crypto";
import { prisma, type Prisma } from "@isac-erp/db";
import type {
  NumberingPurpose,
  PreviewNextMatriculeInput,
  StudentNumberingSettingsDto,
  UpdateStudentNumberingSettingsInput,
} from "@isac-erp/shared";

/**
 * Génération de numéros (matricule — MODULE-04 §1.6, numéro d'inscription —
 * MODULE-04.1 §2.3) : même moteur de gabarit + compteur atomique (verrou
 * transactionnel) pour les deux, distingués par `purpose`. Les fonctions
 * pures (rendu du gabarit, extraction des chiffres d'année) sont exportées
 * séparément pour rester testables sans base de données.
 */

export interface MatriculeTemplateVars {
  FILIERE: string;
  COMPTEUR: string;
  SIGLE: string;
  AA: string;
  AAAA: string;
}

export function renderMatriculeTemplate(template: string, vars: MatriculeTemplateVars): string {
  return template
    .replaceAll("{FILIERE}", vars.FILIERE)
    .replaceAll("{COMPTEUR}", vars.COMPTEUR)
    .replaceAll("{SIGLE}", vars.SIGLE)
    .replaceAll("{AA}", vars.AA)
    .replaceAll("{AAAA}", vars.AAAA);
}

export function padCounter(counter: number, padding: number): string {
  return padding > 0 ? String(counter).padStart(padding, "0") : String(counter);
}

/** "2026-2027" → { aa: "26", aaaa: "2026" }. Tolère un libellé sans tiret. */
export function extractYearParts(academicYearLabel: string): { aa: string; aaaa: string } {
  const startYear = academicYearLabel.split("-")[0]?.trim() ?? academicYearLabel;
  return { aa: startYear.slice(-2), aaaa: startYear };
}

/** Repli calendaire pour les purposes sans année universitaire pertinente (comptabilité — MODULE-07 §2). */
export function currentCalendarYearParts(): { aa: string; aaaa: string } {
  return extractYearParts(String(new Date().getFullYear()));
}

async function getOrCreateNumberingSettings(
  purpose: NumberingPurpose,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<StudentNumberingSettingsDto> {
  const existing = await client.studentNumberingSettings.findUnique({ where: { purpose } });
  if (existing) return existing;
  return client.studentNumberingSettings.create({ data: { purpose } });
}

async function incrementSequence(
  tx: Prisma.TransactionClient,
  purpose: NumberingPurpose,
  scopeKey: string
): Promise<number> {
  const newId = randomUUID();
  await tx.$executeRaw`
    INSERT INTO student_number_sequences (id, purpose, scope_key, last_number, updated_at)
    VALUES (${newId}, ${purpose}::"NumberingPurpose", ${scopeKey}, 0, now())
    ON CONFLICT (purpose, scope_key) DO NOTHING
  `;
  const rows = await tx.$queryRaw<{ id: string; last_number: number }[]>`
    SELECT id, last_number FROM student_number_sequences
    WHERE purpose = ${purpose}::"NumberingPurpose" AND scope_key = ${scopeKey}
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) {
    throw new Error("Impossible d'initialiser le compteur de numérotation.");
  }
  const nextNumber = row.last_number + 1;
  await tx.$executeRaw`
    UPDATE student_number_sequences SET last_number = ${nextNumber}, updated_at = now() WHERE id = ${row.id}
  `;
  return nextNumber;
}

/**
 * `filiereId`/`academicYearId` restent requis pour les purposes liés au
 * parcours étudiant (matricule, inscription, reçu) mais deviennent
 * optionnels pour les purposes sans filière/année universitaire pertinente
 * (comptabilité — MODULE-07 §2) : `FILIERE` retombe sur "GEN", l'année sur
 * l'année universitaire active si elle existe, sinon sur l'année civile.
 */
/** Exporté pour réutilisation directe par le moteur de documents officiels (MODULE-09 §1.6). */
export async function generateNumber(
  tx: Prisma.TransactionClient,
  purpose: NumberingPurpose,
  params: { filiereId?: string; academicYearId?: string }
): Promise<string> {
  const [settings, filiere, academicYear, establishment] = await Promise.all([
    getOrCreateNumberingSettings(purpose, tx),
    params.filiereId ? tx.filiere.findUniqueOrThrow({ where: { id: params.filiereId } }) : null,
    params.academicYearId
      ? tx.academicYear.findUniqueOrThrow({ where: { id: params.academicYearId } })
      : tx.academicYear.findFirst({ where: { isActive: true } }),
    tx.establishmentSettings.findFirst(),
  ]);

  const scopeKey = settings.resetPolicy === "ANNUEL" && academicYear ? academicYear.id : "GLOBAL";
  const nextNumber = await incrementSequence(tx, purpose, scopeKey);
  const { aa, aaaa } = academicYear ? extractYearParts(academicYear.label) : currentCalendarYearParts();

  return renderMatriculeTemplate(settings.template, {
    FILIERE: filiere ? filiere.code.trim().slice(0, 2).toUpperCase() : "GEN",
    COMPTEUR: padCounter(nextNumber, settings.counterPadding),
    SIGLE: establishment?.acronym ?? "",
    AA: aa,
    AAAA: aaaa,
  });
}

/** Génère le prochain matricule — à appeler dans la même transaction que la création de l'étudiant. Jamais recalculé ensuite. */
export async function generateMatricule(
  tx: Prisma.TransactionClient,
  params: { filiereId: string; academicYearId: string }
): Promise<string> {
  return generateNumber(tx, "MATRICULE", params);
}

/** Génère le prochain numéro d'inscription — à appeler dans la même transaction que la création de l'inscription. */
export async function generateRegistrationNumber(
  tx: Prisma.TransactionClient,
  params: { filiereId: string; academicYearId: string }
): Promise<string> {
  return generateNumber(tx, "INSCRIPTION", params);
}

/** Génère le prochain numéro de reçu — à appeler dans la même transaction que la création du paiement (MODULE-04.3 §2). */
export async function generateReceiptNumber(
  tx: Prisma.TransactionClient,
  params: { filiereId: string; academicYearId: string }
): Promise<string> {
  return generateNumber(tx, "RECU_PAIEMENT", params);
}

/** Génère le prochain numéro d'écriture comptable — aucune filière/année universitaire pertinente (MODULE-07 §2). */
export async function generateJournalEntryNumber(tx: Prisma.TransactionClient): Promise<string> {
  return generateNumber(tx, "ECRITURE_COMPTABLE", {});
}

/** Génère le prochain numéro de dépense — aucune filière/année universitaire pertinente (MODULE-07 §2). */
export async function generateExpenseNumber(tx: Prisma.TransactionClient): Promise<string> {
  return generateNumber(tx, "DEPENSE", {});
}

/** Génère le prochain matricule enseignant — aucune filière/année universitaire pertinente (MODULE-05 §2). */
export async function generateTeacherNumber(tx: Prisma.TransactionClient): Promise<string> {
  return generateNumber(tx, "ENSEIGNANT", {});
}

/** Génère le prochain matricule employé — aucune filière/année universitaire pertinente (MODULE-08 §2). */
export async function generateEmployeeNumber(tx: Prisma.TransactionClient): Promise<string> {
  return generateNumber(tx, "EMPLOYE", {});
}

/** Génère le prochain numéro de dossier de bulletin de période (MODULE-06 §1.7). */
export async function generateBulletinPeriodeNumber(tx: Prisma.TransactionClient): Promise<string> {
  return generateNumber(tx, "BULLETIN_PERIODE", {});
}

/** Génère le prochain numéro de dossier de bulletin annuel (MODULE-06 §1.8). */
export async function generateBulletinAnnuelNumber(tx: Prisma.TransactionClient): Promise<string> {
  return generateNumber(tx, "BULLETIN_ANNUEL", {});
}

/** Génère le prochain numéro d'inventaire — aucune filière/année universitaire pertinente (MODULE-14 §1.1). */
export async function generateAssetInventoryNumber(tx: Prisma.TransactionClient): Promise<string> {
  return generateNumber(tx, "BIEN_INVENTAIRE", {});
}

export async function getNumberingSettings(purpose: NumberingPurpose): Promise<StudentNumberingSettingsDto> {
  return getOrCreateNumberingSettings(purpose);
}

export async function updateNumberingSettings(
  input: UpdateStudentNumberingSettingsInput
): Promise<StudentNumberingSettingsDto> {
  const existing = await getOrCreateNumberingSettings(input.purpose);
  return prisma.studentNumberingSettings.update({
    where: { id: existing.id },
    data: {
      template: input.template,
      resetPolicy: input.resetPolicy,
      counterPadding: input.counterPadding,
    },
  });
}

/** Aperçu non destructif — ne consomme pas le compteur. */
export async function previewNextNumber(input: PreviewNextMatriculeInput): Promise<string> {
  const [activeYear, establishment, filiere] = await Promise.all([
    prisma.academicYear.findFirst({ where: { isActive: true } }),
    prisma.establishmentSettings.findFirst(),
    input.filiereId ? prisma.filiere.findUnique({ where: { id: input.filiereId } }) : null,
  ]);

  const settings = await getOrCreateNumberingSettings(input.purpose);
  const scopeKey = settings.resetPolicy === "ANNUEL" && activeYear ? activeYear.id : "GLOBAL";
  const sequence = await prisma.studentNumberSequence.findUnique({
    where: { purpose_scopeKey: { purpose: input.purpose, scopeKey } },
  });
  const nextNumber = (sequence?.lastNumber ?? 0) + 1;
  const { aa, aaaa } = extractYearParts(activeYear?.label ?? new Date().getFullYear().toString());

  return renderMatriculeTemplate(input.template, {
    FILIERE: (filiere?.code ?? "XX").trim().slice(0, 2).toUpperCase(),
    COMPTEUR: padCounter(nextNumber, input.counterPadding),
    SIGLE: establishment?.acronym ?? "",
    AA: aa,
    AAAA: aaaa,
  });
}
