"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { BookCategoryDto, BookDto, CreateBookInput, LoanDto } from "@isac-erp/shared";
import { createBookInputSchema } from "@isac-erp/shared";
import { Badge, Button, Card, DataTable, type DataTableColumn, Dialog, FormField, Input, Select, Tabs } from "@isac-erp/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { trpcClient } from "../../../../lib/trpc";

type TabKey = "ouvrages" | "emprunts";

const LOAN_STATUS_LABELS = { EN_COURS: "En cours", RENDU: "Rendu", PERDU: "Perdu" } as const;

function isOverdue(loan: LoanDto): boolean {
  return loan.status === "EN_COURS" && new Date(loan.dueDate).getTime() < Date.now();
}

/**
 * Bibliothèque (MODULE-13 §1.1-1.2), portée au portail Super Administrateur — réutilise directement
 * `books.list`/`books.create`/`loans.list`/`loans.return` (déjà `permissionProcedure`, contournés par
 * le rôle Super Admin) et le même modèle que `BooksScreen.tsx`/`LoansScreen.tsx` (desktop).
 */
export default function AdminLibraryPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("ouvrages");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <h1 className="text-lg font-semibold text-window-foreground">Bibliothèque</h1>

      <Card variant="static" className="p-4">
        <Tabs
          items={[
            { key: "ouvrages", label: "Ouvrages" },
            { key: "emprunts", label: "Emprunts" },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
        />
        <div className="pt-4">
          {activeTab === "ouvrages" && <BooksTab />}
          {activeTab === "emprunts" && <LoansTab />}
        </div>
      </Card>
    </div>
  );
}

function BooksTab() {
  const router = useRouter();
  const [books, setBooks] = useState<BookDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categories, setCategories] = useState<BookCategoryDto[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    trpcClient.bookCategories.list.query({ activeOnly: true }).then(setCategories).catch(() => setCategories([]));
  }, []);

  function loadBooks() {
    setIsLoading(true);
    setLoadError(null);
    trpcClient.books.list
      .query({ categoryId: categoryId || undefined, search: search || undefined })
      .then(setBooks)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement des ouvrages."))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadBooks, [categoryId, search]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBookInput>({ resolver: zodResolver(createBookInputSchema) });

  async function onCreate(values: CreateBookInput) {
    setIsCreating(true);
    setCreateError(null);
    try {
      await trpcClient.books.create.mutate(values);
      setCreateOpen(false);
      reset();
      loadBooks();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setIsCreating(false);
    }
  }

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
        <h2 className="text-base font-semibold text-foreground">Ouvrages</h2>
        <Button onClick={() => setCreateOpen(true)}>Nouvel ouvrage</Button>
      </div>

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Input placeholder="Rechercher (titre, auteur, ISBN)…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={books}
        getRowId={(b) => b.id}
        exportFilename="ouvrages"
        emptyMessage={isLoading ? "Chargement…" : "Aucun ouvrage."}
        rowActions={(b) => (
          <Button variant="outline" onClick={() => router.push(`/admin/bibliotheque/${b.id}`)}>
            Ouvrir
          </Button>
        )}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Enregistrer un ouvrage">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onCreate)}>
          <FormField label="Titre" required error={errors.title?.message}>
            <Input {...register("title")} />
          </FormField>
          <FormField label="Auteur" error={errors.author?.message}>
            <Input {...register("author")} />
          </FormField>
          <FormField label="Catégorie" required error={errors.categoryId?.message}>
            <Select {...register("categoryId")}>
              <option value="">Sélectionner…</option>
              {categories.map((c) => (
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
          {createError && <p className="text-sm text-destructive">{createError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function LoansTab() {
  const [loans, setLoans] = useState<LoanDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);

  function loadLoans() {
    setIsLoading(true);
    setLoadError(null);
    trpcClient.loans.list
      .query({ status: (status || undefined) as LoanDto["status"] | undefined, overdueOnly: overdueOnly || undefined })
      .then(setLoans)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement des emprunts."))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadLoans, [status, overdueOnly]);

  async function handleReturn(id: string) {
    setReturningId(id);
    try {
      await trpcClient.loans.return.mutate({ id });
      loadLoans();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Échec du retour.");
    } finally {
      setReturningId(null);
    }
  }

  const columns: DataTableColumn<LoanDto>[] = [
    { key: "bookTitle", header: "Ouvrage", value: (l) => l.bookTitle },
    { key: "bookCopyInventoryNumber", header: "Exemplaire", value: (l) => l.bookCopyInventoryNumber },
    { key: "borrowerName", header: "Emprunteur", value: (l) => l.borrowerName ?? "—" },
    { key: "loanDate", header: "Date d'emprunt", value: (l) => new Date(l.loanDate).getTime(), render: (l) => new Date(l.loanDate).toLocaleDateString("fr-FR") },
    { key: "dueDate", header: "Échéance", value: (l) => new Date(l.dueDate).getTime(), render: (l) => new Date(l.dueDate).toLocaleDateString("fr-FR") },
    {
      key: "status",
      header: "Statut",
      value: (l) => LOAN_STATUS_LABELS[l.status],
      render: (l) =>
        isOverdue(l) ? (
          <Badge variant="destructive">En retard</Badge>
        ) : (
          <Badge variant={l.status === "RENDU" ? "success" : l.status === "PERDU" ? "muted" : "default"}>
            {LOAN_STATUS_LABELS[l.status]}
          </Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-foreground">Emprunts</h2>

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(LOAN_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
          En retard uniquement
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={loans}
        getRowId={(l) => l.id}
        exportFilename="emprunts"
        emptyMessage={isLoading ? "Chargement…" : "Aucun emprunt."}
        rowActions={(l) =>
          l.status === "EN_COURS" ? (
            <Button variant="outline" disabled={returningId === l.id} onClick={() => void handleReturn(l.id)}>
              {returningId === l.id ? "Enregistrement…" : "Marquer comme rendu"}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
