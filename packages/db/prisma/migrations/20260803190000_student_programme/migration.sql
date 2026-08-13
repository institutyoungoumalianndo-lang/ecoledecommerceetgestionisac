-- CreateEnum
CREATE TYPE "ProgrammeType" AS ENUM ('DQP', 'CAP', 'BEP', 'BT', 'BTS');

-- AlterTable
ALTER TABLE "students" ADD COLUMN "programme" "ProgrammeType";
