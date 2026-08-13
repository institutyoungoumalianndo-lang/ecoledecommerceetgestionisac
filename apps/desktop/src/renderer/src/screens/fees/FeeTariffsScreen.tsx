import type { EnrollmentStatus, FeeTariffDto, LatePenaltyType } from "@isac-erp/shared";
import { Badge, Button, Card, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const STATUS_LABELS: Record<EnrollmentStatus, string> = {
  NOUVEAU: "Nouveau",
  ANCIEN: "Ancien",
  REDOUBLANT: "Redoublant",
  TRANSFERT: "Transfert",
  REPRISE: "Reprise",
};

/** Tarifs (MODULE-04.2 §6.3/§6.8) — le plus spécifique (filière/niveau/classe/statut) l'emporte à la résolution. */
export function FeeTariffsScreen() {
  const utils = trpc.useUtils();
  const [academicYearId, setAcademicYearId] = useState("");
  const [feeTypeId, setFeeTypeId] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [classId, setClassId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [amountTarget, setAmountTarget] = useState<FeeTariffDto | null>(null);
  const [planTarget, setPlanTarget] = useState<FeeTariffDto | null>(null);

  const canCreate = useHasPermission("FRAIS:CREATION");
  const canModify = useHasPermission("FRAIS:MODIFICATION");
  const canDeactivate = useHasPermission("FRAIS:SUPPRESSION");

  const feeTypesQuery = trpc.feeTypes.list.useQuery();
  const yearsQuery = trpc.academicYears.list.useQuery();
  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const classesQuery = trpc.schoolClasses.list.useQuery({});

  const filter = {
    academicYearId: academicYearId || undefined,
    feeTypeId: feeTypeId || undefined,
    filiereId: filiereId || undefined,
    levelId: levelId || undefined,
    classId: classId || undefined,
    includeInactive: true,
  };
  const tariffsQuery = trpc.feeTariffs.list.useQuery(filter);

  function invalidate() {
    void utils.feeTariffs.list.invalidate();
  }
  const deactivate = trpc.feeTariffs.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.feeTariffs.reactivate.useMutation({ onSuccess: invalidate });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Tarifs</h2>
        {canCreate && <Button onClick={() => setCreateOpen(true)}>Nouveau tarif</Button>}
      </div>

      <Card variant="static" className="grid grid-cols-2 gap-3 p-4 md:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <Label>Année</Label>
          <Select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
            <option value="">Toutes</option>
            {(yearsQuery.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Type de frais</Label>
          <Select value={feeTypeId} onChange={(e) => setFeeTypeId(e.target.value)}>
            <option value="">Tous</option>
            {(feeTypesQuery.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Filière</Label>
          <Select value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
            <option value="">Toutes</option>
            {(filieresQuery.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Niveau</Label>
          <Select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
            <option value="">Tous</option>
            {(levelsQuery.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Classe</Label>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Toutes</option>
            {(classesQuery.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Type</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Année</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Filière</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Niveau</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Classe</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Statut étudiant</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Montant</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Échéancier</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Statut</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(tariffsQuery.data ?? []).length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">
                  {tariffsQuery.isLoading ? "Chargement…" : "Aucun tarif."}
                </td>
              </tr>
            ) : (
              (tariffsQuery.data ?? []).map((t) => (
                <tr key={t.id} className="border-t border-border even:bg-primary/5">
                  <td className="px-3 py-2">{t.feeTypeName}</td>
                  <td className="px-3 py-2">{t.academicYearLabel}</td>
                  <td className="px-3 py-2">{t.filiereName ?? "Toutes"}</td>
                  <td className="px-3 py-2">{t.levelLabel ?? "Tous"}</td>
                  <td className="px-3 py-2">{t.className ?? "Toutes"}</td>
                  <td className="px-3 py-2">{t.targetEnrollmentStatus ? STATUS_LABELS[t.targetEnrollmentStatus] : "Tous"}</td>
                  <td className="px-3 py-2 font-medium">{t.amount.toLocaleString("fr-FR")}</td>
                  <td className="px-3 py-2">
                    {t.installmentPlan ? (
                      <Badge variant="success">{t.installmentPlan.installmentCount} versements</Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={t.isActive ? "success" : "muted"}>{t.isActive ? "Actif" : "Inactif"}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {canModify && (
                        <>
                          <Button variant="outline" onClick={() => setAmountTarget(t)}>Montant</Button>
                          <Button variant="outline" onClick={() => setPlanTarget(t)}>Échéancier</Button>
                        </>
                      )}
                      {canDeactivate &&
                        (t.isActive ? (
                          <Button variant="destructive" onClick={() => deactivate.mutate({ id: t.id })}>Désactiver</Button>
                        ) : (
                          <Button variant="success" onClick={() => reactivate.mutate({ id: t.id })}>Réactiver</Button>
                        ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen && <CreateTariffDialog onClose={() => setCreateOpen(false)} />}
      {amountTarget && <EditAmountDialog tariff={amountTarget} onClose={() => setAmountTarget(null)} />}
      {planTarget && <InstallmentPlanDialog tariff={planTarget} onClose={() => setPlanTarget(null)} />}
    </div>
  );
}

function CreateTariffDialog({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [feeTypeId, setFeeTypeId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [classId, setClassId] = useState("");
  const [targetEnrollmentStatus, setTargetEnrollmentStatus] = useState("");
  const [amount, setAmount] = useState("");

  const feeTypesQuery = trpc.feeTypes.list.useQuery();
  const yearsQuery = trpc.academicYears.list.useQuery();
  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const classesQuery = trpc.schoolClasses.list.useQuery({});

  const create = trpc.feeTariffs.create.useMutation({
    onSuccess: () => {
      void utils.feeTariffs.list.invalidate();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nouveau tarif">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Type de frais</Label>
          <Select value={feeTypeId} onChange={(e) => setFeeTypeId(e.target.value)}>
            <option value="">—</option>
            {(feeTypesQuery.data ?? []).filter((f) => f.isActive).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Année universitaire</Label>
          <Select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
            <option value="">—</option>
            {(yearsQuery.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          Laissez vide filière/niveau/classe/statut pour un tarif générique — le tarif le plus précis l'emporte
          automatiquement pour un étudiant donné.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Filière (optionnel)</Label>
            <Select value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
              <option value="">Toutes</option>
              {(filieresQuery.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Niveau (optionnel)</Label>
            <Select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">Tous</option>
              {(levelsQuery.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Classe (optionnel)</Label>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Toutes</option>
              {(classesQuery.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Statut étudiant (optionnel)</Label>
            <Select value={targetEnrollmentStatus} onChange={(e) => setTargetEnrollmentStatus(e.target.value)}>
              <option value="">Tous</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Montant</Label>
          <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={!feeTypeId || !academicYearId || !amount || create.isPending}
            onClick={() =>
              create.mutate({
                feeTypeId,
                academicYearId,
                filiereId: filiereId || undefined,
                levelId: levelId || undefined,
                classId: classId || undefined,
                targetEnrollmentStatus: (targetEnrollmentStatus || undefined) as EnrollmentStatus | undefined,
                amount: Number(amount),
              })
            }
          >
            {create.isPending ? "Création…" : "Créer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function EditAmountDialog({ tariff, onClose }: { tariff: FeeTariffDto; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [amount, setAmount] = useState(String(tariff.amount));
  const [justification, setJustification] = useState("");

  const update = trpc.feeTariffs.updateAmount.useMutation({
    onSuccess: () => {
      void utils.feeTariffs.list.invalidate();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title={`Modifier le montant — ${tariff.feeTypeName}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Nouveau montant</Label>
          <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Justification (obligatoire — conservée dans l'historique)</Label>
          <Input value={justification} onChange={(e) => setJustification(e.target.value)} />
        </div>
        {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={!amount || !justification.trim() || update.isPending}
            onClick={() => update.mutate({ id: tariff.id, amount: Number(amount), justification })}
          >
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function InstallmentPlanDialog({ tariff, onClose }: { tariff: FeeTariffDto; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [installmentCount, setInstallmentCount] = useState(tariff.installmentPlan?.installmentCount ?? 1);
  const [latePenaltyType, setLatePenaltyType] = useState<LatePenaltyType>(tariff.installmentPlan?.latePenaltyType ?? "AUCUNE");
  const [latePenaltyValue, setLatePenaltyValue] = useState(String(tariff.installmentPlan?.latePenaltyValue ?? ""));
  const [gracePeriodDays, setGracePeriodDays] = useState(tariff.installmentPlan?.gracePeriodDays ?? 0);
  const [rows, setRows] = useState<{ dueDate: string; amount: string }[]>(
    tariff.installmentPlan?.installments.map((i) => ({
      dueDate: i.dueDate.toISOString().slice(0, 10),
      amount: String(i.amount),
    })) ?? [{ dueDate: "", amount: "" }]
  );

  function resizeRows(count: number) {
    setInstallmentCount(count);
    setRows((prev) => {
      const next = [...prev];
      while (next.length < count) next.push({ dueDate: "", amount: "" });
      return next.slice(0, count);
    });
  }

  const setPlan = trpc.feeTariffs.setInstallmentPlan.useMutation({
    onSuccess: () => {
      void utils.feeTariffs.list.invalidate();
      onClose();
    },
  });
  const removePlan = trpc.feeTariffs.removeInstallmentPlan.useMutation({
    onSuccess: () => {
      void utils.feeTariffs.list.invalidate();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title={`Échéancier — ${tariff.feeTypeName}`} className="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Nombre de versements</Label>
            <Input type="number" min={1} value={installmentCount} onChange={(e) => resizeRows(Number(e.target.value) || 1)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Pénalité de retard</Label>
            <Select value={latePenaltyType} onChange={(e) => setLatePenaltyType(e.target.value as LatePenaltyType)}>
              <option value="AUCUNE">Aucune</option>
              <option value="MONTANT_FIXE">Montant fixe</option>
              <option value="POURCENTAGE">Pourcentage</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Délai de grâce (jours)</Label>
            <Input type="number" min={0} value={gracePeriodDays} onChange={(e) => setGracePeriodDays(Number(e.target.value) || 0)} />
          </div>
        </div>
        {latePenaltyType !== "AUCUNE" && (
          <div className="flex flex-col gap-1.5">
            <Label>Valeur de la pénalité</Label>
            <Input type="number" min={0} value={latePenaltyValue} onChange={(e) => setLatePenaltyValue(e.target.value)} />
          </div>
        )}

        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Échéance {index + 1} — date</Label>
                <Input
                  type="date"
                  value={row.dueDate}
                  onChange={(e) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, dueDate: e.target.value } : r)))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Montant</Label>
                <Input
                  type="number"
                  min={0}
                  value={row.amount}
                  onChange={(e) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, amount: e.target.value } : r)))}
                />
              </div>
            </div>
          ))}
        </div>

        {setPlan.error && <p className="text-sm text-destructive">{setPlan.error.message}</p>}
        <div className="flex justify-between gap-2">
          {tariff.installmentPlan && (
            <Button variant="destructive" onClick={() => removePlan.mutate({ id: tariff.id })} disabled={removePlan.isPending}>
              Supprimer l'échéancier
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button
              disabled={rows.some((r) => !r.dueDate || !r.amount) || setPlan.isPending}
              onClick={() =>
                setPlan.mutate({
                  feeTariffId: tariff.id,
                  latePenaltyType,
                  latePenaltyValue: latePenaltyType === "AUCUNE" ? undefined : Number(latePenaltyValue) || 0,
                  gracePeriodDays,
                  installments: rows.map((r, i) => ({
                    orderIndex: i + 1,
                    dueDate: new Date(r.dueDate),
                    amount: Number(r.amount),
                  })),
                })
              }
            >
              {setPlan.isPending ? "Enregistrement…" : "Enregistrer l'échéancier"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
