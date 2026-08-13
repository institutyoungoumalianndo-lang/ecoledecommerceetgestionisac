-- Module 15 — Portail web, fondations (voir docs/modules/MODULE-15-portail-web.md §3). Identités de
-- connexion externes (étudiant/tuteur/enseignant), indépendantes de "users" (personnel) — aucun rôle
-- RBAC, portée toujours limitée à ses propres données.

-- CreateTable
CREATE TABLE "portal_credentials" (
    "id" TEXT NOT NULL,
    "student_id" TEXT,
    "guardian_id" TEXT,
    "teacher_id" TEXT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_sessions" (
    "id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portal_credentials_student_id_key" ON "portal_credentials"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "portal_credentials_guardian_id_key" ON "portal_credentials"("guardian_id");

-- CreateIndex
CREATE UNIQUE INDEX "portal_credentials_teacher_id_key" ON "portal_credentials"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "portal_credentials_username_key" ON "portal_credentials"("username");

-- CreateIndex
CREATE UNIQUE INDEX "portal_sessions_token_hash_key" ON "portal_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "portal_sessions_credential_id_idx" ON "portal_sessions"("credential_id");

-- AddForeignKey
ALTER TABLE "portal_credentials" ADD CONSTRAINT "portal_credentials_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_credentials" ADD CONSTRAINT "portal_credentials_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_credentials" ADD CONSTRAINT "portal_credentials_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_credentials" ADD CONSTRAINT "portal_credentials_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "portal_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
