import { Badge, Button, DataTable, type DataTableColumn, FormField, Select } from "@isac-erp/ui";
import type { ActivationKeyDto } from "@isac-erp/shared";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/**
 * Génération des clés d'activation d'installation (2026-08-10, ADR-054), réservée au Super
 * Administrateur (revérifié côté serveur — voir `activationKeyService`, défense en profondeur).
 * Chaque clé, une fois distribuée à un collaborateur, crée son compte au rôle choisi ici dès sa
 * première utilisation (voir `ActivationScreen` côté écran de connexion) — jamais réutilisable.
 */
export function ActivationKeysScreen() {
  const [roleId, setRoleId] = useState("");
  const [count, setCount] = useState(1);

  const roles = trpc.roles.list.useQuery();
  const keys = trpc.activationKeys.list.useQuery();
  const utils = trpc.useUtils();

  const generate = trpc.activationKeys.generate.useMutation({
    onSuccess: () => void utils.activationKeys.list.invalidate(),
  });
  const revoke = trpc.activationKeys.revoke.useMutation({
    onSuccess: () => void utils.activationKeys.list.invalidate(),
  });

  const columns: DataTableColumn<ActivationKeyDto>[] = [
    { key: "code", header: "Clé", value: (k) => k.code, render: (k) => <span className="font-mono">{k.code}</span> },
    { key: "roleLabel", header: "Rôle", value: (k) => k.roleLabel },
    {
      key: "status",
      header: "Statut",
      value: (k) => (k.status === "USED" ? "Utilisée" : "Non utilisée"),
      render: (k) => (
        <Badge variant={k.status === "USED" ? "muted" : "success"}>{k.status === "USED" ? "Utilisée" : "Non utilisée"}</Badge>
      ),
    },
    { key: "usedByName", header: "Utilisée par", value: (k) => k.usedByName ?? "—" },
    { key: "createdAt", header: "Générée le", value: (k) => k.createdAt.getTime(), render: (k) => k.createdAt.toLocaleDateString("fr-FR") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Clés d'activation</h2>
        <p className="text-sm text-muted-foreground">
          Générez des clés à distribuer à vos collaborateurs — chacune crée un compte avec le rôle choisi ici,
          dès sa première utilisation sur un poste. Réservé au Super Administrateur.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-md border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!roleId) return;
          generate.mutate({ roleId, count });
        }}
      >
        <FormField label="Rôle" required>
          <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Sélectionner…</option>
            {roles.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Nombre de clés" required>
          <Select value={String(count)} onChange={(e) => setCount(Number(e.target.value))}>
            {[1, 2, 3, 5, 10, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </FormField>
        <Button type="submit" disabled={!roleId || generate.isPending}>
          {generate.isPending ? "Génération…" : "Générer"}
        </Button>
      </form>
      {generate.error && <p className="text-sm text-destructive">{generate.error.message}</p>}

      {generate.data && generate.data.length > 0 && (
        <div className="rounded-md border border-success/40 bg-success/10 p-4 text-sm">
          <p className="mb-2 font-medium">Clés générées — à transmettre à vos collaborateurs :</p>
          <ul className="flex flex-col gap-1 font-mono">
            {generate.data.map((k) => (
              <li key={k.id}>{k.code}</li>
            ))}
          </ul>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={keys.data ?? []}
        getRowId={(k) => k.id}
        exportFilename="cles-activation"
        emptyMessage={keys.isLoading ? "Chargement…" : "Aucune clé générée."}
        rowActions={(k) =>
          k.status === "UNUSED" ? (
            <Button variant="outline" disabled={revoke.isPending} onClick={() => revoke.mutate({ id: k.id })}>
              Révoquer
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
