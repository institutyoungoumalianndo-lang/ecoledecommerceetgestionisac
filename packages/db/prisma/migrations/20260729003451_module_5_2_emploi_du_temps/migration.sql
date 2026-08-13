-- CreateEnum
CREATE TYPE "SeanceStatus" AS ENUM ('PROGRAMMEE', 'EFFECTUEE', 'REPORTEE', 'ANNULEE', 'REMPLACEE');

-- DropForeignKey
ALTER TABLE "teacher_attendance_sessions" DROP CONSTRAINT "teacher_attendance_sessions_rescheduled_to_session_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_attendance_sessions" DROP CONSTRAINT "teacher_attendance_sessions_substitute_teacher_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_attendance_sessions" DROP CONSTRAINT "teacher_attendance_sessions_teacher_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_attendance_sessions" DROP CONSTRAINT "teacher_attendance_sessions_timesheet_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_attendance_sessions" DROP CONSTRAINT "teacher_attendance_sessions_validated_by_fkey";

-- DropForeignKey
ALTER TABLE "teacher_attendance_sessions" DROP CONSTRAINT "teacher_attendance_sessions_weekly_slot_id_fkey";

-- DropForeignKey
ALTER TABLE "teacher_weekly_slots" DROP CONSTRAINT "teacher_weekly_slots_teacher_assignment_id_fkey";

-- AlterTable
ALTER TABLE "payroll_settings" ADD COLUMN     "monthly_hours_cap" DECIMAL(6,2),
ADD COLUMN     "overtime_multiplier" DECIMAL(4,2);

-- DropTable
DROP TABLE "teacher_attendance_sessions";

-- DropTable
DROP TABLE "teacher_weekly_slots";

-- DropEnum
DROP TYPE "AttendanceSessionStatus";

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedagogical_groups" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedagogical_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedagogical_group_classes" (
    "pedagogical_group_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,

    CONSTRAINT "pedagogical_group_classes_pkey" PRIMARY KEY ("pedagogical_group_id","class_id")
);

-- CreateTable
CREATE TABLE "seance_recurrence_templates" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "subject_offering_id" TEXT NOT NULL,
    "room_id" TEXT,
    "day_of_week" "DayOfWeek" NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "pedagogical_group_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seance_recurrence_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seance_recurrence_template_classes" (
    "template_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,

    CONSTRAINT "seance_recurrence_template_classes_pkey" PRIMARY KEY ("template_id","class_id")
);

-- CreateTable
CREATE TABLE "seances" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "subject_offering_id" TEXT NOT NULL,
    "room_id" TEXT,
    "recurrence_template_id" TEXT,
    "timesheet_id" TEXT NOT NULL,
    "session_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "status" "SeanceStatus" NOT NULL DEFAULT 'PROGRAMMEE',
    "reason" TEXT,
    "rescheduled_to_seance_id" TEXT,
    "substitute_teacher_id" TEXT,
    "validated_at" TIMESTAMP(3),
    "validated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seance_classes" (
    "seance_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,

    CONSTRAINT "seance_classes_pkey" PRIMARY KEY ("seance_id","class_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_label_key" ON "rooms"("label");

-- CreateIndex
CREATE INDEX "seance_recurrence_templates_teacher_id_idx" ON "seance_recurrence_templates"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "seances_rescheduled_to_seance_id_key" ON "seances"("rescheduled_to_seance_id");

-- CreateIndex
CREATE INDEX "seances_timesheet_id_idx" ON "seances"("timesheet_id");

-- CreateIndex
CREATE INDEX "seances_teacher_id_idx" ON "seances"("teacher_id");

-- CreateIndex
CREATE INDEX "seances_session_date_idx" ON "seances"("session_date");

-- CreateIndex
CREATE INDEX "seances_room_id_idx" ON "seances"("room_id");

-- CreateIndex
CREATE INDEX "seance_classes_class_id_idx" ON "seance_classes"("class_id");

-- AddForeignKey
ALTER TABLE "pedagogical_group_classes" ADD CONSTRAINT "pedagogical_group_classes_pedagogical_group_id_fkey" FOREIGN KEY ("pedagogical_group_id") REFERENCES "pedagogical_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedagogical_group_classes" ADD CONSTRAINT "pedagogical_group_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seance_recurrence_templates" ADD CONSTRAINT "seance_recurrence_templates_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seance_recurrence_templates" ADD CONSTRAINT "seance_recurrence_templates_subject_offering_id_fkey" FOREIGN KEY ("subject_offering_id") REFERENCES "subject_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seance_recurrence_templates" ADD CONSTRAINT "seance_recurrence_templates_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seance_recurrence_templates" ADD CONSTRAINT "seance_recurrence_templates_pedagogical_group_id_fkey" FOREIGN KEY ("pedagogical_group_id") REFERENCES "pedagogical_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seance_recurrence_template_classes" ADD CONSTRAINT "seance_recurrence_template_classes_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "seance_recurrence_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seance_recurrence_template_classes" ADD CONSTRAINT "seance_recurrence_template_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seances" ADD CONSTRAINT "seances_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seances" ADD CONSTRAINT "seances_subject_offering_id_fkey" FOREIGN KEY ("subject_offering_id") REFERENCES "subject_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seances" ADD CONSTRAINT "seances_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seances" ADD CONSTRAINT "seances_recurrence_template_id_fkey" FOREIGN KEY ("recurrence_template_id") REFERENCES "seance_recurrence_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seances" ADD CONSTRAINT "seances_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "teacher_monthly_timesheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seances" ADD CONSTRAINT "seances_substitute_teacher_id_fkey" FOREIGN KEY ("substitute_teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seances" ADD CONSTRAINT "seances_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seances" ADD CONSTRAINT "seances_rescheduled_to_seance_id_fkey" FOREIGN KEY ("rescheduled_to_seance_id") REFERENCES "seances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seance_classes" ADD CONSTRAINT "seance_classes_seance_id_fkey" FOREIGN KEY ("seance_id") REFERENCES "seances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seance_classes" ADD CONSTRAINT "seance_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

