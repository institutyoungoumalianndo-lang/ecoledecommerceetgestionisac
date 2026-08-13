-- Contrats de travail (2026-08-06) — l'établissement ne fonctionne qu'en CDD (jamais de CDI).
-- Remplace l'entrée CONTRAT_TRAVAIL (Tier 2, jamais implémentée). Postgres ne permet pas de retirer
-- une valeur d'enum en place sans reconstruire le type ; la valeur CONTRAT_TRAVAIL reste donc présente
-- au niveau base (orpheline, inoffensive) mais n'est plus déclarée côté application (schema.prisma /
-- Zod) — plus aucun code ne peut la référencer.
ALTER TYPE "DocumentType" ADD VALUE 'CONTRAT_CDD_ADMINISTRATIF';
ALTER TYPE "DocumentType" ADD VALUE 'CONTRAT_CDD_ENSEIGNANT';
ALTER TYPE "DocumentType" ADD VALUE 'CONTRAT_VACATION';

ALTER TYPE "NumberingPurpose" ADD VALUE 'CONTRAT_CDD_ADMINISTRATIF';
ALTER TYPE "NumberingPurpose" ADD VALUE 'CONTRAT_CDD_ENSEIGNANT';
ALTER TYPE "NumberingPurpose" ADD VALUE 'CONTRAT_VACATION';

-- Identité civile — nécessaire pour les contrats de travail, absente jusqu'ici car aucun document
-- Employee n'en avait besoin ; miroir des champs déjà présents sur Teacher.
ALTER TABLE "employees" ADD COLUMN "birth_date" TIMESTAMP(3);
ALTER TABLE "employees" ADD COLUMN "birth_place" TEXT;
ALTER TABLE "employees" ADD COLUMN "nationality" TEXT;
ALTER TABLE "employees" ADD COLUMN "id_number" TEXT;

-- Pièce d'identité — nécessaire pour les contrats de travail (Teacher a déjà birth_date/birth_place/nationality).
ALTER TABLE "teachers" ADD COLUMN "id_number" TEXT;
