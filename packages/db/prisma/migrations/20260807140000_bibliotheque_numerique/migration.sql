-- Module 13 (extension) — Bibliothèque numérique (voir docs/modules/MODULE-13-bibliotheque.md §5-6).
-- Fichiers numériques (PDF/Word) classés et partageables par e-mail (pièce jointe réelle) ou WhatsApp
-- (lien de téléchargement uniquement — pas d'API WhatsApp officielle).

-- CreateEnum
CREATE TYPE "DigitalDocumentFormat" AS ENUM ('PDF', 'DOCX');

-- CreateEnum
CREATE TYPE "DigitalDocumentShareChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateTable
CREATE TABLE "digital_document_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_document_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_format" "DigitalDocumentFormat" NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "description" TEXT,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_document_shares" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "recipient_student_id" TEXT,
    "recipient_teacher_id" TEXT,
    "recipient_employee_id" TEXT,
    "channel" "DigitalDocumentShareChannel" NOT NULL,
    "shared_by" TEXT,
    "shared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_document_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "digital_document_categories_name_key" ON "digital_document_categories"("name");

-- CreateIndex
CREATE INDEX "digital_documents_category_id_idx" ON "digital_documents"("category_id");

-- CreateIndex
CREATE INDEX "digital_documents_title_idx" ON "digital_documents"("title");

-- CreateIndex
CREATE INDEX "digital_document_shares_document_id_idx" ON "digital_document_shares"("document_id");

-- CreateIndex
CREATE INDEX "digital_document_shares_recipient_student_id_idx" ON "digital_document_shares"("recipient_student_id");

-- CreateIndex
CREATE INDEX "digital_document_shares_recipient_teacher_id_idx" ON "digital_document_shares"("recipient_teacher_id");

-- CreateIndex
CREATE INDEX "digital_document_shares_recipient_employee_id_idx" ON "digital_document_shares"("recipient_employee_id");

-- AddForeignKey
ALTER TABLE "digital_documents" ADD CONSTRAINT "digital_documents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "digital_document_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_documents" ADD CONSTRAINT "digital_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_document_shares" ADD CONSTRAINT "digital_document_shares_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "digital_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_document_shares" ADD CONSTRAINT "digital_document_shares_recipient_student_id_fkey" FOREIGN KEY ("recipient_student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_document_shares" ADD CONSTRAINT "digital_document_shares_recipient_teacher_id_fkey" FOREIGN KEY ("recipient_teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_document_shares" ADD CONSTRAINT "digital_document_shares_recipient_employee_id_fkey" FOREIGN KEY ("recipient_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_document_shares" ADD CONSTRAINT "digital_document_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
