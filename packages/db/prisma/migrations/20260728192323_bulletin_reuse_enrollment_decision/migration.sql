-- AlterTable
ALTER TABLE "bulletins_annuels" DROP COLUMN "decision",
ADD COLUMN     "decision" "EnrollmentDecision" NOT NULL;

-- AlterTable
ALTER TABLE "bulletins_periode" DROP COLUMN "decision",
ADD COLUMN     "decision" "EnrollmentDecision" NOT NULL;

-- DropEnum
DROP TYPE "DecisionEvaluation";

