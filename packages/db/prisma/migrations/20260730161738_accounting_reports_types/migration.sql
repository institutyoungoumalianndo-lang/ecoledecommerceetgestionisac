-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'GRAND_LIVRE_CAISSE';
ALTER TYPE "DocumentType" ADD VALUE 'ETAT_RECETTES';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NumberingPurpose" ADD VALUE 'GRAND_LIVRE_CAISSE';
ALTER TYPE "NumberingPurpose" ADD VALUE 'ETAT_RECETTES';
ALTER TYPE "NumberingPurpose" ADD VALUE 'RAPPORT_CAISSE';

