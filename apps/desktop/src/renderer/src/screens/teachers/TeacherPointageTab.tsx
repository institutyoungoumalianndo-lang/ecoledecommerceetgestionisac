import type { SeanceDto, SeanceStatus } from "@isac-erp/shared";
import { Badge, Button, Select } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { QualifySessionDialog } from "../pointage/QualifySessionDialog";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const LOCKED_STATUS_LABEL: Partial<Record<SeanceStatus, string>> = {
  REPORTEE: "🟡 Reportée",
  ANNULEE: "🔴 Annulée",
  REMPLACEE: "🔵 Remplacée",
};

/**
 * Grille de pointage cochable (extension du 2026-07-30, retour du porteur du projet) : accessible
 * directement depuis la fiche enseignant (à côté d'Affectations/Disponibilités...), mois en cours
 * par défaut, à partir de son emploi du temps déjà renseigné (référence toujours le calendrier réel
 * — chaque ligne est une séance à une date précise, jamais une grille abstraite). Coché = heures
 * exécutées, décoché = pas encore — enregistré en une fois. Les séances REPORTEE/ANNULEE/REMPLACEE
 * restent réservées au dialogue "Qualifier" (motif obligatoire), en dehors de la grille simple.
 * L'enregistrement alimente directement la paie (Module 8 lit ces mêmes séances EFFECTUEE — voir
 * `getTeacherPayrollHours`) : ouvrir Paie → Périodes de paie sur le mois correspondant après
 * validation affiche le total, payable une fois le bulletin calculé/validé.
 */
export function TeacherPointageTab({ teacherId }: { teacherId: string }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [qualifySession, setQualifySession] = useState<SeanceDto | null>(null);

  const canValidate = useHasPermission("POINTAGE:VALIDATION");
  const utils = trpc.useUtils();

  const timesheetQuery = trpc.seances.getMonthlyTimesheet.useQuery({ teacherId, year, month });
  const timesheet = timesheetQuery.data;

  useEffect(() => {
    if (!timesheet) return;
    setCheckedIds(new Set(timesheet.sessions.filter((s) => s.status === "EFFECTUEE").map((s) => s.id)));
    // Volontairement limité à id/année/mois — se réinitialise en changeant de mois, pas à chaque
    // refetch après l'enregistrement (qui reflète déjà exactement ce que l'utilisateur vient de cocher).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timesheet?.id, timesheet?.year, timesheet?.month]);

  const save = trpc.seances.saveMonthlyPointage.useMutation({
    onSuccess: () => void utils.seances.getMonthlyTimesheet.invalidate({ teacherId, year, month }),
  });

  function toggle(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const gridSessions = (timesheet?.sessions ?? []).filter((s) => s.status === "PROGRAMMEE" || s.status === "EFFECTUEE");
  const lockedSessions = (timesheet?.sessions ?? []).filter((s) => s.status !== "PROGRAMMEE" && s.status !== "EFFECTUEE");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Mois</label>
            <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((label, i) => (
                <option key={label} value={i + 1}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Année</label>
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
          </div>
        </div>
        {timesheet && (
          <Badge variant={timesheet.status === "CLOTUREE" ? "success" : "muted"}>
            {timesheet.status === "CLOTUREE" ? "Fiche clôturée" : "Fiche ouverte"}
          </Badge>
        )}
      </div>

      {timesheetQuery.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {timesheet && timesheet.sessions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucune séance planifiée pour ce mois — créez l'emploi du temps depuis le module Emploi du temps.
        </p>
      )}

      {timesheet && timesheet.sessions.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            {gridSessions.map((session) => (
              <label
                key={session.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm hover:bg-muted/30"
              >
                <input
                  type="checkbox"
                  checked={checkedIds.has(session.id)}
                  disabled={!canValidate || timesheet.status === "CLOTUREE"}
                  onChange={() => toggle(session.id)}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="font-medium">
                    {session.sessionDate.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" })}
                    {" — "}
                    {session.startTime} à {session.endTime}
                  </span>
                  <span className="text-muted-foreground">
                    {session.subjectName} — {session.classNames.join(", ")}
                    {session.roomLabel ? ` — ${session.roomLabel}` : ""}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {checkedIds.has(session.id) ? "🟢 Exécutée" : "Pas encore"}
                </span>
              </label>
            ))}

            {lockedSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-border p-3 text-sm opacity-80"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {session.sessionDate.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" })}
                    {" — "}
                    {session.startTime} à {session.endTime}
                  </span>
                  <span className="text-muted-foreground">
                    {session.subjectName} — {session.classNames.join(", ")}
                    {session.reason ? ` — motif : ${session.reason}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{LOCKED_STATUS_LABEL[session.status]}</Badge>
                  {canValidate && timesheet.status === "OUVERTE" && (
                    <Button variant="outline" onClick={() => setQualifySession(session)}>
                      Qualifier
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {canValidate && timesheet.status === "OUVERTE" && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
              <span className="text-sm text-muted-foreground">
                {checkedIds.size} séance{checkedIds.size > 1 ? "s" : ""} exécutée{checkedIds.size > 1 ? "s" : ""} sur {gridSessions.length}.
              </span>
              <Button disabled={save.isPending} onClick={() => save.mutate({ teacherId, year, month, executedSeanceIds: [...checkedIds] })}>
                {save.isPending ? "Enregistrement…" : "Enregistrer le pointage"}
              </Button>
            </div>
          )}
          {save.error && <p className="text-sm text-destructive">{save.error.message}</p>}
          {save.isSuccess && !save.isPending && <p className="text-sm text-emerald-600">Pointage enregistré.</p>}
        </>
      )}

      {qualifySession && (
        <QualifySessionDialog
          session={qualifySession}
          siblingSessions={timesheet?.sessions ?? []}
          onClose={() => setQualifySession(null)}
        />
      )}
    </div>
  );
}
