-- CreateEnum
CREATE TYPE "SanctionType" AS ENUM ('AVERTISSEMENT', 'BLAME', 'RETENUE', 'EXCLUSION_TEMPORAIRE', 'EXCLUSION_DEFINITIVE', 'AUTRE');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'SANCTION';

-- AlterEnum
ALTER TYPE "NumberingPurpose" ADD VALUE 'SANCTION';

-- AlterEnum
ALTER TYPE "NotificationEventType" ADD VALUE 'SANCTION_ENREGISTREE';

-- CreateTable
CREATE TABLE "sanctions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "type" "SanctionType" NOT NULL,
    "motif" TEXT NOT NULL,
    "description" TEXT,
    "duree_jours" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "annule" BOOLEAN NOT NULL DEFAULT false,
    "annule_reason" TEXT,
    "annule_by" TEXT,
    "annule_le" TIMESTAMP(3),
    "issued_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sanctions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sanctions_student_id_idx" ON "sanctions"("student_id");

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_annule_by_fkey" FOREIGN KEY ("annule_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
