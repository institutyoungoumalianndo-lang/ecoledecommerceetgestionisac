import type { TeacherDocumentDto, TeacherDocumentType } from "@isac-erp/shared";
import { Button, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { type ChangeEvent, useState } from "react";
import { resolveUploadUrl, uploadDocument } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const DOCUMENT_TYPE_LABELS: Record<TeacherDocumentType, string> = {
  DIPLOME: "Diplôme",
  CV: "CV",
  CONTRAT: "Contrat",
  EVALUATION: "Évaluation",
  CARTE_IDENTITE_PASSEPORT: "Carte d'identité / Passeport",
  AUTRE: "Autre",
};

/** Dossier numérique de l'enseignant (MODULE-05 §1.5/§10.6) — documents archivés, jamais supprimés que sur demande explicite. */
export function TeacherDocumentsTab({ teacherId }: { teacherId: string }) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const utils = trpc.useUtils();
  const query = trpc.teacherDocuments.listByTeacher.useQuery({ teacherId });
  const canView = useHasPermission("ENSEIGNANTS_DOCUMENTS:LECTURE");
  const canCreate = useHasPermission("ENSEIGNANTS_DOCUMENTS:CREATION");
  const canDelete = useHasPermission("ENSEIGNANTS_DOCUMENTS:SUPPRESSION");

  const deleteDoc = trpc.teacherDocuments.delete.useMutation({
    onSuccess: () => void utils.teacherDocuments.listByTeacher.invalidate({ teacherId }),
  });

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canCreate && <Button onClick={() => setAddDialogOpen(true)}>Importer un document</Button>}
      </div>

      {(query.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun document.</p>}

      <div className="grid grid-cols-2 gap-3">
        {(query.data ?? []).map((doc: TeacherDocumentDto) => (
          <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">
                {DOCUMENT_TYPE_LABELS[doc.type]}
                {doc.label ? ` — ${doc.label}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">{doc.fileName}</p>
            </div>
            <div className="flex gap-2">
              <a
                href={resolveUploadUrl(doc.filePath) ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline"
              >
                Voir
              </a>
              {canDelete && (
                <Button variant="destructive" onClick={() => deleteDoc.mutate({ id: doc.id })}>
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {addDialogOpen && (
        <AddDocumentDialog teacherId={teacherId} onClose={() => setAddDialogOpen(false)} />
      )}
    </div>
  );
}

function AddDocumentDialog({ teacherId, onClose }: { teacherId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [type, setType] = useState<TeacherDocumentType>("DIPLOME");
  const [label, setLabel] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = trpc.teacherDocuments.create.useMutation({
    onSuccess: () => {
      void utils.teacherDocuments.listByTeacher.invalidate({ teacherId });
      onClose();
    },
  });

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await uploadDocument(file);
      create.mutate({
        teacherId,
        type,
        label: label || undefined,
        filePath: uploaded.path,
        fileName: uploaded.fileName,
        mimeType: uploaded.mimeType,
        fileSizeBytes: uploaded.fileSizeBytes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi du fichier.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Importer un document">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Type de document</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as TeacherDocumentType)}>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, l]) => (
              <option key={value} value={value}>{l}</option>
            ))}
          </Select>
        </div>
        {type === "AUTRE" && (
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <Label>Fichier (image ou PDF)</Label>
          <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => void handleFileChange(e)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isUploading || create.isPending}>
            Annuler
          </Button>
        </div>
        {isUploading && <p className="text-sm text-muted-foreground">Envoi en cours…</p>}
      </div>
    </Dialog>
  );
}
