import { zodResolver } from "@hookform/resolvers/zod";
import {
  type BookCopyDto,
  type CreateLoanInput,
  type UpdateBookInput,
  type WithdrawBookCopyInput,
  createLoanInputSchema,
  updateBookInputSchema,
  withdrawBookCopyInputSchema,
} from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, DataTable, type DataTableColumn, Dialog, FormField, Input, Select } from "@isac-erp/ui";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const CONDITION_LABELS = { BON: "Bon", MOYEN: "Moyen", MAUVAIS: "Mauvais" } as const;

const STATUS_LABELS = {
  DISPONIBLE: "Disponible",
  EMPRUNTE: "Emprunté",
  PERDU: "Perdu",
  RETIRE: "Retiré",
} as const;

export function BookDetailScreen({ bookId, onBack }: { bookId: string; onBack: () => void }) {
  const utils = trpc.useUtils();
  const canModify = useHasPermission("BIBLIOTHEQUE:MODIFICATION");
  const canCreate = useHasPermission("BIBLIOTHEQUE:CREATION");
  const canWithdraw = useHasPermission("BIBLIOTHEQUE:SUPPRESSION");

  const bookQuery = trpc.books.get.useQuery({ id: bookId });
  const copiesQuery = trpc.books.copies.useQuery({ id: bookId });
  const categoriesQuery = trpc.bookCategories.list.useQuery({ activeOnly: true });

  const [withdrawTarget, setWithdrawTarget] = useState<BookCopyDto | null>(null);
  const [loanTarget, setLoanTarget] = useState<BookCopyDto | null>(null);

  function invalidateAll() {
    void utils.books.get.invalidate({ id: bookId });
    void utils.books.copies.invalidate({ id: bookId });
    void utils.loans.list.invalidate();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateBookInput>({ resolver: zodResolver(updateBookInputSchema) });

  useEffect(() => {
    if (bookQuery.data) reset(bookQuery.data);
  }, [bookQuery.data, reset]);

  const updateBook = trpc.books.update.useMutation({ onSuccess: () => void utils.books.get.invalidate({ id: bookId }) });
  const createCopy = trpc.books.createCopy.useMutation({ onSuccess: invalidateAll });

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

  if (bookQuery.isLoading || !bookQuery.data) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }
  const book = bookQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onBack}>
          Retour
        </Button>
        <h2 className="text-lg font-semibold text-foreground">{book.title}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fiche de l'ouvrage</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-2 gap-4" onSubmit={handleSubmit((values) => updateBook.mutate(values))}>
            <FormField label="Titre" required error={errors.title?.message}>
              <Input {...register("title")} disabled={!canModify} />
            </FormField>
            <FormField label="Auteur" error={errors.author?.message}>
              <Input {...register("author")} disabled={!canModify} />
            </FormField>
            <FormField label="Catégorie" error={errors.categoryId?.message}>
              <Select {...register("categoryId")} disabled={!canModify}>
                {categoriesQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Description" error={errors.description?.message}>
              <Input {...register("description")} disabled={!canModify} />
            </FormField>
            <FormField label="Éditeur" error={errors.publisher?.message}>
              <Input {...register("publisher")} disabled={!canModify} />
            </FormField>
            <FormField label="Année de publication" error={errors.publicationYear?.message}>
              <Input type="number" {...register("publicationYear", { valueAsNumber: true })} disabled={!canModify} />
            </FormField>
            <FormField label="ISBN" error={errors.isbn?.message}>
              <Input {...register("isbn")} disabled={!canModify} />
            </FormField>
            {updateBook.error && <p className="col-span-2 text-sm text-destructive">{updateBook.error.message}</p>}
            {canModify && (
              <div className="col-span-2 flex justify-end">
                <Button type="submit" disabled={updateBook.isPending}>
                  {updateBook.isPending ? "Enregistrement…" : "Enregistrer les modifications"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exemplaires</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {canCreate && (
            <div className="flex justify-end">
              <Button disabled={createCopy.isPending} onClick={() => createCopy.mutate({ bookId })}>
                {createCopy.isPending ? "Ajout…" : "Ajouter un exemplaire"}
              </Button>
            </div>
          )}
          <DataTable
            columns={copyColumns}
            rows={copiesQuery.data ?? []}
            getRowId={(c) => c.id}
            exportFilename="exemplaires"
            emptyMessage={copiesQuery.isLoading ? "Chargement…" : "Aucun exemplaire."}
            rowActions={(c) => (
              <div className="flex justify-end gap-2">
                {canCreate && c.status === "DISPONIBLE" && (
                  <Button variant="outline" onClick={() => setLoanTarget(c)}>
                    Emprunter
                  </Button>
                )}
                {canWithdraw && (c.status === "DISPONIBLE" || c.status === "EMPRUNTE") && (
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
        <WithdrawCopyDialog copy={withdrawTarget} onClose={() => setWithdrawTarget(null)} onSaved={invalidateAll} />
      )}
      {loanTarget && <NewLoanDialog copy={loanTarget} onClose={() => setLoanTarget(null)} onSaved={invalidateAll} />}
    </div>
  );
}

function WithdrawCopyDialog({ copy, onClose, onSaved }: { copy: BookCopyDto; onClose: () => void; onSaved: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WithdrawBookCopyInput>({
    resolver: zodResolver(withdrawBookCopyInputSchema),
    defaultValues: { id: copy.id, status: "RETIRE" },
  });

  const withdraw = trpc.books.withdrawCopy.useMutation({
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Retirer un exemplaire" variant="destructive">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => withdraw.mutate(values))}>
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
        {withdraw.error && <p className="text-sm text-destructive">{withdraw.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="destructive" disabled={withdraw.isPending}>
            {withdraw.isPending ? "Confirmation…" : "Confirmer"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function NewLoanDialog({ copy, onClose, onSaved }: { copy: BookCopyDto; onClose: () => void; onSaved: () => void }) {
  const studentsQuery = trpc.students.list.useQuery({ pageSize: 200 });
  const teachersQuery = trpc.teachers.list.useQuery({ includeArchived: false, pageSize: 200 });
  const employeesQuery = trpc.employees.list.useQuery({ includeArchived: false, pageSize: 200 });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateLoanInput>({
    resolver: zodResolver(createLoanInputSchema),
    defaultValues: { bookCopyId: copy.id },
  });

  const create = trpc.loans.create.useMutation({
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title={`Emprunter l'exemplaire ${copy.inventoryNumber}`}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => create.mutate(values))}>
        <FormField label="Emprunteur — étudiant" error={errors.borrowerStudentId?.message}>
          <Select {...register("borrowerStudentId", { setValueAs: (v) => v || undefined })}>
            <option value="">Aucun</option>
            {studentsQuery.data?.rows.map((s) => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.matricule})</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Emprunteur — enseignant" error={errors.borrowerTeacherId?.message}>
          <Select {...register("borrowerTeacherId", { setValueAs: (v) => v || undefined })}>
            <option value="">Aucun</option>
            {teachersQuery.data?.rows.map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.matricule})</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Emprunteur — employé" error={errors.borrowerEmployeeId?.message}>
          <Select {...register("borrowerEmployeeId", { setValueAs: (v) => v || undefined })}>
            <option value="">Aucun</option>
            {employeesQuery.data?.rows.map((e) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.matricule})</option>
            ))}
          </Select>
        </FormField>
        <p className="text-xs text-muted-foreground">Un seul emprunteur à la fois — étudiant, enseignant ou employé.</p>
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Enregistrement…" : "Emprunter"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
