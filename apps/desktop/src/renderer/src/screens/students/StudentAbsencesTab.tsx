import { Badge, Button, Checkbox, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR");
}

/**
 * Présences de l'étudiant (2026-08-03, retour du porteur du projet) — pas de pointage quotidien :
 * l'étudiant est présumé présent par défaut, ce volet ne sert qu'à enregistrer une absence pour un
 * jour donné (motif + justifiée ou non). Alimente la mention de régularité affichée sur le bulletin
 * (voir StudentNotesTab.tsx, BulletinPeriodeView.tsx/BulletinAnnuelView.tsx, EvaluationSettingsScreen.tsx
 * pour le seuil configurable).
 */
export function StudentAbsencesTab({ studentId }: { studentId: string }) {
  const canView = useHasPermission("ABSENCES:LECTURE");
  const canCreate = useHasPermission("ABSENCES:CREATION");
  const canDelete = useHasPermission("ABSENCES:SUPPRESSION");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [motif, setMotif] = useState("");
  const [justifiee, setJustifiee] = useState(false);

  const utils = trpc.useUtils();
  const query = trpc.studentAbsences.listByStudent.useQuery({ studentId });
  const create = trpc.studentAbsences.create.useMutation({
    onSuccess: () => {
      setMotif("");
      setJustifiee(false);
      void utils.studentAbsences.listByStudent.invalidate({ studentId });
    },
  });
  const remove = trpc.studentAbsences.delete.useMutation({
    onSuccess: () => void utils.studentAbsences.listByStudent.invalidate({ studentId }),
  });

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  const absences = query.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      {canCreate && (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Enregistrer une absence</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Motif</Label>
              <Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. maladie, raison familiale…" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={justifiee} onChange={(e) => setJustifiee(e.target.checked)} />
            Absence justifiée
          </label>
          {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
          <div className="flex justify-end">
            <Button
              disabled={!motif.trim() || !date || create.isPending}
              onClick={() => create.mutate({ studentId, date: new Date(date), motif, justifiee })}
            >
              {create.isPending ? "Enregistrement…" : "Enregistrer l'absence"}
            </Button>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{absences.length} absence(s) enregistrée(s).</p>

      {absences.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune absence enregistrée — l'étudiant est présumé présent tant qu'aucune absence n'est saisie ici.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {absences.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">
                  {formatDate(a.date)} — {a.motif}{" "}
                  <Badge variant={a.justifiee ? "success" : "warning"} className="ml-1">
                    {a.justifiee ? "Justifiée" : "Non justifiée"}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">Enregistrée par {a.createdByName}</p>
              </div>
              {canDelete && (
                <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate({ id: a.id })}>
                  Supprimer
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
