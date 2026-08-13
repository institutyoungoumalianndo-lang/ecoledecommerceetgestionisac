-- CreateTable
CREATE TABLE "rattrapage_sessions" (
    "id" TEXT NOT NULL,
    "filiere_id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "session_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT,
    "room_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rattrapage_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rattrapage_sessions_scope_key" ON "rattrapage_sessions"("filiere_id", "level_id", "academic_year_id", "subject_id");

-- CreateIndex
CREATE INDEX "rattrapage_sessions_academic_year_id_idx" ON "rattrapage_sessions"("academic_year_id");

-- AddForeignKey
ALTER TABLE "rattrapage_sessions" ADD CONSTRAINT "rattrapage_sessions_filiere_id_fkey" FOREIGN KEY ("filiere_id") REFERENCES "filieres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rattrapage_sessions" ADD CONSTRAINT "rattrapage_sessions_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rattrapage_sessions" ADD CONSTRAINT "rattrapage_sessions_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rattrapage_sessions" ADD CONSTRAINT "rattrapage_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rattrapage_sessions" ADD CONSTRAINT "rattrapage_sessions_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rattrapage_sessions" ADD CONSTRAINT "rattrapage_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
