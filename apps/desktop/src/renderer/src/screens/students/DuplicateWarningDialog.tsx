import type { StudentDuplicateMatch } from "@isac-erp/shared";
import { Button, Dialog } from "@isac-erp/ui";

const REASON_LABELS: Record<string, string> = {
  TELEPHONE: "même téléphone",
  EMAIL: "même e-mail",
  NOM_DATE_NAISSANCE: "même nom, prénom et date de naissance",
};

/** MODULE-04 §1.8 : avertissement non bloquant — confirmation explicite requise pour continuer. */
export function DuplicateWarningDialog({
  matches,
  onCancel,
  onConfirm,
  isSubmitting,
}: {
  matches: StudentDuplicateMatch[];
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}) {
  return (
    <Dialog
      open
      onClose={onCancel}
      title="Doublon potentiel détecté"
      description="Un ou plusieurs étudiants existants correspondent à ces informations. Vérifiez avant de continuer."
    >
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-2">
          {matches.map((m) => (
            <li key={m.id} className="rounded-md border border-border p-2 text-sm">
              <strong>{m.matricule}</strong> — {m.lastName} {m.firstName}
              <div className="text-xs text-muted-foreground">
                Correspondance : {m.matchedOn.map((r) => REASON_LABELS[r] ?? r).join(", ")}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement…" : "Ce n'est pas un doublon — continuer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
