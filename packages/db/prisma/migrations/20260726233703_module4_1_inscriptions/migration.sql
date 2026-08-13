-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NON_PAYE', 'PARTIELLEMENT_PAYE', 'TOTALEMENT_PAYE');

-- CreateEnum
CREATE TYPE "NumberingPurpose" AS ENUM ('MATRICULE', 'INSCRIPTION');

-- DropIndex
DROP INDEX "student_number_sequences_scope_key_key";

-- AlterTable
ALTER TABLE "student_enrollments" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_by" TEXT,
ADD COLUMN     "cancelled_reason" TEXT,
ADD COLUMN     "fee_amount_expected" DECIMAL(12,2),
ADD COLUMN     "payment_status" "PaymentStatus",
ADD COLUMN     "regime_id" TEXT,
ADD COLUMN     "registration_number" TEXT;

-- AlterTable
ALTER TABLE "student_number_sequences" ADD COLUMN     "purpose" "NumberingPurpose" NOT NULL DEFAULT 'MATRICULE';

-- AlterTable
ALTER TABLE "student_numbering_settings" ADD COLUMN     "purpose" "NumberingPurpose" NOT NULL DEFAULT 'MATRICULE';

-- CreateTable
CREATE TABLE "enrollment_regimes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollment_regimes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_settings" (
    "id" TEXT NOT NULL,
    "enforce_class_capacity" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_document_requirements" (
    "id" TEXT NOT NULL,
    "document_type" "StudentDocumentType" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollment_document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_regimes_code_key" ON "enrollment_regimes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_document_requirements_document_type_key" ON "enrollment_document_requirements"("document_type");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollments_registration_number_key" ON "student_enrollments"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "student_number_sequences_purpose_scope_key_key" ON "student_number_sequences"("purpose", "scope_key");

-- CreateIndex
CREATE UNIQUE INDEX "student_numbering_settings_purpose_key" ON "student_numbering_settings"("purpose");

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_regime_id_fkey" FOREIGN KEY ("regime_id") REFERENCES "enrollment_regimes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

