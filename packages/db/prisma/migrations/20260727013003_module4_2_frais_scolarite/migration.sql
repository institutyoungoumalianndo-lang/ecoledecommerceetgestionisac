-- CreateEnum
CREATE TYPE "LatePenaltyType" AS ENUM ('AUCUNE', 'MONTANT_FIXE', 'POURCENTAGE');

-- CreateEnum
CREATE TYPE "FeeReductionType" AS ENUM ('BOURSE', 'REMISE', 'EXONERATION_PARTIELLE', 'EXONERATION_TOTALE', 'EXCEPTIONNELLE');

-- CreateEnum
CREATE TYPE "FeeReductionValueMode" AS ENUM ('MONTANT', 'POURCENTAGE');

-- CreateTable
CREATE TABLE "fee_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_tariffs" (
    "id" TEXT NOT NULL,
    "fee_type_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "filiere_id" TEXT,
    "level_id" TEXT,
    "class_id" TEXT,
    "target_enrollment_status" "EnrollmentStatus",
    "amount" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_tariffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_installment_plans" (
    "id" TEXT NOT NULL,
    "fee_tariff_id" TEXT NOT NULL,
    "installment_count" INTEGER NOT NULL,
    "late_penalty_type" "LatePenaltyType" NOT NULL DEFAULT 'AUCUNE',
    "late_penalty_value" DECIMAL(12,2),
    "grace_period_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_installment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_installments" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "label" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_reductions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "fee_type_id" TEXT,
    "academic_year_id" TEXT NOT NULL,
    "type" "FeeReductionType" NOT NULL,
    "value_mode" "FeeReductionValueMode" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "granted_by_authority" TEXT NOT NULL,
    "recorded_by" TEXT,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_reductions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fee_types_code_key" ON "fee_types"("code");

-- CreateIndex
CREATE INDEX "fee_tariffs_fee_type_id_academic_year_id_idx" ON "fee_tariffs"("fee_type_id", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_installment_plans_fee_tariff_id_key" ON "fee_installment_plans"("fee_tariff_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_installments_plan_id_order_index_key" ON "fee_installments"("plan_id", "order_index");

-- CreateIndex
CREATE INDEX "fee_reductions_student_id_academic_year_id_idx" ON "fee_reductions"("student_id", "academic_year_id");

-- AddForeignKey
ALTER TABLE "fee_tariffs" ADD CONSTRAINT "fee_tariffs_fee_type_id_fkey" FOREIGN KEY ("fee_type_id") REFERENCES "fee_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_tariffs" ADD CONSTRAINT "fee_tariffs_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_tariffs" ADD CONSTRAINT "fee_tariffs_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_tariffs" ADD CONSTRAINT "fee_tariffs_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_tariffs" ADD CONSTRAINT "fee_tariffs_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_installment_plans" ADD CONSTRAINT "fee_installment_plans_fee_tariff_id_fkey" FOREIGN KEY ("fee_tariff_id") REFERENCES "fee_tariffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_installments" ADD CONSTRAINT "fee_installments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "fee_installment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reductions" ADD CONSTRAINT "fee_reductions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reductions" ADD CONSTRAINT "fee_reductions_fee_type_id_fkey" FOREIGN KEY ("fee_type_id") REFERENCES "fee_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reductions" ADD CONSTRAINT "fee_reductions_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_reductions" ADD CONSTRAINT "fee_reductions_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

