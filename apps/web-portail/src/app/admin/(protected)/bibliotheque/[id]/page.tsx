"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  BookCategoryDto,
  BookCopyDto,
  BookDto,
  CreateLoanInput,
  StudentListRow,
  TeacherListRow,
  UpdateBookInput,
  WithdrawBookCopyInput,
} from "@isac-erp/shared";
import { createLoanInputSchema, updateBookInputSchema, withdrawBookCopyInputSchema } from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, DataTable, type DataTableColumn, Dialog, FormField, Input, Select } from "@isac-erp/ui";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { trpcClient } from "../../../../../lib/trpc";

const CONDITION_LABELS = { BON: "Bon", MOYEN: "Moyen", MAUVAIS: "Mauvais" } as const;
const STATUS_LABELS = { DISPONIBLE: "Disponible", EMPRUNTE: "Emprunté", PERDU: "Perdu", RETIRE: "Retiré" } as const;

type EmployeeRow = { id: string; firstName: string | null; lastName: string | null; matricule: string };

/** Fiche d'un ouvrage — identité éditable + exemplaires + emprunt/retrait (MODULE-13 §1.1-1.3),
 * portée au portail Super Administrateur — même périmètre que `BookDetailScreen.tsx` (desktop). */
export default function AdminBookDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const bookId = params.id;

  const [book, setBook] = useState<BookDto | null>(null);
  const [copies, setCopies] = useState<BookCopyDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categories, setCategories] = useState<BookCategoryDto[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isAddingCopy, setIsAddingCopy] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<BookCopyDto | null>(null);
  const [loanTarget, setLoanTarget] = useState<BookCopyDto | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateBookInput>({ resolver: zodResolver(updateBookInputSchema) });

  useEffect(() => {
    trpcClient.bookCategories.list.query({ activeOnly: true }).then(setCategories).catch(() => setCategories([]));
  }, []);

  const loadAll = useCallback(() => {
    trpcClient.books.get
      .query({ id: bookId })
      .then((result: BookDto) => {
        setBook(result);
        reset(result);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement de l'ouvrage."));
    trpcClient.books.copies.query({ id: bookId }).then(setCopies).catch(() => setCopies([]));
  }, [bookId, reset]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function onSubmit(values: UpdateBookInput) {
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await trpcClient.books.update.mutate(values);
      setBook(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddCopy() {
    setIsAddingCopy(true);
    try {
      await trpcClient.books.createCopy.mutate({ bookId });
      loadAll();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Échec de l'ajout de l'exemplaire.");
    } finally {
      setIsAddingCopy(false);
    }
  }

  const copyColumns: DataTableColumn<BookCopyDto>[] = [
    { key: "inventoryNumber", header: "N° inventaire", value: (c) => c.inventoryNumber },
    { key: "condition", header: "État", value: (c) => CONDITION_LABELS[c.condition] },
    {
      key: "status",
      header: "Statut",
      value: (c) => STATUS_LABELS[c.status],
      render: (c) => (
        <Badge variant={c.status === "DISPONIBLE" ? "success" : c.status === "EMPRUNTE" ? "warning" : "muted"}>
          {STATUS_LABELS[c.status]}
        </Badge>
      ),
    },
  ];

  if (loadError && !book) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button variant="outline" onClick={() => router.push("/admin/bibliotheque")}>
          ← Retour à la liste
        </Button>
      </div>
    );
  }

  if (!book) return null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">{book.title}</h1>
        <Button variant="outline" onClick={() => router.push("/admin/bibliotheque")}>
          ← Retour à la liste
        </Button>
      </div>

      <Card variant="form">
        <CardHeader>
          <CardTitle>Fiche de l'ouvrage</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit(onSubmit)}>
            <FormField label="Titre" required error={errors.title?.message}>
              <Input {...register("title")} />
            </FormField>
            <FormField label="Auteur" error={errors.author?.message}>
              <Input {...register("author")} />
            </FormField>
            <FormField label="Catégorie" error={errors.categoryId?.message}>
              <Select {...register("categoryId")}>
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
            {saveError && <p className="col-span-2 text-sm text-destructive">{saveError}</p>}
            <div className="col-span-2 flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Enregistrement…" : "Enregistrer les modifications"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card variant="form">
        <CardHeader>
          <CardTitle>Exemplaires</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button disabled={isAddingCopy} onClick={() => void handleAddCopy()}>
              {isAddingCopy ? "Ajout…" : "Ajouter un exemplaire"}
            </Button>
          </div>
          <DataTable
            columns={copyColumns}
            rows={copies}
            getRowId={(c) => c.id}
            exportFilename="exemplaires"
            emptyMessage="Aucun exemplaire."
            rowActions={(c) => (
              <div className="flex justify-end gap-2">
                {c.status === "DISPONIBLE" && (
                  <Button variant="outline" onClick={() => setLoanTarget(c)}>
                    Emprunter
                  </Button>
                )}
                {(c.status === "DISPONIBLE" || c.status === "EMPRUNTE") && (
                  <Button variant="destructive" onClick={() => setWithdrawTarget(c)}>
                    Retirer/perdu
                  </Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {withdrawTarget && (
        <WithdrawCopyDialog copy={withdrawTarget} onClose={() => setWithdrawTarget(null)} onSaved={loadAll} />
      )}
      {loanTarget && <NewLoanDialog copy={loanTarget} onClose={() => setLoanTarget(null)} onSaved={loadAll} />}
    </div>
  );
}

function WithdrawCopyDialog({ copy, onClose, onSaved }: { copy: BookCopyDto; onClose: () => void; onSaved: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WithdrawBookCopyInput>({
    resolver: zodResolver(withdrawBookCopyInputSchema),
    defaultValues: { id: copy.id, status: "RETIRE" },
  });

  async function onSubmit(values: WithdrawBookCopyInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      await trpcClient.books.withdrawCopy.mutate(values);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du retrait.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Retirer un exemplaire" variant="destructive">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <p className="text-sm text-destructive">
          Action définitive : l'exemplaire {copy.inventoryNumber} ne sera plus disponible à l'emprunt.
        </p>
        <FormField label="Motif" error={errors.status?.message}>
          <Select {...register("status")}>
            <option value="RETIRE">Retiré (hors service)</option>
            <option value="PERDU">Perdu</option>
          </Select>
        </FormField>
        <FormField label="Justification" required error={errors.reason?.message}>
          <Input {...register("reason")} placeholder="Motif du retrait…" />
        </FormField>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? "Confirmation…" : "Confirmer"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function NewLoanDialog({ copy, onClose, onSaved }: { copy: BookCopyDto; onClose: () => void; onSaved: () => void }) {
  const [students, setStudents] = useState<StudentListRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherListRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trpcClient.students.list.query({ pageSize: 200 }).then((r: { rows: StudentListRow[] }) => setStudents(r.rows)).catch(() => setStudents([]));
    trpcClient.teachers.list
      .query({ includeArchived: false, pageSize: 200 })
      .then((r: { rows: TeacherListRow[] }) => setTeachers(r.rows))
      .catch(() => setTeachers([]));
    trpcClient.employees.list
      .query({ includeArchived: false, pageSize: 200 })
      .then((r: { rows: EmployeeRow[] }) => setEmployees(r.rows))
      .catch(() => setEmployees([]));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateLoanInput>({
    resolver: zodResolver(createLoanInputSchema),
    defaultValues: { bookCopyId: copy.id },
  });

  async function onSubmit(values: CreateLoanInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      await trpcClient.loans.create.mutate(values);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'emprunt.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Emprunter l'exemplaire ${copy.inventoryNumber}`}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Emprunteur — étudiant" error={errors.borrowerStudentId?.message}>
          <Select {...register("borrowerStudentId", { setValueAs: (v) => v || undefined })}>
            <option value="">Aucun</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.matricule})</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Emprunteur — enseignant" error={errors.borrowerTeacherId?.message}>
          <Select {...register("borrowerTeacherId", { setValueAs: (v) => v || undefined })}>
            <option value="">Aucun</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.matricule})</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Emprunteur — employé" error={errors.borrowerEmployeeId?.message}>
          <Select {...register("borrowerEmployeeId", { setValueAs: (v) => v || undefined })}>
            <option value="">Aucun</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.matricule})</option>
            ))}
          </Select>
        </FormField>
        <p className="text-xs text-window-foreground/70">Un seul emprunteur à la fois — étudiant, enseignant ou employé.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement…" : "Emprunter"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
