import type { StudentCardStatus } from "@isac-erp/shared";
import { Badge, Button, Dialog, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const STATUS_LABELS: Record<StudentCardStatus, string> = {
  ACTIVE: "Active",
  CANCELLED: "Annulée",
  EXPIRED: "Expirée",
  SUPERSEDED: "Remplacée",
};

const STATUS_VARIANTS: Record<StudentCardStatus, "success" | "destructive" | "muted"> = {
  ACTIVE: "success",
  CANCELLED: "destructive",
  EXPIRED: "muted",
  SUPERSEDED: "muted",
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR");
}

/** Carte d'étudiant officielle (MODULE-09.1) : génération, réémission, annulation, réimpression, historique. */
export function StudentCardTab({ studentId }: { studentId: string }) {
  const [reissueOpen, setReissueOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const utils = trpc.useUtils();
  const query = trpc.studentCards.list.useQuery({ studentId });
  const canView = useHasPermission("DOCUMENTS:LECTURE");
  const canGenerate = useHasPermission("DOCUMENTS:CREATION");
  const canAdminister = useHasPermission("DOCUMENTS:ADMINISTRATION");

  const generate = trpc.studentCards.generate.useMutation({
    onSuccess: () => void utils.studentCards.list.invalidate({ studentId }),
  });
  const reprint = trpc.studentCards.reprint.useMutation({
    onSuccess: () => void utils.studentCards.list.invalidate({ studentId }),
  });

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  const cards = query.data ?? [];
  const activeCard = cards.find((c) => c.status === "ACTIVE");
  const history = cards.filter((c) => c.id !== activeCard?.id);

  return (
    <div className="flex flex-col gap-4">
      {!activeCard ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Aucune carte active pour cet étudiant.</p>
          {generate.error && <p className="text-sm text-destructive">{generate.error.message}</p>}
          {canGenerate && (
            <Button disabled={generate.isPending} onClick={() => generate.mutate({ studentId })}>
              {generate.isPending ? "Génération…" : "Générer la carte"}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Carte n° {activeCard.cardNumber} <Badge variant={STATUS_VARIANTS[activeCard.status]}>{STATUS_LABELS[activeCard.status]}</Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                Émise le {formatDate(activeCard.issuedAt)} — Expire le {formatDate(activeCard.expiresAt)} — Code de vérification :{" "}
                {activeCard.verificationCode}
              </p>
              {activeCard.reprintCount > 0 && (
                <p className="text-xs text-muted-foreground">Réimprimée {activeCard.reprintCount} fois.</p>
              )}
            </div>
            <a
              href={resolveUploadUrl(activeCard.filePath) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline"
            >
              Voir le PDF
            </a>
          </div>

          {reprint.error && <p className="text-sm text-destructive">{reprint.error.message}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={reprint.isPending} onClick={() => reprint.mutate({ id: activeCard.id })}>
              {reprint.isPending ? "Réimpression…" : "Réimprimer"}
            </Button>
            {canAdminister && (
              <>
                <Button variant="outline" onClick={() => setReissueOpen(true)}>
                  Réémettre
                </Button>
                <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                  Annuler
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Historique des cartes</p>
          <div className="flex flex-col gap-2">
            {history.map((card) => (
              <div key={card.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm">
                    N° {card.cardNumber} <Badge variant={STATUS_VARIANTS[card.status]}>{STATUS_LABELS[card.status]}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Émise le {formatDate(card.issuedAt)}
                    {card.status === "CANCELLED" && card.cancelledAt && ` — Annulée le ${formatDate(card.cancelledAt)}`}
                    {card.cancelledReason && ` (${card.cancelledReason})`}
                  </p>
                </div>
                <a
                  href={resolveUploadUrl(card.filePath) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline"
                >
                  Voir
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {reissueOpen && <ReissueCardDialog studentId={studentId} onClose={() => setReissueOpen(false)} />}
      {cancelOpen && activeCard && (
        <CancelCardDialog cardId={activeCard.id} studentId={studentId} onClose={() => setCancelOpen(false)} />
      )}
    </div>
  );
}

function ReissueCardDialog({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();
  const reissue = trpc.studentCards.reissue.useMutation({
    onSuccess: () => {
      void utils.studentCards.list.invalidate({ studentId });
      onClose();
    },
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Réémettre la carte"
      description="La carte active actuelle sera remplacée par une nouvelle (nouveau numéro), par exemple en cas de perte ou de détérioration."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Motif (facultatif)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {reissue.error && <p className="text-sm text-destructive">{reissue.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={reissue.isPending}>
            Annuler
          </Button>
          <Button
            disabled={reissue.isPending}
            onClick={() => reissue.mutate({ studentId, reason: reason || undefined })}
          >
            {reissue.isPending ? "Réémission…" : "Réémettre"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function CancelCardDialog({
  cardId,
  studentId,
  onClose,
}: {
  cardId: string;
  studentId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();
  const cancel = trpc.studentCards.cancel.useMutation({
    onSuccess: () => {
      void utils.studentCards.list.invalidate({ studentId });
      onClose();
    },
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Annuler cette carte"
      description="La carte sera marquée comme annulée. Cette action ne supprime aucune donnée mais rend la carte invalide."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Motif</Label>
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
            onClick={() => cancel.mutate({ id: cardId, reason })}
          >
            {cancel.isPending ? "Annulation…" : "Annuler la carte"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
