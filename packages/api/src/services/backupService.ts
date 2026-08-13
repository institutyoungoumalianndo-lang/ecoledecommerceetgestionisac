import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { prisma, type Prisma } from "@isac-erp/db";
import type { BackupSettingsDto, BackupTriggerType, DatabaseBackupDto, UpdateBackupSettingsInput } from "@isac-erp/shared";
import { logAction } from "./auditService.js";

const execFileAsync = promisify(execFile);

/**
 * Sauvegarde/restauration réelle de la base PostgreSQL (MODULE-11 §1.1) — `pg_dump`/`pg_restore` en
 * ligne de commande, jamais une réimplémentation table par table : ces utilitaires sont déjà présents
 * à côté du serveur PostgreSQL lui-même (installation native, ADR-010). S'exécute côté `packages/api`
 * (serveur persistant du campus, ADR-007), jamais côté client Electron.
 */

const RESTORE_CONFIRMATION_PHRASE = "RESTAURER";

let cachedPgBinDir: string | null | undefined;

/**
 * Résout le chemin de `pg_dump`/`pg_restore` — sur le serveur Linux dédié du campus (ADR-007), ces
 * utilitaires sont sur le `PATH` (nom seul suffit). Sur un poste de développement Windows, l'installeur
 * PostgreSQL n'ajoute pas toujours `bin` au `PATH` : on détecte alors le dossier d'installation le plus
 * récent sous `C:\Program Files\PostgreSQL\<version>\bin`. `PG_BIN_DIR` permet de forcer un chemin.
 */
async function resolvePgBinaryPath(binaryName: "pg_dump" | "pg_restore"): Promise<string> {
  if (process.env.PG_BIN_DIR) return path.join(process.env.PG_BIN_DIR, `${binaryName}${process.platform === "win32" ? ".exe" : ""}`);
  if (process.platform !== "win32") return binaryName;

  if (cachedPgBinDir === undefined) {
    cachedPgBinDir = null;
    const root = "C:\\Program Files\\PostgreSQL";
    try {
      const versions = (await readdir(root, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) => Number(b) - Number(a));
      for (const version of versions) {
        const binDir = path.join(root, version, "bin");
        if (existsSync(path.join(binDir, "pg_dump.exe"))) {
          cachedPgBinDir = binDir;
          break;
        }
      }
    } catch {
      cachedPgBinDir = null;
    }
  }

  return cachedPgBinDir ? path.join(cachedPgBinDir, `${binaryName}.exe`) : binaryName;
}

function defaultBackupDirectory(): string {
  return path.resolve(process.cwd(), "backups");
}

async function resolveBackupDirectory(): Promise<string> {
  const settings = await getOrCreateBackupSettingsRow();
  const dir = settings.storageDirectory ?? defaultBackupDirectory();
  await mkdir(dir, { recursive: true });
  return dir;
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL introuvable — impossible de sauvegarder/restaurer sans connexion à la base configurée.");
  return url;
}

/**
 * `DATABASE_URL` porte `?schema=...`, une convention Prisma — `pg_dump`/`pg_restore` (libpq) ne
 * reconnaissent pas ce paramètre de requête et rejettent la chaîne de connexion entière si on la leur
 * transmet telle quelle. Un seul schéma (`public`) est utilisé dans tout le projet, donc le retirer
 * ne change pas ce qui est sauvegardé/restauré.
 */
function toPgToolsConnectionString(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete("schema");
  return parsed.toString();
}

async function getOrCreateBackupSettingsRow() {
  const existing = await prisma.backupSettings.findFirst();
  if (existing) return existing;
  return prisma.backupSettings.create({ data: {} });
}

function toSettingsDto(row: Prisma.BackupSettingsGetPayload<Record<string, never>>): BackupSettingsDto {
  return {
    isScheduleEnabled: row.isScheduleEnabled,
    scheduleHour: row.scheduleHour,
    retentionCount: row.retentionCount,
    storageDirectory: row.storageDirectory,
  };
}

export async function getBackupSettings(): Promise<BackupSettingsDto> {
  return toSettingsDto(await getOrCreateBackupSettingsRow());
}

export async function updateBackupSettings(input: UpdateBackupSettingsInput): Promise<BackupSettingsDto> {
  const row = await getOrCreateBackupSettingsRow();
  const updated = await prisma.backupSettings.update({ where: { id: row.id }, data: input });
  return toSettingsDto(updated);
}

function toBackupDto(row: Prisma.DatabaseBackupGetPayload<{ include: { createdByUser: true } }>): DatabaseBackupDto {
  return {
    id: row.id,
    fileName: row.fileName,
    fileSizeBytes: row.fileSizeBytes,
    triggerType: row.triggerType,
    status: row.status,
    errorMessage: row.errorMessage,
    createdByName: row.createdByUser ? `${row.createdByUser.firstName} ${row.createdByUser.lastName}` : null,
    createdAt: row.createdAt,
  };
}

export async function listBackups(): Promise<DatabaseBackupDto[]> {
  const rows = await prisma.databaseBackup.findMany({
    include: { createdByUser: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(toBackupDto);
}

/**
 * Purge les sauvegardes les plus anciennes au-delà de `retentionCount` (fichier + ligne), en ne
 * comptant que les sauvegardes réussies — une sauvegarde échouée n'occupe pas de place utile.
 */
async function enforceRetention(retentionCount: number): Promise<void> {
  const successful = await prisma.databaseBackup.findMany({
    where: { status: "REUSSIE" },
    orderBy: { createdAt: "desc" },
  });
  const toDelete = successful.slice(retentionCount);
  for (const backup of toDelete) {
    await unlink(backup.filePath).catch(() => {});
    await prisma.databaseBackup.delete({ where: { id: backup.id } });
  }
}

async function runBackup(triggerType: BackupTriggerType, createdBy: string | null): Promise<DatabaseBackupDto> {
  const dir = await resolveBackupDirectory();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `isac-erp-${timestamp}.dump`;
  const filePath = path.join(dir, fileName);

  const backup = await prisma.databaseBackup.create({
    data: { fileName, filePath, triggerType, status: "EN_COURS", createdBy },
    include: { createdByUser: true },
  });

  try {
    const pgDump = await resolvePgBinaryPath("pg_dump");
    await execFileAsync(pgDump, ["--format=custom", `--file=${filePath}`, toPgToolsConnectionString(requireDatabaseUrl())]);
    const stats = await stat(filePath);
    const updated = await prisma.databaseBackup.update({
      where: { id: backup.id },
      data: { status: "REUSSIE", fileSizeBytes: stats.size },
      include: { createdByUser: true },
    });

    const settings = await getOrCreateBackupSettingsRow();
    await enforceRetention(settings.retentionCount);

    return toBackupDto(updated);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Échec inconnu";
    const updated = await prisma.databaseBackup.update({
      where: { id: backup.id },
      data: { status: "ECHOUEE", errorMessage },
      include: { createdByUser: true },
    });
    return toBackupDto(updated);
  }
}

export async function triggerManualBackup(userId: string): Promise<DatabaseBackupDto> {
  const result = await runBackup("MANUELLE", userId);
  await logAction({
    userId,
    action: "DATABASE_BACKUP_MANUAL",
    module: "SAUVEGARDE_BDD",
    entityType: "DatabaseBackup",
    entityId: result.id,
    result: result.status === "REUSSIE" ? "SUCCES" : "ECHEC",
    details: { fileName: result.fileName },
  });
  return result;
}

async function runScheduledBackup(): Promise<void> {
  const result = await runBackup("PLANIFIEE", null);
  await logAction({
    action: "DATABASE_BACKUP_SCHEDULED",
    module: "SAUVEGARDE_BDD",
    entityType: "DatabaseBackup",
    entityId: result.id,
    result: result.status === "REUSSIE" ? "SUCCES" : "ECHEC",
    details: { fileName: result.fileName },
  });
}

/**
 * Restauration — double confirmation (MODULE-11 §1.1) : `confirmationPhrase` doit correspondre
 * exactement au texte imposé, en plus de la permission `SAUVEGARDE_BDD:ADMINISTRATION` déjà vérifiée
 * par le routeur (réservée au Super Administrateur). Action irréversible, toujours journalisée avant
 * exécution (si `pg_restore` échoue après coup, la trace de la tentative reste malgré tout).
 */
export async function restoreBackup(id: string, confirmationPhrase: string, userId: string): Promise<void> {
  if (confirmationPhrase !== RESTORE_CONFIRMATION_PHRASE) {
    throw new Error(`Phrase de confirmation incorrecte — tapez exactement "${RESTORE_CONFIRMATION_PHRASE}".`);
  }

  const backup = await prisma.databaseBackup.findUniqueOrThrow({ where: { id } });
  if (backup.status !== "REUSSIE") {
    throw new Error("Seule une sauvegarde réussie peut être restaurée.");
  }

  await logAction({
    userId,
    action: "DATABASE_RESTORE",
    module: "SAUVEGARDE_BDD",
    entityType: "DatabaseBackup",
    entityId: backup.id,
    result: "SUCCES",
    details: { fileName: backup.fileName, phase: "démarrage" },
  });

  try {
    const pgRestore = await resolvePgBinaryPath("pg_restore");
    await execFileAsync(pgRestore, [
      "--clean",
      "--if-exists",
      `--dbname=${toPgToolsConnectionString(requireDatabaseUrl())}`,
      backup.filePath,
    ]);
  } catch (err) {
    await logAction({
      userId,
      action: "DATABASE_RESTORE",
      module: "SAUVEGARDE_BDD",
      entityType: "DatabaseBackup",
      entityId: backup.id,
      result: "ECHEC",
      details: { fileName: backup.fileName, error: err instanceof Error ? err.message : "Échec inconnu" },
    });
    throw new Error("La restauration a échoué — la base peut être dans un état partiel, vérifiez manuellement.");
  }
}

const CHECK_INTERVAL_MS = 60 * 60_000;

async function tick(): Promise<void> {
  try {
    const settings = await getOrCreateBackupSettingsRow();
    if (!settings.isScheduleEnabled) return;
    const now = new Date();
    if (now.getHours() !== settings.scheduleHour) return;

    const alreadyRanToday = await prisma.databaseBackup.findFirst({
      where: {
        triggerType: "PLANIFIEE",
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
    });
    if (alreadyRanToday) return;

    await runScheduledBackup();
  } catch (err) {
    console.error("Boucle de sauvegarde planifiée en échec :", err);
  }
}

/**
 * Boucle de vérification périodique (MODULE-11 §1.1) — même principe que `communicationScheduler.ts`/
 * `alertEngineService.ts` : vérifie une fois par heure si l'heure planifiée est atteinte et si aucune
 * sauvegarde planifiée n'a déjà eu lieu aujourd'hui (idempotent même si le serveur redémarre plusieurs
 * fois dans l'heure cible).
 */
export function startBackupScheduler(): void {
  setInterval(() => void tick(), CHECK_INTERVAL_MS);
}
