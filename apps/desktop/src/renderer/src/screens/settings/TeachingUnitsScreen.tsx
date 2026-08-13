import type { TeachingUnitDto } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

/** Unités d'enseignement (MODULE-02.1 §1.3/§9.8) — total des crédits toujours calculé, jamais stocké. */
export function TeachingUnitsScreen() {
  const utils = trpc.useUtils();
  const query = trpc.teachingUnits.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const canAdminister = useHasPermission("MATIERES:ADMINISTRATION");

  const create = trpc.teachingUnits.create.useMutation({
    onSuccess: () => {
      void utils.teachingUnits.list.invalidate();
      setCreateOpen(false);
      setCode("");
      setName("");
      setDescription("");
    },
  });
  const deactivate = trpc.teachingUnits.deactivate.useMutation({ onSuccess: () => void utils.teachingUnits.list.invalidate() });

  const columns: DataTableColumn<TeachingUnitDto>[] = [
    { key: "code", header: "Code", value: (u) => u.code },
    { key: "name", header: "Nom", value: (u) => u.name },
    { key: "responsibleUserName", header: "Responsable", value: (u) => u.responsibleUserName ?? "—" },
    { key: "subjectCount", header: "Matières", value: (u) => u.subjectCount },
    { key: "totalCredits", header: "Total crédits", value: (u) => u.totalCredits },
    {
      key: "status",
      header: "Statut",
      value: (u) => (u.isActive ? "Actif" : "Inactif"),
      render: (u) => <Badge variant={u.isActive ? "success" : "muted"}>{u.isActive ? "Actif" : "Inactif"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Unités d'enseignement</h2>
        {canAdminister && <Button onClick={() => setCreateOpen(true)}>Nouvelle UE</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(u) => u.id}
        exportFilename="unites-enseignement"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune unité d'enseignement."}
        rowActions={
          canAdminister
            ? (u) =>
                u.isActive ? (
                  <Button variant="outline" onClick={() => deactivate.mutate({ id: u.id })}>
                    Désactiver
                  </Button>
                ) : undefined
            : undefined
        }
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer une unité d'enseignement">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={!code || !name || create.isPending}
              onClick={() => create.mutate({ code, name, description: description || undefined })}
            >
              {create.isPending ? "Création…" : "Créer"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
