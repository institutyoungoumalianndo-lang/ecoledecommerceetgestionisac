-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('CELIBATAIRE', 'MARIE', 'AUTRE');

-- CreateEnum
CREATE TYPE "GuardianRelationship" AS ENUM ('PERE', 'MERE', 'TUTEUR_LEGAL', 'FRERE', 'SOEUR', 'ONCLE', 'TANTE', 'GRAND_PARENT', 'AUTRE');

-- CreateEnum
CREATE TYPE "StudentDocumentType" AS ENUM ('ACTE_NAISSANCE', 'DIPLOME', 'RELEVE', 'PHOTO', 'CARTE_IDENTITE_PASSEPORT', 'CERTIFICAT_MEDICAL', 'AUTRE');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('NOUVEAU', 'ANCIEN', 'REDOUBLANT', 'TRANSFERT', 'REPRISE');

-- CreateEnum
CREATE TYPE "EnrollmentDecision" AS ENUM ('EN_COURS', 'ADMIS', 'REDOUBLANT', 'AJOURNE', 'ABANDON');

-- CreateEnum
CREATE TYPE "NumberingResetPolicy" AS ENUM ('JAMAIS', 'ANNUEL');

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "birth_date" TIMESTAMP(3),
    "birth_place" TEXT,
    "nationality" TEXT,
    "photo_path" TEXT,
    "address" TEXT,
    "neighborhood" TEXT,
    "commune" TEXT,
    "city" TEXT,
    "prefecture" TEXT,
    "country" TEXT,
    "phone_primary" TEXT,
    "phone_secondary" TEXT,
    "email" TEXT,
    "marital_status" "MaritalStatus" NOT NULL DEFAULT 'CELIBATAIRE',
    "archived_at" TIMESTAMP(3),
    "archived_reason" TEXT,
    "archived_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "profession" TEXT,
    "employer" TEXT,
    "phone_primary" TEXT,
    "phone_secondary" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_guardians" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "guardian_id" TEXT NOT NULL,
    "relationship" "GuardianRelationship" NOT NULL,
    "relationship_other" TEXT,
    "is_primary_contact" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_documents" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "type" "StudentDocumentType" NOT NULL,
    "label" TEXT,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_enrollments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "filiere_id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'NOUVEAU',
    "decision" "EnrollmentDecision" NOT NULL DEFAULT 'EN_COURS',
    "annual_average" DECIMAL(4,2),
    "mention" TEXT,
    "enrollment_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_number_sequences" (
    "id" TEXT NOT NULL,
    "scope_key" TEXT NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_number_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_numbering_settings" (
    "id" TEXT NOT NULL,
    "template" TEXT NOT NULL DEFAULT '{FILIERE}-{COMPTEUR}-{SIGLE}-{AA}',
    "reset_policy" "NumberingResetPolicy" NOT NULL DEFAULT 'JAMAIS',
    "counter_padding" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_numbering_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_matricule_key" ON "students"("matricule");

-- CreateIndex
CREATE INDEX "students_last_name_first_name_idx" ON "students"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "students_phone_primary_idx" ON "students"("phone_primary");

-- CreateIndex
CREATE INDEX "students_email_idx" ON "students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "student_guardians_student_id_guardian_id_key" ON "student_guardians"("student_id", "guardian_id");

-- CreateIndex
CREATE INDEX "student_documents_student_id_idx" ON "student_documents"("student_id");

-- CreateIndex
CREATE INDEX "student_enrollments_academic_year_id_class_id_idx" ON "student_enrollments"("academic_year_id", "class_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_enrollments_student_id_academic_year_id_key" ON "student_enrollments"("student_id", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_number_sequences_scope_key_key" ON "student_number_sequences"("scope_key");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
