-- AlterEnum
ALTER TYPE "AccountType" ADD VALUE 'CAPITAUX_PROPRES';

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "cash_register_session_id" TEXT;

-- CreateIndex
CREATE INDEX "expenses_cash_register_session_id_idx" ON "expenses"("cash_register_session_id");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cash_register_session_id_fkey" FOREIGN KEY ("cash_register_session_id") REFERENCES "cash_register_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

