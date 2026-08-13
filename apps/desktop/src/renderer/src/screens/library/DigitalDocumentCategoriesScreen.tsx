import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateDigitalDocumentCategoryInput,
  type DigitalDocumentCategoryDto,
  createDigitalDocumentCategoryInputSchema,
} from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

/** Référentiel de catégories de documents numériques (MODULE-13 §5.1) — distinct des catégories d'ouvrages physiques. */
export function DigitalDocumentCategoriesScreen() {
  const utils = trpc.useUtils();
  const canAdminister = useHasPermission("BIBLIOTHEQUE_NUMERIQUE:ADMINISTRATION");
  const query = trpc.digitalDocumentCategories.list.useQuery({});
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.digitalDocumentCategories.list.invalidate();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDigitalDocumentCategoryInput>({ resolver: zodResolver(createDigitalDocumentCategoryInputSchema) });

  const create = trpc.digitalDocumentCategories.create.useMutation({
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      reset();
    },
  });
  const update = trpc.digitalDocumentCategories.update.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<DigitalDocumentCategoryDto>[] = [
    { key: "name", header: "Catégorie", value: (c) => c.name },
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
        <h2 className="text-lg font-semibold text-foreground">Catégories de documents numériques</h2>
        {canAdminister && <Button onClick={() => setCreateOpen(true)}>Nouvelle catégorie</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(c) => c.id}
        exportFilename="categories-documents-numeriques"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune catégorie."}
        rowActions={
          canAdminister
            ? (c) =>
                c.isActive ? (
                  <Button variant="destructive" onClick={() => update.mutate({ id: c.id, isActive: false })}>
                    Désactiver
                  </Button>
                ) : (
                  <Button variant="success" onClick={() => update.mutate({ id: c.id, isActive: true })}>
                    Réactiver
                  </Button>
                )
            : undefined
        }
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Créer une catégorie">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <FormField label="Nom" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="Support de cours, Circulaire…" />
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
    </div>
  );
}
