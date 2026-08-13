import type { AccountType, ChartAccountDto, CreateChartAccountInput } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const TYPE_LABELS: Record<AccountType, string> = {
  ACTIF: "Actif",
  PASSIF: "Passif",
  TRESORERIE: "Trésorerie",
  CHARGE: "Charge",
  PRODUIT: "Produit",
  CAPITAUX_PROPRES: "Capitaux propres",
};

/** Plan comptable (MODULE-07 §1.7/§8.2) — référentiel librement complétable, pas un plan national figé. */
export function ChartAccountsScreen() {
  const utils = trpc.useUtils();
  const query = trpc.chartAccounts.list.useQuery({ includeInactive: true });
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<AccountType>("CHARGE");
  const canAdminister = useHasPermission("COMPTABILITE:CREATION");
  const canModify = useHasPermission("COMPTABILITE:MODIFICATION");

  function invalidate() {
    void utils.chartAccounts.list.invalidate();
  }

  const create = trpc.chartAccounts.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setCode("");
      setLabel("");
    },
  });
  const deactivate = trpc.chartAccounts.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.chartAccounts.reactivate.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<ChartAccountDto>[] = [
    { key: "code", header: "Code", value: (a) => a.code },
    { key: "label", header: "Libellé", value: (a) => a.label },
    { key: "type", header: "Nature", value: (a) => TYPE_LABELS[a.type] },
    {
      key: "status",
      header: "Statut",
      value: (a) => (a.isActive ? "Actif" : "Inactif"),
      render: (a) => <Badge variant={a.isActive ? "success" : "muted"}>{a.isActive ? "Actif" : "Inactif"}</Badge>,
    },
  ];

  function submit() {
    const input: CreateChartAccountInput = { code, label, type };
    create.mutate(input);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Plan comptable</h2>
        {canAdminister && <Button onClick={() => setCreateOpen(true)}>Nouveau compte</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(a) => a.id}
        exportFilename="plan-comptable"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun compte."}
        rowActions={
          canModify
            ? (a) =>
                a.isActive ? (
                  <Button variant="destructive" onClick={() => deactivate.mutate({ id: a.id })}>
                    Désactiver
                  </Button>
                ) : (
                  <Button variant="success" onClick={() => reactivate.mutate({ id: a.id })}>
                    Réactiver
                  </Button>
                )
            : undefined
        }
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un compte comptable">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex. 512000" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Libellé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex. Caisse" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nature</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {Object.entries(TYPE_LABELS).map(([value, l]) => (
                <option key={value} value={value}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button disabled={!code || !label || create.isPending} onClick={submit}>
              {create.isPending ? "Création…" : "Créer"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
