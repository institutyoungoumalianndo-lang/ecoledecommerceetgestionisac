-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('OUVERTE', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "AttendanceSessionStatus" AS ENUM ('DISPENSE', 'REPORTE', 'ANNULE', 'REMPLACE');

-- CreateEnum
CREATE TYPE "HoursSource" AS ENUM ('POINTAGE', 'PLANIFIE');

-- AlterTable
ALTER TABLE "payroll_lines" ADD COLUMN     "hours_source" "HoursSource";

-- AlterTable
ALTER TABLE "payroll_settings" ADD COLUMN     "default_hourly_rate" DECIMAL(10,2),
ADD COLUMN     "default_session_duration_hours" DECIMAL(4,2);

-- CreateTable
CREATE TABLE "teacher_weekly_slots" (
    "id" TEXT NOT NULL,
    "teacher_assignment_id" TEXT NOT NULL,
    "day_of_week" "DayOfWeek" NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "room" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_weekly_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_monthly_timesheets" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "TimesheetStatus" NOT NULL DEFAULT 'OUVERTE',
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_monthly_timesheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_attendance_sessions" (
    "id" TEXT NOT NULL,
    "timesheet_id" TEXT NOT NULL,
    "teacher_assignment_id" TEXT NOT NULL,
    "weekly_slot_id" TEXT,
    "session_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "room" TEXT,
    "status" "AttendanceSessionStatus",
    "reason" TEXT,
    "rescheduled_to_session_id" TEXT,
    "substitute_teacher_id" TEXT,
    "validated_at" TIMESTAMP(3),
    "validated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_weekly_slots_teacher_assignment_id_idx" ON "teacher_weekly_slots"("teacher_assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_monthly_timesheets_teacher_id_year_month_key" ON "teacher_monthly_timesheets"("teacher_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_attendance_sessions_rescheduled_to_session_id_key" ON "teacher_attendance_sessions"("rescheduled_to_session_id");

-- CreateIndex
CREATE INDEX "teacher_attendance_sessions_timesheet_id_idx" ON "teacher_attendance_sessions"("timesheet_id");

-- CreateIndex
CREATE INDEX "teacher_attendance_sessions_teacher_assignment_id_idx" ON "teacher_attendance_sessions"("teacher_assignment_id");

-- CreateIndex
CREATE INDEX "teacher_attendance_sessions_session_date_idx" ON "teacher_attendance_sessions"("session_date");

-- AddForeignKey
ALTER TABLE "teacher_weekly_slots" ADD CONSTRAINT "teacher_weekly_slots_teacher_assignment_id_fkey" FOREIGN KEY ("teacher_assignment_id") REFERENCES "teacher_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_monthly_timesheets" ADD CONSTRAINT "teacher_monthly_timesheets_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_monthly_timesheets" ADD CONSTRAINT "teacher_monthly_timesheets_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_attendance_sessions" ADD CONSTRAINT "teacher_attendance_sessions_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "teacher_monthly_timesheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_attendance_sessions" ADD CONSTRAINT "teacher_attendance_sessions_teacher_assignment_id_fkey" FOREIGN KEY ("teacher_assignment_id") REFERENCES "teacher_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_attendance_sessions" ADD CONSTRAINT "teacher_attendance_sessions_weekly_slot_id_fkey" FOREIGN KEY ("weekly_slot_id") REFERENCES "teacher_weekly_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_attendance_sessions" ADD CONSTRAINT "teacher_attendance_sessions_substitute_teacher_id_fkey" FOREIGN KEY ("substitute_teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_attendance_sessions" ADD CONSTRAINT "teacher_attendance_sessions_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_attendance_sessions" ADD CONSTRAINT "teacher_attendance_sessions_rescheduled_to_session_id_fkey" FOREIGN KEY ("rescheduled_to_session_id") REFERENCES "teacher_attendance_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

