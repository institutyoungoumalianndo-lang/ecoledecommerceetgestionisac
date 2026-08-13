-- Module 10 — Tableau de bord & Rapports décisionnels : moteur d'alertes configurables
-- (voir docs/modules/MODULE-10-tableau-de-bord.md §2). Les rapports eux-mêmes restent des
-- requêtes à la demande sur les tables existantes — seul le moteur d'alertes est nouveau.

-- CreateEnum
CREATE TYPE "AlertComparator" AS ENUM ('LT', 'LTE', 'GT', 'GTE');

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "comparator" "AlertComparator" NOT NULL,
    "threshold" DECIMAL(14,2) NOT NULL,
    "scope" TEXT,
    "channels" TEXT[] NOT NULL DEFAULT ARRAY['INTERNE']::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "value" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alert_rules_code_key" ON "alert_rules"("code");

-- CreateIndex
CREATE INDEX "alert_events_rule_id_resolved_at_idx" ON "alert_events"("rule_id", "resolved_at");

-- AddForeignKey
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
