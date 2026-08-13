import type { PedagogicalGroupDto } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/**
 * Groupes pédagogiques — raccourci de saisie pour les cours mutualisés/tronc commun (MODULE-05.2
 * §1.6). Préremplit les classes d'une séance, ne les contraint jamais après création.
 */
export function PedagogicalGroupsScreen() {
  const utils = trpc.useUtils();
  const query = trpc.pedagogicalGroups.list.useQuery({});
  const classesQuery = trpc.schoolClasses.list.useQuery({});
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [classIds, setClassIds] = useState<string[]>([]);

  function invalidate() {
    void utils.pedagogicalGroups.list.invalidate();
  }

  const create = trpc.pedagogicalGroups.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setLabel("");
      setClassIds([]);
    },
  });
  const deactivate = trpc.pedagogicalGroups.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.pedagogicalGroups.reactivate.useMutation({ onSuccess: invalidate });

  function toggleClass(id: string) {
    setClassIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  const columns: DataTableColumn<PedagogicalGroupDto>[] = [
    { key: "label", header: "Libellé", value: (r) => r.label },
    { key: "classes", header: "Classes membres", value: (r) => r.classNames.join(", ") || "—" },
    {
      key: "status",
      header: "Statut",
      value: (r) => (r.isActive ? "Actif" : "Inactif"),
      render: (r) => <Badge variant={r.isActive ? "success" : "muted"}>{r.isActive ? "Actif" : "Inactif"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Groupes pédagogiques</h2>
        <Button onClick={() => setCreateOpen(true)}>Nouveau groupe</Button>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(r) => r.id}
        exportFilename="groupes-pedagogiques"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun groupe pédagogique."}
        rowActions={(r) =>
          r.isActive ? (
            <Button variant="destructive" onClick={() => deactivate.mutate({ id: r.id })}>
              Désactiver
            </Button>
          ) : (
            <Button variant="success" onClick={() => reactivate.mutate({ id: r.id })}>
              Réactiver
            </Button>
          )
        }
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un groupe pédagogique">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Libellé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Tronc Commun Licence 1…" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Classes membres</Label>
            <div className="flex max-h-64 flex-col gap-1.5 overflow-auto rounded-lg border border-border p-2">
              {(classesQuery.data ?? []).map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={classIds.includes(c.id)}
                    onChange={() => toggleClass(c.id)}
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
          {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={create.isPending || !label.trim() || classIds.length === 0}
              onClick={() => create.mutate({ label, classIds })}
            >
              {create.isPending ? "Création…" : "Créer"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
