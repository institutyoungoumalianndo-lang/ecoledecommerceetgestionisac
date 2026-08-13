-- CreateIndex
CREATE UNIQUE INDEX "teacher_attendance_sessions_weekly_slot_id_session_date_key" ON "teacher_attendance_sessions"("weekly_slot_id", "session_date");

