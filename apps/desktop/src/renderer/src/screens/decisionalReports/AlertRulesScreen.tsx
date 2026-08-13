import type { AlertComparator, AlertEventDto, AlertRuleDto } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const METRIC_TYPE_OPTIONS = [
  { value: "TRESORERIE_DISPONIBLE", label: "Trésorerie disponible (GNF)" },
  { value: "IMPAYES_EN_RETARD_MONTANT", label: "Impayés en retard, montant (GNF)" },
  { value: "TAUX_OCCUPATION_CLASSE_MAX", label: "Taux d'occupation d'une classe (%)" },
  { value: "MASSE_SALARIALE_MENSUELLE", label: "Masse salariale mensuelle (GNF)" },
];

const COMPARATOR_LABELS: Record<AlertComparator, string> = {
  LT: "inférieur à",
  LTE: "inférieur ou égal à",
  GT: "supérieur à",
  GTE: "supérieur ou égal à",
};

function metricLabel(metricType: string): string {
  return METRIC_TYPE_OPTIONS.find((m) => m.value === metricType)?.label ?? metricType;
}

/**
 * Configuration des règles d'alerte (MODULE-10 §1.3/§2) — jamais de seuil codé en dur. Alertes
 * publiées dans le centre de notifications interne uniquement (décision du porteur du projet,
 * 2026-08-06) — pas de canal SMS/E-mail en v1.
 */
export function AlertRulesScreen() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRule, setEditRule] = useState<AlertRuleDto | null>(null);

  const canModify = useHasPermission("ALERTES:MODIFICATION");
  const utils = trpc.useUtils();
  const rulesQuery = trpc.alertRules.list.useQuery();
  const eventsQuery = trpc.alertRules.listEvents.useQuery({});

  const update = trpc.alertRules.update.useMutation({ onSuccess: () => void utils.alertRules.list.invalidate() });

  const ruleColumns: DataTableColumn<AlertRuleDto>[] = [
    { key: "label", header: "Règle", value: (r) => r.label },
    { key: "metricType", header: "Métrique", value: (r) => metricLabel(r.metricType) },
    {
      key: "condition",
      header: "Condition",
      value: (r) => `${COMPARATOR_LABELS[r.comparator]} ${r.threshold}`,
    },
    {
      key: "status",
      header: "Statut",
      value: (r) => (r.isActive ? "Active" : "Inactive"),
      render: (r) => <Badge variant={r.isActive ? "success" : "muted"}>{r.isActive ? "Active" : "Inactive"}</Badge>,
    },
  ];

  const eventColumns: DataTableColumn<AlertEventDto>[] = [
    { key: "ruleLabel", header: "Règle", value: (e) => e.ruleLabel },
    { key: "value", header: "Valeur mesurée", value: (e) => e.value, render: (e) => e.value.toLocaleString("fr-FR") },
    { key: "triggeredAt", header: "Déclenchée le", value: (e) => e.triggeredAt.getTime(), render: (e) => e.triggeredAt.toLocaleString("fr-FR") },
    {
      key: "status",
      header: "Statut",
      value: (e) => (e.resolvedAt ? "Résolue" : "En cours"),
      render: (e) => <Badge variant={e.resolvedAt ? "muted" : "destructive"}>{e.resolvedAt ? "Résolue" : "En cours"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Règles d'alerte</h2>
        {canModify && <Button onClick={() => setCreateOpen(true)}>Nouvelle règle</Button>}
      </div>

      <DataTable
        columns={ruleColumns}
        rows={rulesQuery.data ?? []}
        getRowId={(r) => r.id}
        exportFilename="regles-alerte"
        emptyMessage={rulesQuery.isLoading ? "Chargement…" : "Aucune règle d'alerte."}
        rowActions={
          canModify
            ? (r) => (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditRule(r)}>
                    Modifier
                  </Button>
                  <Button variant="outline" onClick={() => update.mutate({ id: r.id, isActive: !r.isActive })}>
                    {r.isActive ? "Désactiver" : "Activer"}
                  </Button>
                </div>
              )
            : undefined
        }
      />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">Historique des déclenchements</h3>
        <DataTable
          columns={eventColumns}
          rows={eventsQuery.data ?? []}
          getRowId={(e) => e.id}
          exportFilename="historique-alertes"
          emptyMessage={eventsQuery.isLoading ? "Chargement…" : "Aucune alerte déclenchée."}
        />
      </div>

      {createOpen && <AlertRuleDialog onClose={() => setCreateOpen(false)} />}
      {editRule && <AlertRuleDialog rule={editRule} onClose={() => setEditRule(null)} />}
    </div>
  );
}

function AlertRuleDialog({ rule, onClose }: { rule?: AlertRuleDto; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [code, setCode] = useState(rule?.code ?? "");
  const [label, setLabel] = useState(rule?.label ?? "");
  const [metricType, setMetricType] = useState(rule?.metricType ?? METRIC_TYPE_OPTIONS[0]!.value);
  const [comparator, setComparator] = useState<AlertComparator>(rule?.comparator ?? "GT");
  const [threshold, setThreshold] = useState(String(rule?.threshold ?? "0"));

  const create = trpc.alertRules.create.useMutation({
    onSuccess: () => {
      void utils.alertRules.list.invalidate();
      onClose();
    },
  });
  const update = trpc.alertRules.update.useMutation({
    onSuccess: () => {
      void utils.alertRules.list.invalidate();
      onClose();
    },
  });

  const canSubmit = Boolean(label && (rule || code) && Number(threshold) >= 0);
  const isPending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  function submit() {
    if (rule) {
      update.mutate({ id: rule.id, label, comparator, threshold: Number(threshold) });
    } else {
      create.mutate({ code, label, metricType, comparator, threshold: Number(threshold), channels: ["INTERNE"] });
    }
  }

  return (
    <Dialog open onClose={onClose} title={rule ? "Modifier la règle d'alerte" : "Nouvelle règle d'alerte"}>
      <div className="flex flex-col gap-4">
        {!rule && (
          <div className="flex flex-col gap-1.5">
            <Label>Code (identifiant technique unique)</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EX_TRESORERIE_BASSE" />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label>Libellé</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        {!rule && (
          <div className="flex flex-col gap-1.5">
            <Label>Métrique</Label>
            <Select value={metricType} onChange={(e) => setMetricType(e.target.value)}>
              {METRIC_TYPE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Condition</Label>
            <Select value={comparator} onChange={(e) => setComparator(e.target.value as AlertComparator)}>
              {(Object.keys(COMPARATOR_LABELS) as AlertComparator[]).map((c) => (
                <option key={c} value={c}>{COMPARATOR_LABELS[c]}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Seuil</Label>
            <Input type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={!canSubmit || isPending} onClick={submit}>
            {isPending ? "Enregistrement…" : rule ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
