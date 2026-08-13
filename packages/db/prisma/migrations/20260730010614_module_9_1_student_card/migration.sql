-- CreateEnum
CREATE TYPE "StudentCardStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "student_cards" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "card_number" TEXT NOT NULL,
    "verification_code" TEXT NOT NULL,
    "qr_payload" TEXT NOT NULL,
    "status" "StudentCardStatus" NOT NULL DEFAULT 'ACTIVE',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancelled_reason" TEXT,
    "superseded_by_card_id" TEXT,
    "file_path" TEXT NOT NULL,
    "generated_document_id" TEXT,
    "generated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_card_reprints" (
    "id" TEXT NOT NULL,
    "student_card_id" TEXT NOT NULL,
    "reprinted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reprinted_by" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_card_reprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_card_template" (
    "id" TEXT NOT NULL,
    "show_guinea_stripes" BOOLEAN NOT NULL DEFAULT true,
    "background_color" TEXT NOT NULL DEFAULT '#FFFFFF',
    "legal_text" TEXT NOT NULL DEFAULT 'Cette carte demeure la propriété de l''École de Commerce et de Gestion ISAC. En cas de perte, veuillez contacter immédiatement l''administration. Toute personne trouvant cette carte est priée de la déposer au secrétariat du campus ou d''appeler au numéro ci-dessus. Cette carte est valable pour l''année scolaire indiquée.',
    "personal_use_text" TEXT NOT NULL DEFAULT 'Cette carte est strictement personnelle et incessible.',
    "font_family" TEXT NOT NULL DEFAULT 'Helvetica',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_card_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_cards_card_number_key" ON "student_cards"("card_number");

-- CreateIndex
CREATE UNIQUE INDEX "student_cards_verification_code_key" ON "student_cards"("verification_code");

-- CreateIndex
CREATE UNIQUE INDEX "student_cards_superseded_by_card_id_key" ON "student_cards"("superseded_by_card_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_cards_generated_document_id_key" ON "student_cards"("generated_document_id");

-- CreateIndex
CREATE INDEX "student_cards_student_id_idx" ON "student_cards"("student_id");

-- CreateIndex
CREATE INDEX "student_card_reprints_student_card_id_idx" ON "student_card_reprints"("student_card_id");

-- AddForeignKey
ALTER TABLE "student_cards" ADD CONSTRAINT "student_cards_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_cards" ADD CONSTRAINT "student_cards_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_cards" ADD CONSTRAINT "student_cards_superseded_by_card_id_fkey" FOREIGN KEY ("superseded_by_card_id") REFERENCES "student_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_cards" ADD CONSTRAINT "student_cards_generated_document_id_fkey" FOREIGN KEY ("generated_document_id") REFERENCES "generated_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_cards" ADD CONSTRAINT "student_cards_generated_by_user_id_fkey" FOREIGN KEY ("generated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_card_reprints" ADD CONSTRAINT "student_card_reprints_student_card_id_fkey" FOREIGN KEY ("student_card_id") REFERENCES "student_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_card_reprints" ADD CONSTRAINT "student_card_reprints_reprinted_by_fkey" FOREIGN KEY ("reprinted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Une seule carte ACTIVE par étudiant à la fois (MODULE-09.1 §3 règle 1) — index unique partiel,
-- non exprimable via @@unique classique (même technique que les bulletins, Module 6).
CREATE UNIQUE INDEX "student_cards_one_active_per_student" ON "student_cards"("student_id") WHERE "status" = 'ACTIVE';
