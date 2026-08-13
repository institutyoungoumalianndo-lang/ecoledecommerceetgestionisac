import { Tabs } from "@isac-erp/ui";
import { useState } from "react";
import { useHasPermission } from "../../store/authStore";
import { AssetCategoriesScreen } from "./AssetCategoriesScreen";
import { AssetDetailScreen } from "./AssetDetailScreen";
import { AssetLocationsScreen } from "./AssetLocationsScreen";
import { AssetsScreen } from "./AssetsScreen";

/** Coquille du module Inventaire (MODULE-14 — Gestion des biens/matériel de l'établissement). */
export function InventoryModuleScreen() {
  const canAdminister = useHasPermission("INVENTAIRE:ADMINISTRATION");
  const [tab, setTab] = useState("biens");
  const [openAssetId, setOpenAssetId] = useState<string | null>(null);

  if (openAssetId) {
    return <AssetDetailScreen assetId={openAssetId} onBack={() => setOpenAssetId(null)} />;
  }

  const items = [
    { key: "biens", label: "Biens" },
    ...(canAdminister ? [{ key: "categories", label: "Catégories" }, { key: "lieux", label: "Lieux" }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      {items.length > 1 && <Tabs items={items} activeKey={tab} onChange={setTab} />}
      {tab === "biens" && <AssetsScreen onOpenAsset={setOpenAssetId} />}
      {tab === "categories" && canAdminister && <AssetCategoriesScreen />}
      {tab === "lieux" && canAdminister && <AssetLocationsScreen />}
    </div>
  );
}
