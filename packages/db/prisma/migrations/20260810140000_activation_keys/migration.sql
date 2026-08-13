-- Clé d'activation d'installation (ADR-054)
CREATE TYPE "ActivationKeyStatus" AS ENUM ('UNUSED', 'USED');

CREATE TABLE "activation_keys" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "status" "ActivationKeyStatus" NOT NULL DEFAULT 'UNUSED',
    "created_by" TEXT NOT NULL,
    "used_by_user_id" TEXT,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "activation_keys_code_key" ON "activation_keys"("code");
CREATE UNIQUE INDEX "activation_keys_used_by_user_id_key" ON "activation_keys"("used_by_user_id");
CREATE INDEX "activation_keys_role_id_idx" ON "activation_keys"("role_id");

ALTER TABLE "activation_keys" ADD CONSTRAINT "activation_keys_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activation_keys" ADD CONSTRAINT "activation_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activation_keys" ADD CONSTRAINT "activation_keys_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
