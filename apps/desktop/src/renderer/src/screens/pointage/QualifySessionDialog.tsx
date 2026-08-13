import type { SeanceDto, SeanceStatus } from "@isac-erp/shared";
import { Button, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

const STATUS_OPTIONS: { value: SeanceStatus; label: string }[] = [
  { value: "EFFECTUEE", label: "🟢 Effectuée" },
  { value: "REPORTEE", label: "🟡 Reportée" },
  { value: "ANNULEE", label: "🔴 Annulée" },
  { value: "REMPLACEE", label: "🔵 Remplacée par un autre enseignant" },
];

/**
 * Qualification d'une séance (MODULE-05.2 §1.9) — vocabulaire du chapitre (Programmée par défaut,
 * puis Effectuée/Reportée/Annulée/Remplacée). Seul un utilisateur du système peut qualifier une
 * séance : l'enseignant n'a pas de compte de connexion (voir MODULE-05 §1.1).
 */
export function QualifySessionDialog({
  session,
  siblingSessions,
  onClose,
}: {
  session: SeanceDto;
  siblingSessions: SeanceDto[];
  onClose: () => void;
}) {
  const [status, setStatus] = useState<SeanceStatus>(session.status === "PROGRAMMEE" ? "EFFECTUEE" : session.status);
  const [reason, setReason] = useState(session.reason ?? "");
  const [rescheduledToSeanceId, setRescheduledToSeanceId] = useState(session.rescheduledToSeanceId ?? "");
  const [substituteTeacherId, setSubstituteTeacherId] = useState(session.substituteTeacherId ?? "");

  const teachersQuery = trpc.teachers.list.useQuery({
    includeArchived: false,
    page: 1,
    pageSize: 200,
    sortBy: "lastName",
    sortDirection: "asc",
  });

  const utils = trpc.useUtils();
  const qualify = trpc.seances.qualify.useMutation({
    onSuccess: () => {
      void utils.seances.getMonthlyTimesheet.invalidate();
      onClose();
    },
  });

  const candidateSessions = siblingSessions.filter((s) => s.id !== session.id);
  const reasonRequired = status !== "EFFECTUEE";

  return (
    <Dialog open onClose={onClose} title={`Qualifier la séance du ${session.sessionDate.toLocaleDateString("fr-FR")}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {session.subjectName} — {session.classNames.join(", ")} — {session.startTime} à {session.endTime}
          {session.roomLabel ? ` — ${session.roomLabel}` : ""}
        </p>

        <div className="flex flex-col gap-1.5">
          <Label>Statut</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as SeanceStatus)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>

        {reasonRequired && (
          <div className="flex flex-col gap-1.5">
            <Label>Motif (obligatoire)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Absence, jour férié…" />
          </div>
        )}

        {status === "REPORTEE" && (
          <div className="flex flex-col gap-1.5">
            <Label>Séance de rattrapage (optionnel — parmi les séances de ce mois)</Label>
            <Select value={rescheduledToSeanceId} onChange={(e) => setRescheduledToSeanceId(e.target.value)}>
              <option value="">— Aucune pour l'instant —</option>
              {candidateSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sessionDate.toLocaleDateString("fr-FR")} — {s.subjectName} — {s.classNames.join(", ")}
                </option>
              ))}
            </Select>
          </div>
        )}

        {status === "REMPLACEE" && (
          <div className="flex flex-col gap-1.5">
            <Label>Enseignant remplaçant (obligatoire)</Label>
            <Select value={substituteTeacherId} onChange={(e) => setSubstituteTeacherId(e.target.value)}>
              <option value="">—</option>
              {(teachersQuery.data?.rows ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>
              ))}
            </Select>
          </div>
        )}

        {qualify.error && <p className="text-sm text-destructive">{qualify.error.message}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={
              qualify.isPending ||
              (reasonRequired && !reason.trim()) ||
              (status === "REMPLACEE" && !substituteTeacherId)
            }
            onClick={() =>
              qualify.mutate({
                id: session.id,
                status,
                reason: reasonRequired ? reason : undefined,
                rescheduledToSeanceId: status === "REPORTEE" ? rescheduledToSeanceId || undefined : undefined,
                substituteTeacherId: status === "REMPLACEE" ? substituteTeacherId : undefined,
              })
            }
          >
            {qualify.isPending ? "Enregistrement…" : "Valider"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
