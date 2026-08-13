import { zodResolver } from "@hookform/resolvers/zod";
import {
  type DigitalDocumentDto,
  type DigitalDocumentShareDto,
  type ShareDigitalDocumentInput,
  createDigitalDocumentInputSchema,
  shareDigitalDocumentInputSchema,
} from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, FormField, Input, Select } from "@isac-erp/ui";
import { type ChangeEvent, useState } from "react";
import { useForm } from "react-hook-form";
import { resolveUploadUrl, uploadDocument } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const FORMAT_LABELS = { PDF: "PDF", DOCX: "Word" } as const;
const CHANNEL_LABELS = { EMAIL: "E-mail", WHATSAPP: "WhatsApp" } as const;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Bibliothèque numérique (MODULE-13 §5) — fichiers PDF/Word classés, partageables par e-mail (pièce
 * jointe réelle) ou WhatsApp (lien wa.me pré-rempli, jamais de pièce jointe automatique). */
export function DigitalDocumentsScreen() {
  const utils = trpc.useUtils();
  const canCreate = useHasPermission("BIBLIOTHEQUE_NUMERIQUE:CREATION");
  const canDelete = useHasPermission("BIBLIOTHEQUE_NUMERIQUE:SUPPRESSION");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<DigitalDocumentDto | null>(null);
  const [historyTarget, setHistoryTarget] = useState<DigitalDocumentDto | null>(null);

  const query = trpc.digitalDocuments.list.useQuery({ categoryId: categoryId || undefined, search: search || undefined });
  const categoriesQuery = trpc.digitalDocumentCategories.list.useQuery({ activeOnly: true });

  const deleteDoc = trpc.digitalDocuments.delete.useMutation({
    onSuccess: () => void utils.digitalDocuments.list.invalidate(),
  });

  const columns: DataTableColumn<DigitalDocumentDto>[] = [
    { key: "title", header: "Titre", value: (d) => d.title },
    { key: "categoryName", header: "Catégorie", value: (d) => d.categoryName },
    { key: "fileFormat", header: "Format", value: (d) => FORMAT_LABELS[d.fileFormat], render: (d) => <Badge variant="default">{FORMAT_LABELS[d.fileFormat]}</Badge> },
    { key: "fileSizeBytes", header: "Taille", value: (d) => d.fileSizeBytes, render: (d) => formatSize(d.fileSizeBytes) },
    { key: "uploadedByName", header: "Ajouté par", value: (d) => d.uploadedByName ?? "—" },
    { key: "createdAt", header: "Date", value: (d) => d.createdAt.getTime(), render: (d) => d.createdAt.toLocaleDateString("fr-FR") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Documents numériques</h2>
        {canCreate && <Button onClick={() => setUploadOpen(true)}>Ajouter un document</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Input placeholder="Rechercher un titre…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
        getRowId={(d) => d.id}
        exportFilename="documents-numeriques"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun document."}
        rowActions={(d) => (
          <div className="flex justify-end gap-2">
            <a href={resolveUploadUrl(d.filePath) ?? "#"} target="_blank" rel="noreferrer" className="inline-flex">
              <Button variant="outline">Ouvrir</Button>
            </a>
            {canCreate && (
              <Button variant="outline" onClick={() => setShareTarget(d)}>
                Partager
              </Button>
            )}
            <Button variant="outline" onClick={() => setHistoryTarget(d)}>
              Historique
            </Button>
            {canDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm(`Supprimer définitivement "${d.title}" ?`)) deleteDoc.mutate({ id: d.id });
                }}
              >
                Supprimer
              </Button>
            )}
          </div>
        )}
      />

      {uploadOpen && <UploadDocumentDialog onClose={() => setUploadOpen(false)} />}
      {shareTarget && <ShareDocumentDialog document={shareTarget} onClose={() => setShareTarget(null)} />}
      {historyTarget && <ShareHistoryDialog document={historyTarget} onClose={() => setHistoryTarget(null)} />}
    </div>
  );
}

function UploadDocumentDialog({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const categoriesQuery = trpc.digitalDocumentCategories.list.useQuery({ activeOnly: true });
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const create = trpc.digitalDocuments.create.useMutation({
    onSuccess: () => {
      void utils.digitalDocuments.list.invalidate();
      onClose();
    },
  });

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !title || !categoryId) {
      setUploadError("Renseignez le titre et la catégorie avant de choisir le fichier.");
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadDocument(file);
      const fileFormat = uploaded.mimeType === "application/pdf" ? "PDF" : "DOCX";
      create.mutate({
        title,
        categoryId,
        description: description || undefined,
        filePath: uploaded.path,
        fileFormat,
        fileSizeBytes: uploaded.fileSizeBytes,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Échec de l'envoi du fichier.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Ajouter un document">
      <div className="flex flex-col gap-4">
        <FormField label="Titre" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </FormField>
        <FormField label="Catégorie" required>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Sélectionner…</option>
            {categoriesQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <FormField label="Fichier (PDF ou Word)" required>
          <input
            type="file"
            accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            onChange={(e) => void handleFileChange(e)}
          />
        </FormField>
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isUploading || create.isPending}>
            Annuler
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function ShareDocumentDialog({ document, onClose }: { document: DigitalDocumentDto; onClose: () => void }) {
  const utils = trpc.useUtils();
  const studentsQuery = trpc.students.list.useQuery({ pageSize: 200 });
  const teachersQuery = trpc.teachers.list.useQuery({ includeArchived: false, pageSize: 200 });
  const employeesQuery = trpc.employees.list.useQuery({ includeArchived: false, pageSize: 200 });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShareDigitalDocumentInput>({
    resolver: zodResolver(shareDigitalDocumentInputSchema),
    defaultValues: { documentId: document.id, channel: "EMAIL" },
  });

  const share = trpc.digitalDocuments.share.useMutation({
    onSuccess: (result) => {
      void utils.digitalDocuments.shares.invalidate({ id: document.id });
      if (result.whatsappLink) {
        window.open(result.whatsappLink, "_blank");
      }
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title={`Partager "${document.title}"`}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => share.mutate(values))}>
        <FormField label="Canal">
          <Select {...register("channel")}>
            {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Destinataire — étudiant" error={errors.recipientStudentId?.message}>
          <Select {...register("recipientStudentId", { setValueAs: (v) => v || undefined })}>
            <option value="">Aucun</option>
            {studentsQuery.data?.rows.map((s) => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.matricule})</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Destinataire — enseignant" error={errors.recipientTeacherId?.message}>
          <Select {...register("recipientTeacherId", { setValueAs: (v) => v || undefined })}>
            <option value="">Aucun</option>
            {teachersQuery.data?.rows.map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.matricule})</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Destinataire — employé" error={errors.recipientEmployeeId?.message}>
          <Select {...register("recipientEmployeeId", { setValueAs: (v) => v || undefined })}>
            <option value="">Aucun</option>
            {employeesQuery.data?.rows.map((e) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.matricule})</option>
            ))}
          </Select>
        </FormField>
        <p className="text-xs text-muted-foreground">
          Un seul destinataire à la fois. Par e-mail, le fichier est joint réellement. Par WhatsApp,
          aucune pièce jointe automatique n'est possible (pas d'API officielle) — une fenêtre
          s'ouvrira avec un message pré-rempli à envoyer vous-même ; joignez le fichier manuellement
          depuis le bouton "Ouvrir" du document.
        </p>
        {share.error && <p className="text-sm text-destructive">{share.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={share.isPending}>
            {share.isPending ? "Envoi…" : "Partager"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ShareHistoryDialog({ document, onClose }: { document: DigitalDocumentDto; onClose: () => void }) {
  const sharesQuery = trpc.digitalDocuments.shares.useQuery({ id: document.id });

  const columns: DataTableColumn<DigitalDocumentShareDto>[] = [
    { key: "recipientName", header: "Destinataire", value: (s) => s.recipientName ?? "—" },
    { key: "channel", header: "Canal", value: (s) => CHANNEL_LABELS[s.channel] },
    { key: "sharedByName", header: "Partagé par", value: (s) => s.sharedByName ?? "—" },
    { key: "sharedAt", header: "Date", value: (s) => s.sharedAt.getTime(), render: (s) => s.sharedAt.toLocaleString("fr-FR") },
  ];

  return (
    <Dialog open onClose={onClose} title={`Historique de partage — "${document.title}"`}>
      <DataTable
        columns={columns}
        rows={sharesQuery.data ?? []}
        getRowId={(s) => s.id}
        exportFilename="historique-partage"
        emptyMessage={sharesQuery.isLoading ? "Chargement…" : "Aucun partage enregistré."}
      />
    </Dialog>
  );
}
