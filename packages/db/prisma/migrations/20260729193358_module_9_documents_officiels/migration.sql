-- CreateEnum
CREATE TYPE "PaperFormat" AS ENUM ('A4', 'LETTRE');

-- CreateEnum
CREATE TYPE "PageOrientation" AS ENUM ('PORTRAIT', 'PAYSAGE');

-- CreateEnum
CREATE TYPE "HeaderAlignment" AS ENUM ('LEFT', 'CENTER', 'RIGHT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'CERTIFICAT_SCOLARITE';
ALTER TYPE "DocumentType" ADD VALUE 'ATTESTATION_INSCRIPTION';
ALTER TYPE "DocumentType" ADD VALUE 'ATTESTATION_TRAVAIL';
ALTER TYPE "DocumentType" ADD VALUE 'LISTE_ETUDIANTS';
ALTER TYPE "DocumentType" ADD VALUE 'LISTE_ENSEIGNANTS';
ALTER TYPE "DocumentType" ADD VALUE 'LISTE_CLASSES';
ALTER TYPE "DocumentType" ADD VALUE 'FICHE_EMARGEMENT';
ALTER TYPE "DocumentType" ADD VALUE 'EMPLOI_DU_TEMPS';
ALTER TYPE "DocumentType" ADD VALUE 'HISTORIQUE_PAIEMENTS';
ALTER TYPE "DocumentType" ADD VALUE 'CARTE_PAIEMENT';
ALTER TYPE "DocumentType" ADD VALUE 'ATTESTATION_FREQUENTATION';
ALTER TYPE "DocumentType" ADD VALUE 'ATTESTATION_REUSSITE';
ALTER TYPE "DocumentType" ADD VALUE 'ATTESTATION_STAGE';
ALTER TYPE "DocumentType" ADD VALUE 'ATTESTATION_SALAIRE';
ALTER TYPE "DocumentType" ADD VALUE 'CONTRAT_TRAVAIL';
ALTER TYPE "DocumentType" ADD VALUE 'DECISION_AFFECTATION';
ALTER TYPE "DocumentType" ADD VALUE 'RECU_PAIEMENT';
ALTER TYPE "DocumentType" ADD VALUE 'BULLETIN_SALAIRE';
ALTER TYPE "DocumentType" ADD VALUE 'BULLETIN_NOTES';
ALTER TYPE "DocumentType" ADD VALUE 'RELEVE_NOTES';
ALTER TYPE "DocumentType" ADD VALUE 'RAPPORT_CAISSE';
ALTER TYPE "DocumentType" ADD VALUE 'RAPPORT_FINANCIER';
ALTER TYPE "DocumentType" ADD VALUE 'PROCES_VERBAL';
ALTER TYPE "DocumentType" ADD VALUE 'RAPPORT_STATISTIQUE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NumberingPurpose" ADD VALUE 'CERTIFICAT_SCOLARITE';
ALTER TYPE "NumberingPurpose" ADD VALUE 'ATTESTATION_INSCRIPTION';
ALTER TYPE "NumberingPurpose" ADD VALUE 'CARTE_ETUDIANT';
ALTER TYPE "NumberingPurpose" ADD VALUE 'ATTESTATION_TRAVAIL';
ALTER TYPE "NumberingPurpose" ADD VALUE 'LISTE_ETUDIANTS';
ALTER TYPE "NumberingPurpose" ADD VALUE 'LISTE_ENSEIGNANTS';
ALTER TYPE "NumberingPurpose" ADD VALUE 'LISTE_CLASSES';
ALTER TYPE "NumberingPurpose" ADD VALUE 'FICHE_EMARGEMENT';
ALTER TYPE "NumberingPurpose" ADD VALUE 'EMPLOI_DU_TEMPS';
ALTER TYPE "NumberingPurpose" ADD VALUE 'HISTORIQUE_PAIEMENTS';

-- AlterTable
ALTER TABLE "campus_settings" ADD COLUMN     "logo_path" TEXT;

-- AlterTable
ALTER TABLE "document_templates" ADD COLUMN     "allow_double_exemplaire" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "secondary_copy_label" TEXT,
ADD COLUMN     "show_campus_logo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_qr_code" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "print_theme_settings" ADD COLUMN     "border_width_pt" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "footer_color" TEXT NOT NULL DEFAULT '#4B5563',
ADD COLUMN     "margin_mm" DOUBLE PRECISION NOT NULL DEFAULT 15,
ADD COLUMN     "orientation" "PageOrientation" NOT NULL DEFAULT 'PORTRAIT',
ADD COLUMN     "paper_format" "PaperFormat" NOT NULL DEFAULT 'A4';

-- CreateTable
CREATE TABLE "institutional_header_settings" (
    "id" TEXT NOT NULL,
    "republic_line" TEXT NOT NULL DEFAULT 'RÉPUBLIQUE DE GUINÉE',
    "republic_color" TEXT NOT NULL DEFAULT '#000000',
    "motto_part_1" TEXT NOT NULL DEFAULT 'Travail',
    "motto_part_1_color" TEXT NOT NULL DEFAULT '#CE1126',
    "motto_part_2" TEXT NOT NULL DEFAULT 'Justice',
    "motto_part_2_color" TEXT NOT NULL DEFAULT '#FCD116',
    "motto_part_3" TEXT NOT NULL DEFAULT 'Solidarité',
    "motto_part_3_color" TEXT NOT NULL DEFAULT '#009460',
    "school_name_line" TEXT NOT NULL DEFAULT 'ÉCOLE DE COMMERCE ET DE GESTION ISAC',
    "school_name_color" TEXT NOT NULL DEFAULT '#1E3A8A',
    "school_name_bold" BOOLEAN NOT NULL DEFAULT true,
    "school_name_font_size" INTEGER NOT NULL DEFAULT 14,
    "institute_name_line" TEXT NOT NULL DEFAULT 'INSTITUT YOUNGOU MALIANNDO (I.Y.M.A.)',
    "institute_name_color" TEXT NOT NULL DEFAULT '#7F1D1D',
    "tagline_line" TEXT NOT NULL DEFAULT '« Votre avenir commence ici »',
    "tagline_color" TEXT NOT NULL DEFAULT '#6B7280',
    "tagline_italic" BOOLEAN NOT NULL DEFAULT true,
    "font_family" TEXT NOT NULL DEFAULT 'Helvetica',
    "line_spacing" DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    "alignment" "HeaderAlignment" NOT NULL DEFAULT 'CENTER',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutional_header_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "document_number" TEXT NOT NULL,
    "related_entity_type" TEXT,
    "related_entity_id" TEXT,
    "file_path" TEXT NOT NULL,
    "qr_payload" TEXT,
    "double_exemplaire" BOOLEAN NOT NULL DEFAULT false,
    "generated_by_user_id" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "generated_documents_document_number_key" ON "generated_documents"("document_number");

-- CreateIndex
CREATE INDEX "generated_documents_related_entity_type_related_entity_id_idx" ON "generated_documents"("related_entity_type", "related_entity_id");

-- CreateIndex
CREATE INDEX "generated_documents_document_type_idx" ON "generated_documents"("document_type");

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_generated_by_user_id_fkey" FOREIGN KEY ("generated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

