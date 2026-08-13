import { zodResolver } from "@hookform/resolvers/zod";
import {
  type AcademicYearDto,
  type CreateAcademicYearInput,
  type CreateAcademicPeriodInput,
  createAcademicYearInputSchema,
  createAcademicPeriodInputSchema,
} from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/** Années universitaires (§3.8) et semestres/périodes (§3.9). */
export function AcademicYearsScreen() {
  const utils = trpc.useUtils();
  const yearsQuery = trpc.academicYears.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [periodsYear, setPeriodsYear] = useState<AcademicYearDto | null>(null);

  function invalidate() {
    void utils.academicYears.list.invalidate();
  }

  // Changer l'année active/clôturée affecte presque tous les autres écrans (tableau de bord, etc.) qui
  // se basent sur "l'année active" sans sélecteur explicite — invalidation complète du cache plutôt que
  // seulement `academicYears.list` (2026-08-09, retour du porteur du projet : ces écrans restaient
  // affichés avec les anciennes données après un changement d'année).
  function invalidateEverything() {
    void utils.invalidate();
  }

  const createYear = trpc.academicYears.create.useMutation({
    onSuccess: () => {
      invalidateEverything();
      setCreateOpen(false);
    },
  });
  const activateYear = trpc.academicYears.activate.useMutation({ onSuccess: invalidateEverything });
  const closeYear = trpc.academicYears.close.useMutation({ onSuccess: invalidateEverything });
  const reopenYear = trpc.academicYears.reopen.useMutation({ onSuccess: invalidateEverything });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAcademicYearInput>({ resolver: zodResolver(createAcademicYearInputSchema) });

  const columns: DataTableColumn<AcademicYearDto>[] = [
    { key: "label", header: "Année", value: (y) => y.label },
    {
      key: "startDate",
      header: "Début",
      value: (y) => y.startDate.toLocaleDateString("fr-FR"),
    },
    { key: "endDate", header: "Fin", value: (y) => y.endDate.toLocaleDateString("fr-FR") },
    {
      key: "status",
      header: "Statut",
      value: (y) => (y.isActive ? "Active" : y.isClosed ? "Clôturée" : "Inactive"),
      render: (y) => (
        <Badge variant={y.isActive ? "success" : y.isClosed ? "muted" : "default"}>
          {y.isActive ? "Active" : y.isClosed ? "Clôturée" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Années universitaires</h2>
        <Button onClick={() => setCreateOpen(true)}>Nouvelle année</Button>
      </div>

      <DataTable
        columns={columns}
        rows={yearsQuery.data ?? []}
        getRowId={(y) => y.id}
        exportFilename="annees-universitaires"
        emptyMessage={yearsQuery.isLoading ? "Chargement…" : "Aucune année."}
        rowActions={(y) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPeriodsYear(y)}>
              Périodes
            </Button>
            {!y.isActive && (
              <Button variant="success" onClick={() => activateYear.mutate({ id: y.id })}>
                Activer
              </Button>
            )}
            {!y.isClosed ? (
              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm(`Clôturer l'année ${y.label} ? Cette action bloque toute saisie.`)) {
                    closeYear.mutate({ id: y.id });
                  }
                }}
              >
                Clôturer
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm(`Réouvrir l'année ${y.label} ?`)) {
                    reopenYear.mutate({ id: y.id });
                  }
                }}
              >
                Réouvrir
              </Button>
            )}
          </div>
        )}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer une année universitaire">
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSubmit((values) => {
            createYear.mutate(values);
            reset();
          })}
        >
          <FormField label="Libellé" required error={errors.label?.message} hint="Ex. 2026-2027">
            <Input placeholder="2026-2027" {...register("label")} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date de début" required>
              <Input type="date" {...register("startDate", { valueAsDate: true })} />
            </FormField>
            <FormField label="Date de fin" required error={errors.endDate?.message}>
              <Input type="date" {...register("endDate", { valueAsDate: true })} />
            </FormField>
          </div>
          {createYear.error && <p className="text-sm text-destructive">{createYear.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createYear.isPending}>
              {createYear.isPending ? "Création…" : "Créer"}
            </Button>
          </div>
        </form>
      </Dialog>

      {periodsYear && (
        <PeriodsDialog year={periodsYear} onClose={() => setPeriodsYear(null)} />
      )}
    </div>
  );
}

function PeriodsDialog({ year, onClose }: { year: AcademicYearDto; onClose: () => void }) {
  const utils = trpc.useUtils();
  const periodsQuery = trpc.academicPeriods.list.useQuery({ academicYearId: year.id });
  const createPeriod = trpc.academicPeriods.create.useMutation({
    onSuccess: () => void utils.academicPeriods.list.invalidate({ academicYearId: year.id }),
  });
  const deletePeriod = trpc.academicPeriods.delete.useMutation({
    onSuccess: () => void utils.academicPeriods.list.invalidate({ academicYearId: year.id }),
  });

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<CreateAcademicPeriodInput>({
    resolver: zodResolver(createAcademicPeriodInputSchema),
    defaultValues: { academicYearId: year.id, orderIndex: (periodsQuery.data?.length ?? 0) + 1 },
  });

  return (
    <Dialog open onClose={onClose} title={`Périodes — ${year.label}`}>
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {(periodsQuery.data ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
              <span>
                {p.label} ({p.code}) — {p.startDate.toLocaleDateString("fr-FR")} au{" "}
                {p.endDate.toLocaleDateString("fr-FR")}
              </span>
              <Button variant="destructive" onClick={() => deletePeriod.mutate({ id: p.id })}>
                Supprimer
              </Button>
            </li>
          ))}
          {periodsQuery.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune période — découpage libre (semestres, trimestres...).</p>
          )}
        </ul>

        <form
          className="grid grid-cols-2 gap-3"
          onSubmit={handleSubmit((values) => {
            createPeriod.mutate({ ...values, academicYearId: year.id });
            reset({ academicYearId: year.id, orderIndex: values.orderIndex + 1 });
          })}
        >
          <Input placeholder="Code (ex. S1)" {...register("code")} />
          <Input placeholder="Libellé (ex. Semestre 1)" {...register("label")} />
          <Input type="date" {...register("startDate", { valueAsDate: true })} />
          <Input type="date" {...register("endDate", { valueAsDate: true })} />
          <input type="hidden" {...register("orderIndex", { valueAsNumber: true })} />
          {createPeriod.error && (
            <p className="col-span-2 text-sm text-destructive">{createPeriod.error.message}</p>
          )}
          <Button type="submit" className="col-span-2" disabled={createPeriod.isPending}>
            Ajouter une période
          </Button>
        </form>

        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </Dialog>
  );
}
