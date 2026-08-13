-- AlterTable
ALTER TABLE "students" ADD COLUMN "ina" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "students_ina_key" ON "students"("ina");
