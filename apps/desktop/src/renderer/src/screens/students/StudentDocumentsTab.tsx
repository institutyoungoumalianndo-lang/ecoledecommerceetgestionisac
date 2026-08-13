import type { StudentDocumentDto, StudentDocumentType } from "@isac-erp/shared";
import { Button, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { type ChangeEvent, useRef, useState } from "react";
import { resolveUploadUrl, uploadDocument } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const DOCUMENT_TYPE_LABELS: Record<StudentDocumentType, string> = {
  ACTE_NAISSANCE: "Acte de naissance",
  DIPLOME: "Diplôme",
  RELEVE: "Relevés",
  PHOTO: "Photo",
  CARTE_IDENTITE_PASSEPORT: "Carte d'identité / Passeport",
  CERTIFICAT_MEDICAL: "Certificat médical",
  AUTRE: "Autre",
};

/** Documents administratifs de l'étudiant (MODULE-04 §4.4). */
export function StudentDocumentsTab({ studentId }: { studentId: string }) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const utils = trpc.useUtils();
  const query = trpc.studentDocuments.listByStudent.useQuery({ studentId });
  const canView = useHasPermission("ETUDIANTS_DOCUMENTS:LECTURE");
  const canReplace = useHasPermission("ETUDIANTS_DOCUMENTS:MODIFICATION");
  const canCreate = useHasPermission("ETUDIANTS_DOCUMENTS:CREATION");
  const canDelete = useHasPermission("ETUDIANTS_DOCUMENTS:SUPPRESSION");

  const replace = trpc.studentDocuments.replace.useMutation({
    onSuccess: () => void utils.studentDocuments.listByStudent.invalidate({ studentId }),
  });
  const deleteDoc = trpc.studentDocuments.delete.useMutation({
    onSuccess: () => void utils.studentDocuments.listByStudent.invalidate({ studentId }),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  function triggerReplace(id: string) {
    setReplacingId(id);
    fileInputRef.current?.click();
  }

  async function handleReplaceFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !replacingId) return;
    const uploaded = await uploadDocument(file);
    replace.mutate({ id: replacingId, filePath: uploaded.path, fileName: uploaded.fileName, mimeType: uploaded.mimeType, fileSizeBytes: uploaded.fileSizeBytes });
    setReplacingId(null);
  }

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canCreate && <Button onClick={() => setAddDialogOpen(true)}>Importer un document</Button>}
      </div>

      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={(e) => void handleReplaceFileChange(e)} />

      {(query.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun document.</p>}

      <div className="grid grid-cols-2 gap-3">
        {(query.data ?? []).map((doc: StudentDocumentDto) => (
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
              {canReplace && (
                <Button variant="outline" onClick={() => triggerReplace(doc.id)}>
                  Remplacer
                </Button>
              )}
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
        <AddDocumentDialog studentId={studentId} onClose={() => setAddDialogOpen(false)} />
      )}
    </div>
  );
}

function AddDocumentDialog({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [type, setType] = useState<StudentDocumentType>("ACTE_NAISSANCE");
  const [label, setLabel] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = trpc.studentDocuments.create.useMutation({
    onSuccess: () => {
      void utils.studentDocuments.listByStudent.invalidate({ studentId });
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
        studentId,
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
          <Select value={type} onChange={(e) => setType(e.target.value as StudentDocumentType)}>
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
