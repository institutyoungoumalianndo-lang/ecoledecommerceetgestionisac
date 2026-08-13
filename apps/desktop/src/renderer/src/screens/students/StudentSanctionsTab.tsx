import type { SanctionDto, SanctionType } from "@isac-erp/shared";
import { Badge, Button, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const SANCTION_TYPE_LABELS: Record<SanctionType, string> = {
  AVERTISSEMENT: "Avertissement",
  BLAME: "Blâme",
  RETENUE: "Retenue",
  EXCLUSION_TEMPORAIRE: "Exclusion temporaire",
  EXCLUSION_DEFINITIVE: "Exclusion définitive",
  AUTRE: "Autre",
};

const SANCTION_TYPE_VARIANTS: Record<SanctionType, "muted" | "warning" | "destructive"> = {
  AVERTISSEMENT: "muted",
  BLAME: "warning",
  RETENUE: "warning",
  EXCLUSION_TEMPORAIRE: "destructive",
  EXCLUSION_DEFINITIVE: "destructive",
  AUTRE: "muted",
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR");
}

/**
 * Sanctions disciplinaires de l'étudiant (2026-08-03, retour du porteur du projet) — remplace le
 * placeholder "à venir" de l'onglet dédié. Un avis PDF officiel peut être généré par sanction
 * (DocumentType.SANCTION, Module 9) ; une notification automatique part à l'étudiant et à son/ses
 * tuteur(s) principal(aux) dès l'enregistrement (voir sanctionNotificationService.ts).
 */
export function StudentSanctionsTab({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SanctionDto | null>(null);

  const canView = useHasPermission("SANCTIONS:LECTURE");
  const canCreate = useHasPermission("SANCTIONS:CREATION");
  const canAdminister = useHasPermission("SANCTIONS:ADMINISTRATION");

  const utils = trpc.useUtils();
  const query = trpc.sanctions.listByStudent.useQuery({ studentId });
  const generate = trpc.documents.generate.useMutation();

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  const sanctions = query.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sanctions.length} sanction(s) enregistrée(s).</p>
        {canCreate && <Button onClick={() => setAddOpen(true)}>Enregistrer une sanction</Button>}
      </div>

      {sanctions.length === 0 && <p className="text-sm text-muted-foreground">Aucune sanction enregistrée pour cet étudiant.</p>}

      <div className="flex flex-col gap-2">
        {sanctions.map((s) => (
          <div key={s.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  <Badge variant={SANCTION_TYPE_VARIANTS[s.type]}>{SANCTION_TYPE_LABELS[s.type]}</Badge>{" "}
                  {formatDate(s.date)}
                  {s.annule && (
                    <Badge variant="destructive" className="ml-2">
                      Annulée
                    </Badge>
                  )}
                </p>
                <p className="mt-1 text-sm">{s.motif}</p>
                {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
                {s.dureeJours && <p className="mt-1 text-xs text-muted-foreground">Durée : {s.dureeJours} jour(s)</p>}
                <p className="mt-1 text-xs text-muted-foreground">Enregistrée par {s.issuedByName}</p>
                {s.annule && s.annuleReason && (
                  <p className="mt-1 text-xs text-destructive">Annulation : {s.annuleReason}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button
                  variant="outline"
                  disabled={generate.isPending}
                  onClick={() => generate.mutate({ documentType: "SANCTION", studentId, sanctionId: s.id })}
                >
                  {generate.isPending ? "Génération…" : "Générer l'avis PDF"}
                </Button>
                {canAdminister && !s.annule && (
                  <Button variant="destructive" onClick={() => setCancelTarget(s)}>
                    Annuler
                  </Button>
                )}
              </div>
            </div>
            {generate.data && generate.data.documentNumber && (
              <a
                href={resolveUploadUrl(generate.data.filePath) ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline"
              >
                Voir le dernier avis généré ({generate.data.documentNumber})
              </a>
            )}
          </div>
        ))}
      </div>

      {addOpen && (
        <AddSanctionDialog
          studentId={studentId}
          onClose={() => {
            setAddOpen(false);
            void utils.sanctions.listByStudent.invalidate({ studentId });
          }}
        />
      )}
      {cancelTarget && (
        <CancelSanctionDialog
          sanction={cancelTarget}
          studentName={studentName}
          onClose={() => {
            setCancelTarget(null);
            void utils.sanctions.listByStudent.invalidate({ studentId });
          }}
        />
      )}
    </div>
  );
}

function AddSanctionDialog({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const [type, setType] = useState<SanctionType>("AVERTISSEMENT");
  const [motif, setMotif] = useState("");
  const [description, setDescription] = useState("");
  const [dureeJours, setDureeJours] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const create = trpc.sanctions.create.useMutation({ onSuccess: onClose });

  const showDuree = type === "RETENUE" || type === "EXCLUSION_TEMPORAIRE";

  return (
    <Dialog open onClose={onClose} title="Enregistrer une sanction">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as SanctionType)}>
            {Object.entries(SANCTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Motif</Label>
          <Input value={motif} onChange={(e) => setMotif(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Description (facultatif)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {showDuree && (
          <div className="flex flex-col gap-1.5">
            <Label>Durée (jours)</Label>
            <Input type="number" min={1} value={dureeJours} onChange={(e) => setDureeJours(e.target.value)} />
          </div>
        )}
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Annuler
          </Button>
          <Button
            disabled={!motif.trim() || !date || create.isPending}
            onClick={() =>
              create.mutate({
                studentId,
                type,
                motif,
                description: description || undefined,
                dureeJours: showDuree && dureeJours ? Number(dureeJours) : undefined,
                date: new Date(date),
              })
            }
          >
            {create.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function CancelSanctionDialog({
  sanction,
  studentName,
  onClose,
}: {
  sanction: SanctionDto;
  studentName: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const cancel = trpc.sanctions.annuler.useMutation({ onSuccess: onClose });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Annuler cette sanction"
      description={`${SANCTION_TYPE_LABELS[sanction.type]} du ${formatDate(sanction.date)} — ${studentName}. Cette action ne supprime aucune donnée mais marque la sanction comme annulée.`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Motif d'annulation</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {cancel.error && <p className="text-sm text-destructive">{cancel.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={cancel.isPending}>
            Retour
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || cancel.isPending}
            onClick={() => cancel.mutate({ id: sanction.id, reason })}
          >
            {cancel.isPending ? "Annulation…" : "Annuler la sanction"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
