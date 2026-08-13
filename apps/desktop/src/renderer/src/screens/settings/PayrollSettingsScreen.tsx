import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";

/**
 * Réglages de la paie (MODULE-08 §1.11) — intégration comptable conditionnelle : aucune écriture
 * générée tant que le compte de charges de personnel n'est pas configuré ici (même principe que
 * les paiements et dépenses du Module 7, voir ADR-028).
 */
export function PayrollSettingsScreen() {
  const utils = trpc.useUtils();
  const query = trpc.payrollSettings.get.useQuery();
  const chartAccountsQuery = trpc.chartAccounts.list.useQuery({});
  const [salaryExpenseAccountId, setSalaryExpenseAccountId] = useState("");
  const [defaultHourlyRate, setDefaultHourlyRate] = useState("");
  const [defaultSessionDurationHours, setDefaultSessionDurationHours] = useState("");
  const [overtimeMultiplier, setOvertimeMultiplier] = useState("");
  const [monthlyHoursCap, setMonthlyHoursCap] = useState("");

  useEffect(() => {
    if (query.data) {
      setSalaryExpenseAccountId(query.data.salaryExpenseAccountId ?? "");
      setDefaultHourlyRate(query.data.defaultHourlyRate?.toString() ?? "");
      setDefaultSessionDurationHours(query.data.defaultSessionDurationHours?.toString() ?? "");
      setOvertimeMultiplier(query.data.overtimeMultiplier?.toString() ?? "");
      setMonthlyHoursCap(query.data.monthlyHoursCap?.toString() ?? "");
    }
  }, [query.data]);

  const update = trpc.payrollSettings.update.useMutation({
    onSuccess: () => void utils.payrollSettings.get.invalidate(),
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Réglages de la paie</h2>

      <Card>
        <CardHeader>
          <CardTitle>Intégration comptable</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Tant qu'aucun compte n'est sélectionné, les bulletins validés restent valides mais ne génèrent aucune
            écriture comptable — comme les paiements et dépenses non rattachés à un compte.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label>Compte de charges de personnel</Label>
            <Select value={salaryExpenseAccountId} onChange={(e) => setSalaryExpenseAccountId(e.target.value)}>
              <option value="">— Non configuré —</option>
              {(chartAccountsQuery.data ?? []).filter((a) => a.isActive).map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.label}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rémunération par défaut (Ressources Humaines)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Ces valeurs ne servent qu'à préremplir la fiche d'un nouvel employé — elles n'écrasent jamais un tarif
            déjà personnalisé et n'entrent dans aucun calcul de paie déjà en cours (voir MODULE-05.1 §1.8).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tarif horaire par défaut (GNF)</Label>
              <Input
                type="number"
                min={0}
                value={defaultHourlyRate}
                onChange={(e) => setDefaultHourlyRate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Durée standard d'une séance (heures)</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={defaultSessionDurationHours}
                onChange={(e) => setDefaultSessionDurationHours(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Heures supplémentaires & plafond mensuel (MODULE-05.2 §1.10)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Champs de configuration uniquement — aucun calcul automatique n'utilise encore ces valeurs tant que la
            règle exacte de déclenchement et de majoration n'a pas été précisée par le porteur du projet.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Majoration heures supplémentaires (ex. 1.25 = +25%)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={overtimeMultiplier}
                onChange={(e) => setOvertimeMultiplier(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Plafond mensuel d'heures par défaut</Label>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={monthlyHoursCap}
                onChange={(e) => setMonthlyHoursCap(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
      <div className="flex justify-end">
        <Button
          disabled={update.isPending}
          onClick={() =>
            update.mutate({
              salaryExpenseAccountId: salaryExpenseAccountId || null,
              defaultHourlyRate: defaultHourlyRate ? Number(defaultHourlyRate) : null,
              defaultSessionDurationHours: defaultSessionDurationHours ? Number(defaultSessionDurationHours) : null,
              overtimeMultiplier: overtimeMultiplier ? Number(overtimeMultiplier) : null,
              monthlyHoursCap: monthlyHoursCap ? Number(monthlyHoursCap) : null,
            })
          }
        >
          {update.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
