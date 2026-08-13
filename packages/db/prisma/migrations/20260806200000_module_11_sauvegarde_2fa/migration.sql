-- Module 11 — Sauvegarde, Sécurité avancée, Audit (voir docs/modules/MODULE-11-sauvegarde-securite.md).
-- Le journal d'audit (audit_log, Module 1) est déjà systématique — aucun changement ici.

-- AlterTable : double authentification (2FA TOTP)
ALTER TABLE "users" ADD COLUMN "totp_secret" TEXT,
                     ADD COLUMN "totp_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable : politique de mot de passe renforcée (configurable, remplace la règle fixe)
ALTER TABLE "security_settings" ADD COLUMN "password_min_length" INTEGER NOT NULL DEFAULT 8,
                                 ADD COLUMN "password_require_uppercase" BOOLEAN NOT NULL DEFAULT true,
                                 ADD COLUMN "password_require_number" BOOLEAN NOT NULL DEFAULT true,
                                 ADD COLUMN "password_require_symbol" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "BackupTriggerType" AS ENUM ('PLANIFIEE', 'MANUELLE');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('EN_COURS', 'REUSSIE', 'ECHOUEE');

-- CreateTable
CREATE TABLE "database_backups" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL DEFAULT 0,
    "trigger_type" "BackupTriggerType" NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'EN_COURS',
    "error_message" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "database_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_settings" (
    "id" TEXT NOT NULL,
    "is_schedule_enabled" BOOLEAN NOT NULL DEFAULT true,
    "schedule_hour" INTEGER NOT NULL DEFAULT 2,
    "retention_count" INTEGER NOT NULL DEFAULT 14,
    "storage_directory" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_backup_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "database_backups_status_created_at_idx" ON "database_backups"("status", "created_at");

-- CreateIndex
CREATE INDEX "two_factor_backup_codes_user_id_idx" ON "two_factor_backup_codes"("user_id");

-- AddForeignKey
ALTER TABLE "database_backups" ADD CONSTRAINT "database_backups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factor_backup_codes" ADD CONSTRAINT "two_factor_backup_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
