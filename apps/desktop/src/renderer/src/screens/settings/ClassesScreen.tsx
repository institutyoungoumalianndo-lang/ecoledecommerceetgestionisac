import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateSchoolClassInput,
  type SchoolClassDto,
  createSchoolClassInputSchema,
} from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input, Select } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

/** Classes (§3.11), rattachées à une filière, un niveau et une année. */
export function ClassesScreen() {
  const utils = trpc.useUtils();
  const query = trpc.schoolClasses.list.useQuery({});
  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const yearsQuery = trpc.academicYears.list.useQuery();
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.schoolClasses.list.invalidate();
  }

  const create = trpc.schoolClasses.create.useMutation({ onSuccess: () => { invalidate(); setCreateOpen(false); } });
  const deactivate = trpc.schoolClasses.deactivate.useMutation({ onSuccess: invalidate });
  const reactivate = trpc.schoolClasses.reactivate.useMutation({ onSuccess: invalidate });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSchoolClassInput>({ resolver: zodResolver(createSchoolClassInputSchema) });

  const filiereById = new Map((filieresQuery.data ?? []).map((f) => [f.id, f]));
  const levelById = new Map((levelsQuery.data ?? []).map((l) => [l.id, l]));
  const yearById = new Map((yearsQuery.data ?? []).map((y) => [y.id, y]));

  const columns: DataTableColumn<SchoolClassDto>[] = [
    { key: "code", header: "Code", value: (c) => c.code },
    { key: "name", header: "Nom", value: (c) => c.name },
    { key: "filiere", header: "Filière", value: (c) => filiereById.get(c.filiereId)?.name ?? "—" },
    { key: "level", header: "Niveau", value: (c) => levelById.get(c.levelId)?.label ?? "—" },
    { key: "year", header: "Année", value: (c) => yearById.get(c.academicYearId)?.label ?? "—" },
    { key: "capacity", header: "Capacité", value: (c) => c.maxCapacity ?? "—" },
    {
      key: "status",
      header: "Statut",
      value: (c) => (c.isActive ? "Active" : "Inactive"),
      render: (c) => <Badge variant={c.isActive ? "success" : "muted"}>{c.isActive ? "Active" : "Inactive"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Classes</h2>
        <Button onClick={() => setCreateOpen(true)}>Nouvelle classe</Button>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(c) => c.id}
        exportFilename="classes"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune classe."}
        rowActions={(c) =>
          c.isActive ? (
            <Button variant="destructive" onClick={() => deactivate.mutate({ id: c.id })}>
              Désactiver
            </Button>
          ) : (
            <Button variant="success" onClick={() => reactivate.mutate({ id: c.id })}>
              Réactiver
            </Button>
          )
        }
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer une classe">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Code" required error={errors.code?.message}>
              <Input {...register("code")} />
            </FormField>
            <FormField label="Nom" required error={errors.name?.message}>
              <Input {...register("name")} />
            </FormField>
          </div>
          <FormField label="Filière" required>
            <Select {...register("filiereId")}>
              <option value="">—</option>
              {(filieresQuery.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Niveau" required>
            <Select {...register("levelId")}>
              <option value="">—</option>
              {(levelsQuery.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Année universitaire" required>
            <Select {...register("academicYearId")}>
              <option value="">—</option>
              {(yearsQuery.data ?? []).map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Capacité maximale">
              <Input type="number" {...register("maxCapacity", { valueAsNumber: true })} />
            </FormField>
            <FormField label="Salle principale">
              <Input {...register("mainRoom")} />
            </FormField>
          </div>
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
    </div>
  );
}
