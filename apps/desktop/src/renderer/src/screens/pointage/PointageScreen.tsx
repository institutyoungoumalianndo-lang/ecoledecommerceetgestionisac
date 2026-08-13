import type { SeanceDto, SeanceStatus } from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Select, StatRingCard as StatCard } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { QualifySessionDialog } from "./QualifySessionDialog";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const STATUS_BADGE: Record<SeanceStatus, { label: string; variant: "success" | "destructive" | "default" | "muted" }> = {
  PROGRAMMEE: { label: "🟣 Programmée", variant: "muted" },
  EFFECTUEE: { label: "🟢 Effectuée", variant: "success" },
  REPORTEE: { label: "🟡 Reportée", variant: "muted" },
  ANNULEE: { label: "🔴 Annulée", variant: "destructive" },
  REMPLACEE: { label: "🔵 Remplacée", variant: "default" },
};

/**
 * Fiche mensuelle de pointage (MODULE-05.2 §1.8) — les séances affichées proviennent désormais de
 * l'emploi du temps réel (module "Emploi du temps"), plus de génération synthétique depuis un
 * créneau hebdomadaire. Seul un utilisateur du système peut qualifier une séance (§1.9).
 */
export function PointageScreen() {
  const today = new Date();
  const [teacherId, setTeacherId] = useState("");
  const [year, setYear] = useState(String(today.getFullYear()));
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [qualifySession, setQualifySession] = useState<SeanceDto | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const canValidate = useHasPermission("POINTAGE:VALIDATION");
  const canAdminister = useHasPermission("POINTAGE:ADMINISTRATION");
  const utils = trpc.useUtils();

  const teachersQuery = trpc.teachers.list.useQuery({
    includeArchived: false,
    page: 1,
    pageSize: 200,
    sortBy: "lastName",
    sortDirection: "asc",
  });

  const timesheetQuery = trpc.seances.getMonthlyTimesheet.useQuery(
    { teacherId, year: Number(year), month: Number(month) },
    { enabled: Boolean(teacherId) }
  );

  const closeTimesheet = trpc.seances.closeMonthlyTimesheet.useMutation({
    onSuccess: () => void utils.seances.getMonthlyTimesheet.invalidate(),
  });
  const reopenTimesheet = trpc.seances.reopenMonthlyTimesheet.useMutation({
    onSuccess: () => void utils.seances.getMonthlyTimesheet.invalidate(),
  });

  const timesheet = timesheetQuery.data;

  // Qualification groupée (extension du 2026-07-30, retour du porteur du projet) : les séances
  // passées encore PROGRAMMEE sont présélectionnées comme "effectuées" par défaut — l'admin ne
  // décoche que les exceptions (absence, cours annulé...) avant de les qualifier individuellement.
  useEffect(() => {
    if (!timesheet) return;
    const now = new Date();
    const defaultSelection = new Set(
      timesheet.sessions.filter((s) => s.status === "PROGRAMMEE" && s.sessionDate <= now).map((s) => s.id)
    );
    setSelectedIds(defaultSelection);
  }, [timesheet]);

  const qualifyBulk = trpc.seances.qualifyBulk.useMutation({
    onSuccess: () => void utils.seances.getMonthlyTimesheet.invalidate(),
  });

  const pastProgrammedSessions = (timesheet?.sessions ?? []).filter((s) => s.status === "PROGRAMMEE" && s.sessionDate <= new Date());

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Enseignant</label>
          <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">—</option>
            {(teachersQuery.data?.rows ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Mois</label>
          <Select value={month} onChange={(e) => setMonth(e.target.value)}>
            {MONTHS.map((label, i) => (
              <option key={label} value={i + 1}>{label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Année</label>
          <Select value={year} onChange={(e) => setYear(e.target.value)}>
            {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>
      </div>

      {!teacherId && <p className="text-sm text-muted-foreground">Sélectionnez un enseignant pour voir sa fiche.</p>}

      {teacherId && timesheetQuery.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {teacherId && timesheet && (
        <>
          <Card variant="static">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                Fiche de {timesheet.teacherName} — {MONTHS[timesheet.month - 1]} {timesheet.year}
              </CardTitle>
              <Badge variant={timesheet.status === "CLOTUREE" ? "success" : "muted"}>
                {timesheet.status === "CLOTUREE" ? "Clôturée" : "Ouverte"}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <StatCard label="Séances prévues" value={String(timesheet.sessionsPlanned)} />
                <StatCard label="Séances effectuées" value={String(timesheet.sessionsDone)} />
                <StatCard label="Séances reportées" value={String(timesheet.sessionsPostponed)} />
                <StatCard label="Séances non effectuées" value={String(timesheet.sessionsNotDone)} />
                <StatCard label="Heures effectuées" value={`${timesheet.hoursDone.toFixed(1)} h`} />
              </div>

              <div className="flex justify-end gap-2">
                {timesheet.status === "OUVERTE" && canValidate && (
                  <Button variant="outline" onClick={() => closeTimesheet.mutate({ id: timesheet.id })}>
                    Clôturer la fiche
                  </Button>
                )}
                {timesheet.status === "CLOTUREE" && canAdminister && (
                  <Button variant="outline" onClick={() => reopenTimesheet.mutate({ id: timesheet.id })}>
                    Rouvrir la fiche
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {timesheet.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune séance planifiée pour ce mois — créez-les depuis le module Emploi du temps.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {canValidate && pastProgrammedSessions.length > 0 && timesheet.status === "OUVERTE" && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <span>
                    {selectedIds.size} séance{selectedIds.size > 1 ? "s" : ""} passée{pastProgrammedSessions.length > 1 ? "s" : ""} présélectionnée
                    {selectedIds.size > 1 ? "s" : ""} comme effectuée{selectedIds.size > 1 ? "s" : ""} — décochez les exceptions
                    (absence, cours annulé…) avant de valider.
                  </span>
                  <Button
                    disabled={selectedIds.size === 0 || qualifyBulk.isPending}
                    onClick={() => qualifyBulk.mutate({ ids: [...selectedIds] })}
                  >
                    {qualifyBulk.isPending ? "Qualification…" : `Marquer ${selectedIds.size} séance${selectedIds.size > 1 ? "s" : ""} comme effectuées`}
                  </Button>
                </div>
              )}
              {qualifyBulk.error && <p className="text-sm text-destructive">{qualifyBulk.error.message}</p>}
              {timesheet.sessions.map((session) => {
                const isBulkCandidate = session.status === "PROGRAMMEE" && session.sessionDate <= new Date() && timesheet.status === "OUVERTE";
                return (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    {canValidate && isBulkCandidate && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(session.id)}
                        onChange={() => toggleSelected(session.id)}
                        className="h-4 w-4 rounded border-border text-primary"
                      />
                    )}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {session.sessionDate.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" })}
                        {" — "}
                        {session.startTime} à {session.endTime}
                      </span>
                      <span className="text-muted-foreground">
                        {session.subjectName} — {session.classNames.join(", ")}
                        {session.filiereName ? ` (${session.filiereName})` : ""}
                        {session.roomLabel ? ` — ${session.roomLabel}` : ""}
                      </span>
                      {session.reason && <span className="text-xs text-muted-foreground">Motif : {session.reason}</span>}
                      {session.substituteTeacherName && (
                        <span className="text-xs text-muted-foreground">Remplacé par {session.substituteTeacherName}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_BADGE[session.status].variant}>{STATUS_BADGE[session.status].label}</Badge>
                    {canValidate && (
                      <Button variant="outline" onClick={() => setQualifySession(session)}>
                        Qualifier
                      </Button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
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
