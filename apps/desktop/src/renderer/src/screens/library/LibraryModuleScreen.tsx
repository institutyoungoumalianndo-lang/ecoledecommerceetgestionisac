import { Tabs } from "@isac-erp/ui";
import { useState } from "react";
import { useHasPermission } from "../../store/authStore";
import { BookCategoriesScreen } from "./BookCategoriesScreen";
import { BookDetailScreen } from "./BookDetailScreen";
import { BooksScreen } from "./BooksScreen";
import { DigitalDocumentCategoriesScreen } from "./DigitalDocumentCategoriesScreen";
import { DigitalDocumentsScreen } from "./DigitalDocumentsScreen";
import { LibrarySettingsScreen } from "./LibrarySettingsScreen";
import { LoansScreen } from "./LoansScreen";

/** Coquille du module Bibliothèque (MODULE-13 — Gestion des ouvrages et des emprunts). */
export function LibraryModuleScreen() {
  const canAdminister = useHasPermission("BIBLIOTHEQUE:ADMINISTRATION");
  const canSeeDigitalDocs = useHasPermission("BIBLIOTHEQUE_NUMERIQUE:LECTURE");
  const canAdministerDigitalDocs = useHasPermission("BIBLIOTHEQUE_NUMERIQUE:ADMINISTRATION");
  const [tab, setTab] = useState("ouvrages");
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  if (openBookId) {
    return <BookDetailScreen bookId={openBookId} onBack={() => setOpenBookId(null)} />;
  }

  const items = [
    { key: "ouvrages", label: "Ouvrages" },
    { key: "emprunts", label: "Emprunts" },
    ...(canSeeDigitalDocs ? [{ key: "documents-numeriques", label: "Documents numériques" }] : []),
    ...(canAdminister ? [{ key: "categories", label: "Catégories" }, { key: "reglages", label: "Réglages" }] : []),
    ...(canAdministerDigitalDocs ? [{ key: "categories-numeriques", label: "Catégories numériques" }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <Tabs items={items} activeKey={tab} onChange={setTab} />
      {tab === "ouvrages" && <BooksScreen onOpenBook={setOpenBookId} />}
      {tab === "emprunts" && <LoansScreen />}
      {tab === "documents-numeriques" && canSeeDigitalDocs && <DigitalDocumentsScreen />}
      {tab === "categories" && canAdminister && <BookCategoriesScreen />}
      {tab === "reglages" && canAdminister && <LibrarySettingsScreen />}
      {tab === "categories-numeriques" && canAdministerDigitalDocs && <DigitalDocumentCategoriesScreen />}
    </div>
  );
}
