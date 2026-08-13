/*
  Warnings:

  - You are about to drop the `establishment_display` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SignatoryRole" AS ENUM ('DIRECTEUR_GENERAL', 'DIRECTEUR_CAMPUS', 'DIRECTEUR_ETUDES', 'COMPTABLE', 'RESPONSABLE_ADMINISTRATIF');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CARTE_ETUDIANT', 'ATTESTATION', 'CERTIFICAT', 'BULLETIN', 'RECU', 'FACTURE', 'DIPLOME', 'CONVOCATION', 'DECISION');

-- DropTable
DROP TABLE "establishment_display";

-- CreateTable
CREATE TABLE "establishment_settings" (
    "id" TEXT NOT NULL,
    "official_name" TEXT NOT NULL,
    "acronym" TEXT,
    "motto" TEXT,
    "slogan" TEXT,
    "address" TEXT,
    "city" TEXT,
    "prefecture" TEXT,
    "region" TEXT,
    "country" TEXT,
    "phones" TEXT[],
    "primary_email" TEXT,
    "secondary_email" TEXT,
    "website" TEXT,
    "logo_primary_path" TEXT,
    "logo_secondary_path" TEXT,
    "ministry_logo_path" TEXT,
    "favicon_path" TEXT,
    "authorization_number" TEXT,
    "tax_number" TEXT,
    "rccm_number" TEXT,
    "administrative_references" TEXT,
    "legal_mentions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "establishment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_settings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "phones" TEXT[],
    "email" TEXT,
    "gps_latitude" DOUBLE PRECISION,
    "gps_longitude" DOUBLE PRECISION,
    "manager_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campus_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_signatories" (
    "id" TEXT NOT NULL,
    "role_code" "SignatoryRole" NOT NULL,
    "display_name" TEXT,
    "title" TEXT,
    "signature_image_path" TEXT,
    "linked_user_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_signatories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "official_stamp" (
    "id" TEXT NOT NULL,
    "image_path" TEXT,
    "width_mm" DOUBLE PRECISION,
    "height_mm" DOUBLE PRECISION,
    "position_x_mm" DOUBLE PRECISION,
    "position_y_mm" DOUBLE PRECISION,
    "applicable_document_types" "DocumentType"[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "official_stamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "closed_at" TIMESTAMP(3),
    "reopened_at" TIMESTAMP(3),
    "reopened_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_periods" (
    "id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filieres" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "responsable_user_id" TEXT,
    "duration" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levels" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filiere_id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "max_capacity" INTEGER,
    "main_room" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_settings" (
    "id" TEXT NOT NULL,
    "currency_code" TEXT NOT NULL DEFAULT 'GNF',
    "amount_format" TEXT,
    "thousands_separator" TEXT NOT NULL DEFAULT ' ',
    "decimal_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regional_settings" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Conakry',
    "date_format" TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
    "time_format" TEXT NOT NULL DEFAULT 'HH:mm',
    "first_day_of_week" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regional_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theme_settings" (
    "id" TEXT NOT NULL,
    "primary_color" TEXT,
    "secondary_color" TEXT,
    "button_color" TEXT,
    "menu_color" TEXT,
    "font_family" TEXT,
    "login_image_path" TEXT,
    "background_image_path" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theme_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "show_logo_primary" BOOLEAN NOT NULL DEFAULT true,
    "show_logo_secondary" BOOLEAN NOT NULL DEFAULT false,
    "show_stamp" BOOLEAN NOT NULL DEFAULT true,
    "signatory_role_code" "SignatoryRole",
    "custom_footer_text" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_signatories_role_code_key" ON "document_signatories"("role_code");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_label_key" ON "academic_years"("label");

-- CreateIndex
CREATE UNIQUE INDEX "academic_periods_academic_year_id_code_key" ON "academic_periods"("academic_year_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "filieres_code_key" ON "filieres"("code");

-- CreateIndex
CREATE UNIQUE INDEX "levels_code_key" ON "levels"("code");

-- CreateIndex
CREATE UNIQUE INDEX "classes_code_academic_year_id_key" ON "classes"("code", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_templates_document_type_key" ON "document_templates"("document_type");

-- AddForeignKey
ALTER TABLE "campus_settings" ADD CONSTRAINT "campus_settings_manager_user_id_fkey" FOREIGN KEY ("manager_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatories" ADD CONSTRAINT "document_signatories_linked_user_id_fkey" FOREIGN KEY ("linked_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_reopened_by_fkey" FOREIGN KEY ("reopened_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_periods" ADD CONSTRAINT "academic_periods_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filieres" ADD CONSTRAINT "filieres_responsable_user_id_fkey" FOREIGN KEY ("responsable_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_signatory_role_code_fkey" FOREIGN KEY ("signatory_role_code") REFERENCES "document_signatories"("role_code") ON DELETE SET NULL ON UPDATE CASCADE;
