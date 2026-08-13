-- AlterTable
ALTER TABLE "evaluation_settings" ADD COLUMN "seuil_absences_irregulier" INTEGER NOT NULL DEFAULT 5;

-- AlterTable (bulletins déjà générés : régularité rétroactive par défaut "Régulier", le champ n'a plus
-- de valeur par défaut ensuite — tout nouveau bulletin doit explicitement calculer sa régularité).
ALTER TABLE "bulletins_periode" ADD COLUMN "regularite" TEXT NOT NULL DEFAULT 'Régulier';
ALTER TABLE "bulletins_periode" ALTER COLUMN "regularite" DROP DEFAULT;

ALTER TABLE "bulletins_annuels" ADD COLUMN "regularite" TEXT NOT NULL DEFAULT 'Régulier';
ALTER TABLE "bulletins_annuels" ALTER COLUMN "regularite" DROP DEFAULT;

-- CreateTable
CREATE TABLE "student_absences" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "motif" TEXT NOT NULL,
    "justifiee" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_absences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_absences_student_id_date_idx" ON "student_absences"("student_id", "date");

-- AddForeignKey
ALTER TABLE "student_absences" ADD CONSTRAINT "student_absences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_absences" ADD CONSTRAINT "student_absences_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
