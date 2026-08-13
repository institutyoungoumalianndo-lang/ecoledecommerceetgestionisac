import { zodResolver } from "@hookform/resolvers/zod";
import { type BookDto, type CreateBookInput, createBookInputSchema } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input, Select } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

/** Catalogue d'ouvrages (MODULE-13 §1.1). */
export function BooksScreen({ onOpenBook }: { onOpenBook: (id: string) => void }) {
  const utils = trpc.useUtils();
  const canCreate = useHasPermission("BIBLIOTHEQUE:CREATION");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const query = trpc.books.list.useQuery({ categoryId: categoryId || undefined, search: search || undefined });
  const categoriesQuery = trpc.bookCategories.list.useQuery({ activeOnly: true });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBookInput>({ resolver: zodResolver(createBookInputSchema) });

  const create = trpc.books.create.useMutation({
    onSuccess: () => {
      void utils.books.list.invalidate();
      setCreateOpen(false);
      reset();
    },
  });

  const columns: DataTableColumn<BookDto>[] = [
    { key: "title", header: "Titre", value: (b) => b.title },
    { key: "author", header: "Auteur", value: (b) => b.author ?? "—" },
    { key: "categoryName", header: "Catégorie", value: (b) => b.categoryName },
    {
      key: "copies",
      header: "Exemplaires",
      value: (b) => b.copyCount,
      render: (b) => (
        <span>
          {b.availableCopyCount} / {b.copyCount} disponible{b.availableCopyCount > 1 ? "s" : ""}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Ouvrages</h2>
        {canCreate && <Button onClick={() => setCreateOpen(true)}>Nouvel ouvrage</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Input placeholder="Rechercher (titre, auteur, ISBN)…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {categoriesQuery.data?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(b) => b.id}
        exportFilename="ouvrages"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun ouvrage."}
        rowActions={(b) => (
          <Button variant="outline" onClick={() => onOpenBook(b.id)}>
            Ouvrir
          </Button>
        )}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Enregistrer un ouvrage">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
          <FormField label="Titre" required error={errors.title?.message}>
            <Input {...register("title")} />
          </FormField>
          <FormField label="Auteur" error={errors.author?.message}>
            <Input {...register("author")} />
          </FormField>
          <FormField label="Catégorie" required error={errors.categoryId?.message}>
            <Select {...register("categoryId")}>
              <option value="">Sélectionner…</option>
              {categoriesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Description" error={errors.description?.message}>
            <Input {...register("description")} />
          </FormField>
          <FormField label="Éditeur" error={errors.publisher?.message}>
            <Input {...register("publisher")} />
          </FormField>
          <FormField label="Année de publication" error={errors.publicationYear?.message}>
            <Input type="number" {...register("publicationYear", { valueAsNumber: true })} />
          </FormField>
          <FormField label="ISBN" error={errors.isbn?.message}>
            <Input {...register("isbn")} />
          </FormField>
          {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
