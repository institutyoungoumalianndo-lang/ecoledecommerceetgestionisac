-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE');

-- CreateEnum
CREATE TYPE "TeacherDocumentType" AS ENUM ('DIPLOME', 'CV', 'CONTRAT', 'EVALUATION', 'CARTE_IDENTITE_PASSEPORT', 'AUTRE');

-- AlterEnum
ALTER TYPE "NumberingPurpose" ADD VALUE 'ENSEIGNANT';

-- CreateTable
CREATE TABLE "teacher_statuses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_contract_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_contract_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
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
    "city" TEXT,
    "phone_primary" TEXT,
    "phone_secondary" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "highest_degree" TEXT,
    "academic_grade" TEXT,
    "specialty" TEXT,
    "function" TEXT,
    "hire_date" TIMESTAMP(3),
    "contract_type_id" TEXT,
    "status_id" TEXT,
    "weekly_hours_capacity" DECIMAL(5,2),
    "archived_at" TIMESTAMP(3),
    "archived_reason" TEXT,
    "archived_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_assignments" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "subject_offering_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_weekly_availabilities" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_weekly_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_leaves" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_trainings" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "institution" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "certificate_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_documents" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "type" "TeacherDocumentType" NOT NULL,
    "label" TEXT,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teacher_statuses_code_key" ON "teacher_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_contract_types_code_key" ON "teacher_contract_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_matricule_key" ON "teachers"("matricule");

-- CreateIndex
CREATE INDEX "teachers_last_name_first_name_idx" ON "teachers"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "teachers_phone_primary_idx" ON "teachers"("phone_primary");

-- CreateIndex
CREATE INDEX "teacher_assignments_teacher_id_idx" ON "teacher_assignments"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_assignments_teacher_id_subject_offering_id_class_id_key" ON "teacher_assignments"("teacher_id", "subject_offering_id", "class_id");

-- CreateIndex
CREATE INDEX "teacher_weekly_availabilities_teacher_id_idx" ON "teacher_weekly_availabilities"("teacher_id");

-- CreateIndex
CREATE INDEX "teacher_leaves_teacher_id_idx" ON "teacher_leaves"("teacher_id");

-- CreateIndex
CREATE INDEX "teacher_trainings_teacher_id_idx" ON "teacher_trainings"("teacher_id");

-- CreateIndex
CREATE INDEX "teacher_documents_teacher_id_idx" ON "teacher_documents"("teacher_id");

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_contract_type_id_fkey" FOREIGN KEY ("contract_type_id") REFERENCES "teacher_contract_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "teacher_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_subject_offering_id_fkey" FOREIGN KEY ("subject_offering_id") REFERENCES "subject_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_assignments" ADD CONSTRAINT "teacher_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_weekly_availabilities" ADD CONSTRAINT "teacher_weekly_availabilities_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_leaves" ADD CONSTRAINT "teacher_leaves_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_trainings" ADD CONSTRAINT "teacher_trainings_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_documents" ADD CONSTRAINT "teacher_documents_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_documents" ADD CONSTRAINT "teacher_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

