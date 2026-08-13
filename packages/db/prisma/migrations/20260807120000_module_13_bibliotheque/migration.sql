-- Module 13 — Bibliothèque (voir docs/modules/MODULE-13-bibliotheque.md). Catalogue d'ouvrages/exemplaires
-- et emprunts, indépendant de la comptabilité — retards signalés visuellement uniquement.

-- AlterEnum
ALTER TYPE "NumberingPurpose" ADD VALUE 'EXEMPLAIRE_BIBLIOTHEQUE';

-- CreateEnum
CREATE TYPE "BookCopyCondition" AS ENUM ('BON', 'MOYEN', 'MAUVAIS');

-- CreateEnum
CREATE TYPE "BookCopyStatus" AS ENUM ('DISPONIBLE', 'EMPRUNTE', 'PERDU', 'RETIRE');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('EN_COURS', 'RENDU', 'PERDU');

-- CreateTable
CREATE TABLE "book_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "category_id" TEXT NOT NULL,
    "description" TEXT,
    "publisher" TEXT,
    "publication_year" INTEGER,
    "isbn" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_copies" (
    "id" TEXT NOT NULL,
    "inventory_number" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "condition" "BookCopyCondition" NOT NULL DEFAULT 'BON',
    "status" "BookCopyStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "withdrawal_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_copies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "book_copy_id" TEXT NOT NULL,
    "borrower_student_id" TEXT,
    "borrower_teacher_id" TEXT,
    "borrower_employee_id" TEXT,
    "loan_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "returned_at" TIMESTAMP(3),
    "status" "LoanStatus" NOT NULL DEFAULT 'EN_COURS',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_settings" (
    "id" TEXT NOT NULL,
    "default_loan_duration_days" INTEGER NOT NULL DEFAULT 14,
    "max_simultaneous_loans" INTEGER NOT NULL DEFAULT 3,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_categories_name_key" ON "book_categories"("name");

-- CreateIndex
CREATE INDEX "books_category_id_idx" ON "books"("category_id");

-- CreateIndex
CREATE INDEX "books_title_idx" ON "books"("title");

-- CreateIndex
CREATE UNIQUE INDEX "book_copies_inventory_number_key" ON "book_copies"("inventory_number");

-- CreateIndex
CREATE INDEX "book_copies_book_id_idx" ON "book_copies"("book_id");

-- CreateIndex
CREATE INDEX "book_copies_status_idx" ON "book_copies"("status");

-- CreateIndex
CREATE INDEX "loans_book_copy_id_idx" ON "loans"("book_copy_id");

-- CreateIndex
CREATE INDEX "loans_status_due_date_idx" ON "loans"("status", "due_date");

-- CreateIndex
CREATE INDEX "loans_borrower_student_id_idx" ON "loans"("borrower_student_id");

-- CreateIndex
CREATE INDEX "loans_borrower_teacher_id_idx" ON "loans"("borrower_teacher_id");

-- CreateIndex
CREATE INDEX "loans_borrower_employee_id_idx" ON "loans"("borrower_employee_id");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "book_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_copies" ADD CONSTRAINT "book_copies_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_book_copy_id_fkey" FOREIGN KEY ("book_copy_id") REFERENCES "book_copies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_student_id_fkey" FOREIGN KEY ("borrower_student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_teacher_id_fkey" FOREIGN KEY ("borrower_teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_employee_id_fkey" FOREIGN KEY ("borrower_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
