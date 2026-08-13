-- CreateEnum
CREATE TYPE "SalaryMode" AS ENUM ('FIXE', 'HORAIRE');

-- CreateEnum
CREATE TYPE "PayPeriodStatus" AS ENUM ('OUVERT', 'EN_COURS', 'CLOTURE');

-- CreateEnum
CREATE TYPE "PayrollComponentKind" AS ENUM ('PRIME', 'INDEMNITE', 'RETENUE', 'COTISATION');

-- CreateEnum
CREATE TYPE "SalaryAdvanceStatus" AS ENUM ('EN_ATTENTE', 'DEDUITE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "PayrollLineStatus" AS ENUM ('BROUILLON', 'CALCULEE', 'VALIDEE');

-- AlterEnum
ALTER TYPE "NumberingPurpose" ADD VALUE 'EMPLOYE';

-- CreateTable
CREATE TABLE "employee_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "department" TEXT,
    "contract_type_id" TEXT,
    "teacher_id" TEXT,
    "last_name" TEXT,
    "first_name" TEXT,
    "gender" "Gender",
    "phone_primary" TEXT,
    "phone_secondary" TEXT,
    "email" TEXT,
    "address" TEXT,
    "photo_path" TEXT,
    "hire_date" TIMESTAMP(3),
    "salary_mode" "SalaryMode" NOT NULL DEFAULT 'FIXE',
    "fixed_monthly_salary" DECIMAL(12,2),
    "hourly_rate" DECIMAL(10,2),
    "teaching_hours_paid" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "archived_reason" TEXT,
    "archived_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pay_periods" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "PayPeriodStatus" NOT NULL DEFAULT 'OUVERT',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "payment_date" TIMESTAMP(3),
    "validated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_component_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "PayrollComponentKind" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_component_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_advances" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "granted_pay_period_id" TEXT NOT NULL,
    "deduction_pay_period_id" TEXT,
    "reason" TEXT,
    "status" "SalaryAdvanceStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_lines" (
    "id" TEXT NOT NULL,
    "pay_period_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "base_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hours_planned" DECIMAL(6,2),
    "hours_worked" DECIMAL(6,2),
    "hourly_rate" DECIMAL(10,2),
    "overtime_hours" DECIMAL(6,2),
    "overtime_amount" DECIMAL(12,2),
    "total_primes" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_indemnites" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_retenues" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_advances_deducted" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_cotisations" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gross_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_method_id" TEXT,
    "status" "PayrollLineStatus" NOT NULL DEFAULT 'BROUILLON',
    "verification_code" TEXT,
    "calculated_at" TIMESTAMP(3),
    "validated_at" TIMESTAMP(3),
    "validated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_line_components" (
    "id" TEXT NOT NULL,
    "payroll_line_id" TEXT NOT NULL,
    "component_type_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_line_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_settings" (
    "id" TEXT NOT NULL,
    "salary_expense_account_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_categories_code_key" ON "employee_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_matricule_key" ON "employees"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "employees_teacher_id_key" ON "employees"("teacher_id");

-- CreateIndex
CREATE INDEX "employees_last_name_first_name_idx" ON "employees"("last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "pay_periods_year_month_key" ON "pay_periods"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_component_types_code_key" ON "payroll_component_types"("code");

-- CreateIndex
CREATE INDEX "salary_advances_employee_id_idx" ON "salary_advances"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_lines_pay_period_id_employee_id_key" ON "payroll_lines"("pay_period_id", "employee_id");

-- CreateIndex
CREATE INDEX "payroll_line_components_payroll_line_id_idx" ON "payroll_line_components"("payroll_line_id");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "employee_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_contract_type_id_fkey" FOREIGN KEY ("contract_type_id") REFERENCES "teacher_contract_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pay_periods" ADD CONSTRAINT "pay_periods_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_granted_pay_period_id_fkey" FOREIGN KEY ("granted_pay_period_id") REFERENCES "pay_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_deduction_pay_period_id_fkey" FOREIGN KEY ("deduction_pay_period_id") REFERENCES "pay_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_pay_period_id_fkey" FOREIGN KEY ("pay_period_id") REFERENCES "pay_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_line_components" ADD CONSTRAINT "payroll_line_components_payroll_line_id_fkey" FOREIGN KEY ("payroll_line_id") REFERENCES "payroll_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_line_components" ADD CONSTRAINT "payroll_line_components_component_type_id_fkey" FOREIGN KEY ("component_type_id") REFERENCES "payroll_component_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_settings" ADD CONSTRAINT "payroll_settings_salary_expense_account_id_fkey" FOREIGN KEY ("salary_expense_account_id") REFERENCES "chart_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

