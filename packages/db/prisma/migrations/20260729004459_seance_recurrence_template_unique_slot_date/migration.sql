-- CreateIndex
CREATE UNIQUE INDEX "seances_recurrence_template_id_session_date_key" ON "seances"("recurrence_template_id", "session_date");

