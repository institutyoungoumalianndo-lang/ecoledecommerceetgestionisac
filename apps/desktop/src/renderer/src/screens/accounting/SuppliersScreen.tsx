import type { SupplierDto } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { CreateSupplierDialog } from "./CreateSupplierDialog";

/** Fournisseurs (MODULE-07 §1.8/§8.10) — historique des paiements calculé depuis les dépenses approuvées. */
export function SuppliersScreen() {
  const utils = trpc.useUtils();
  const query = trpc.suppliers.list.useQuery({ includeInactive: true });
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = useHasPermission("FOURNISSEURS:CREATION");
  const canModify = useHasPermission("FOURNISSEURS:MODIFICATION");

  const deactivate = trpc.suppliers.deactivate.useMutation({ onSuccess: () => void utils.suppliers.list.invalidate() });

  const columns: DataTableColumn<SupplierDto>[] = [
    { key: "code", header: "Code", value: (s) => s.code },
    { key: "name", header: "Nom", value: (s) => s.name },
    { key: "contactPerson", header: "Contact", value: (s) => s.contactPerson ?? "—" },
    { key: "phone", header: "Téléphone", value: (s) => s.phone ?? "—" },
    { key: "category", header: "Catégorie", value: (s) => s.category ?? "—" },
    { key: "totalPaid", header: "Total payé", value: (s) => s.totalPaid, render: (s) => s.totalPaid.toLocaleString("fr-FR") },
    {
      key: "status",
      header: "Statut",
      value: (s) => (s.isActive ? "Actif" : "Inactif"),
      render: (s) => <Badge variant={s.isActive ? "success" : "muted"}>{s.isActive ? "Actif" : "Inactif"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Fournisseurs</h2>
        {canCreate && <Button onClick={() => setCreateOpen(true)}>Nouveau fournisseur</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(s) => s.id}
        exportFilename="fournisseurs"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun fournisseur."}
        rowActions={
          canModify
            ? (s) =>
                s.isActive ? (
                  <Button variant="outline" onClick={() => deactivate.mutate({ id: s.id })}>
                    Désactiver
                  </Button>
                ) : undefined
            : undefined
        }
      />

      {createOpen && <CreateSupplierDialog onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
