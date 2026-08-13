-- Module 14 — Inventaire (voir docs/modules/MODULE-14-inventaire.md). Registre des biens/matériel de
-- l'établissement, indépendant de la comptabilité (Module 7) — aucune écriture comptable générée.

-- AlterEnum
ALTER TYPE "NumberingPurpose" ADD VALUE 'BIEN_INVENTAIRE';

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('BON', 'MOYEN', 'MAUVAIS');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('EN_SERVICE', 'EN_PANNE', 'EN_REPARATION', 'REFORME', 'PERDU_VOLE');

-- CreateEnum
CREATE TYPE "AssetMaintenanceStatus" AS ENUM ('PLANIFIEE', 'TERMINEE');

-- CreateTable
CREATE TABLE "asset_locations" (
    "id" TEXT NOT NULL,
    "building" TEXT NOT NULL,
    "floor" TEXT,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "inventory_number" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "photo_path" TEXT,
    "category_id" TEXT NOT NULL,
    "location_id" TEXT,
    "responsible_employee_id" TEXT,
    "responsible_teacher_id" TEXT,
    "condition" "AssetCondition" NOT NULL DEFAULT 'BON',
    "status" "AssetStatus" NOT NULL DEFAULT 'EN_SERVICE',
    "acquisition_value" DECIMAL(12,2),
    "acquisition_date" TIMESTAMP(3),
    "reform_justification" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_movements" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "changed_by" TEXT,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_maintenances" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DECIMAL(12,2),
    "performed_by" TEXT,
    "status" "AssetMaintenanceStatus" NOT NULL DEFAULT 'PLANIFIEE',
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_locations_building_floor_label_key" ON "asset_locations"("building", "floor", "label");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_name_key" ON "asset_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "assets_inventory_number_key" ON "assets"("inventory_number");

-- CreateIndex
CREATE INDEX "assets_category_id_idx" ON "assets"("category_id");

-- CreateIndex
CREATE INDEX "assets_location_id_idx" ON "assets"("location_id");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "asset_movements_asset_id_created_at_idx" ON "asset_movements"("asset_id", "created_at");

-- CreateIndex
CREATE INDEX "asset_maintenances_asset_id_created_at_idx" ON "asset_maintenances"("asset_id", "created_at");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "asset_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_responsible_employee_id_fkey" FOREIGN KEY ("responsible_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_responsible_teacher_id_fkey" FOREIGN KEY ("responsible_teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenances" ADD CONSTRAINT "asset_maintenances_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenances" ADD CONSTRAINT "asset_maintenances_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
