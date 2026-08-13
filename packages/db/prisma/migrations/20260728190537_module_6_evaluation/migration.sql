-- CreateEnum
CREATE TYPE "DecisionEvaluation" AS ENUM ('ADMIS', 'AJOURNE', 'REDOUBLANT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NumberingPurpose" ADD VALUE 'BULLETIN_PERIODE';
ALTER TYPE "NumberingPurpose" ADD VALUE 'BULLETIN_ANNUEL';

-- CreateTable
CREATE TABLE "evaluation_settings" (
    "id" TEXT NOT NULL,
    "poids_orale" DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    "poids_ecrite" DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    "poids_composition" DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    "seuil_admission" DECIMAL(4,2) NOT NULL DEFAULT 10.0,
    "seuil_passable" DECIMAL(4,2) NOT NULL DEFAULT 10.0,
    "seuil_assez_bien" DECIMAL(4,2) NOT NULL DEFAULT 12.0,
    "seuil_bien" DECIMAL(4,2) NOT NULL DEFAULT 14.0,
    "seuil_tres_bien" DECIMAL(4,2) NOT NULL DEFAULT 16.0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_offering_id" TEXT NOT NULL,
    "note_orale" DECIMAL(4,2),
    "note_ecrite" DECIMAL(4,2),
    "note_composition" DECIMAL(4,2),
    "note_finale" DECIMAL(4,2),
    "verrouillee" BOOLEAN NOT NULL DEFAULT false,
    "saisie_par" TEXT,
    "saisie_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulletins_periode" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "academic_period_id" TEXT NOT NULL,
    "numero_dossier" TEXT NOT NULL,
    "moyenne" DECIMAL(4,2),
    "mention" TEXT NOT NULL,
    "decision" "DecisionEvaluation" NOT NULL,
    "rang" INTEGER,
    "effectif_classe" INTEGER NOT NULL,
    "verification_code" TEXT NOT NULL,
    "annule" BOOLEAN NOT NULL DEFAULT false,
    "annule_par" TEXT,
    "annule_le" TIMESTAMP(3),
    "genere_par" TEXT,
    "genere_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulletins_periode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulletins_annuels" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "numero_dossier" TEXT NOT NULL,
    "moyenne_annuelle" DECIMAL(4,2),
    "mention" TEXT NOT NULL,
    "decision" "DecisionEvaluation" NOT NULL,
    "rang" INTEGER,
    "effectif" INTEGER NOT NULL,
    "verification_code" TEXT NOT NULL,
    "annule" BOOLEAN NOT NULL DEFAULT false,
    "annule_par" TEXT,
    "annule_le" TIMESTAMP(3),
    "genere_par" TEXT,
    "genere_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulletins_annuels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notes_student_id_idx" ON "notes"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "notes_student_id_subject_offering_id_key" ON "notes"("student_id", "subject_offering_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulletins_periode_numero_dossier_key" ON "bulletins_periode"("numero_dossier");

-- CreateIndex
CREATE INDEX "bulletins_periode_student_id_idx" ON "bulletins_periode"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulletins_periode_student_id_academic_period_id_key" ON "bulletins_periode"("student_id", "academic_period_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulletins_annuels_numero_dossier_key" ON "bulletins_annuels"("numero_dossier");

-- CreateIndex
CREATE INDEX "bulletins_annuels_student_id_idx" ON "bulletins_annuels"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "bulletins_annuels_student_id_academic_year_id_key" ON "bulletins_annuels"("student_id", "academic_year_id");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_subject_offering_id_fkey" FOREIGN KEY ("subject_offering_id") REFERENCES "subject_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_saisie_par_fkey" FOREIGN KEY ("saisie_par") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins_periode" ADD CONSTRAINT "bulletins_periode_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins_periode" ADD CONSTRAINT "bulletins_periode_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins_periode" ADD CONSTRAINT "bulletins_periode_genere_par_fkey" FOREIGN KEY ("genere_par") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins_periode" ADD CONSTRAINT "bulletins_periode_annule_par_fkey" FOREIGN KEY ("annule_par") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins_annuels" ADD CONSTRAINT "bulletins_annuels_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins_annuels" ADD CONSTRAINT "bulletins_annuels_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins_annuels" ADD CONSTRAINT "bulletins_annuels_genere_par_fkey" FOREIGN KEY ("genere_par") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins_annuels" ADD CONSTRAINT "bulletins_annuels_annule_par_fkey" FOREIGN KEY ("annule_par") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

