-- DropIndex
DROP INDEX "bulletins_annuels_student_id_academic_year_id_key";

-- DropIndex
DROP INDEX "bulletins_periode_student_id_academic_period_id_key";

-- CreateIndex
CREATE INDEX "bulletins_annuels_student_id_academic_year_id_idx" ON "bulletins_annuels"("student_id", "academic_year_id");

-- CreateIndex
CREATE INDEX "bulletins_periode_student_id_academic_period_id_idx" ON "bulletins_periode"("student_id", "academic_period_id");


-- Index unique partiel : un seul bulletin ACTIF (non annulé) par (étudiant, période/année) —
-- voir MODULE-06 §3 règle 7. Non exprimable via @@unique dans schema.prisma (pas de support des
-- index partiels), ajouté ici à la main.
CREATE UNIQUE INDEX "bulletins_periode_student_period_active_key" ON "bulletins_periode"("student_id", "academic_period_id") WHERE "annule" = false;
CREATE UNIQUE INDEX "bulletins_annuels_student_year_active_key" ON "bulletins_annuels"("student_id", "academic_year_id") WHERE "annule" = false;
