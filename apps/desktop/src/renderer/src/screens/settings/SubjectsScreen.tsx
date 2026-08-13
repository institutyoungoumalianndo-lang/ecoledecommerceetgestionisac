import { zodResolver } from "@hookform/resolvers/zod";
import { type CreateSubjectInput, type SubjectDto, createSubjectInputSchema } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { CreateSubjectOfferingDialog } from "./CreateSubjectOfferingDialog";
import { SubjectImportWizard } from "./SubjectImportWizard";

/** Matières (MODULE-02.1 §1.2/§9.7) — identité partagée, réutilisable par plusieurs filières. */
export function SubjectsScreen() {
  const utils = trpc.useUtils();
  const query = trpc.subjects.list.useQuery({ includeInactive: true });
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [affectSubjectId, setAffectSubjectId] = useState<string | null>(null);
  const canCreate = useHasPermission("MATIERES:CREATION");
  const canModify = useHasPermission("MATIERES:MODIFICATION");
  const canImport = useHasPermission("MATIERES_IMPORT:CREATION");

  function invalidate() {
    void utils.subjects.list.invalidate();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSubjectInput>({ resolver: zodResolver(createSubjectInputSchema) });

  const create = trpc.subjects.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      reset();
    },
  });
  const deactivate = trpc.subjects.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.subjects.reactivate.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<SubjectDto>[] = [
    { key: "code", header: "Code", value: (s) => s.code },
    { key: "name", header: "Nom", value: (s) => s.name },
    { key: "description", header: "Description", value: (s) => s.description ?? "—" },
    { key: "credits", header: "Crédits (ECTS)", value: (s) => s.credits ?? "", render: (s) => (s.credits ?? "—") },
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
        <h2 className="text-lg font-semibold text-foreground">Matières</h2>
        <div className="flex gap-2">
          {canImport && (
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Import Excel/CSV
            </Button>
          )}
          {canCreate && <Button onClick={() => setCreateOpen(true)}>Nouvelle matière</Button>}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(s) => s.id}
        exportFilename="matieres"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune matière."}
        rowActions={(s) => (
          <div className="flex justify-end gap-2">
            {canCreate && (
              <Button variant="outline" onClick={() => setAffectSubjectId(s.id)}>
                Affecter
              </Button>
            )}
            {canModify &&
              (s.isActive ? (
                <Button variant="outline" onClick={() => deactivate.mutate({ id: s.id })}>
                  Désactiver
                </Button>
              ) : (
                <Button variant="outline" onClick={() => reactivate.mutate({ id: s.id })}>
                  Réactiver
                </Button>
              ))}
          </div>
        )}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer une matière">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <FormField label="Code" required error={errors.code?.message}>
            <Input {...register("code")} />
          </FormField>
          <FormField label="Nom" required error={errors.name?.message}>
            <Input {...register("name")} />
          </FormField>
          <FormField label="Description">
            <Input {...register("description")} />
          </FormField>
          <FormField label="Crédits (ECTS)">
            <Input type="number" min={0} step="0.5" {...register("credits", { valueAsNumber: true })} />
          </FormField>
          {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Création…" : "Créer"}
            </Button>
          </div>
        </form>
      </Dialog>

      {importOpen && <SubjectImportWizard onClose={() => setImportOpen(false)} />}

      {affectSubjectId && (
        <CreateSubjectOfferingDialog initialSubjectId={affectSubjectId} onClose={() => setAffectSubjectId(null)} />
      )}
    </div>
  );
}
