-- Un seul contact officiel (is_primary_contact = true) par étudiant.
-- Index partiel non modélisable directement dans le schéma Prisma (voir
-- docs/modules/MODULE-04-etudiants.md §2.4).
CREATE UNIQUE INDEX "student_guardians_one_primary_contact_per_student"
ON "student_guardians" ("student_id")
WHERE "is_primary_contact" = true;
