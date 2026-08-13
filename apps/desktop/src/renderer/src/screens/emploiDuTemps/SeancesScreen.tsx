import type { SeanceStatus } from "@isac-erp/shared";
import { Badge, Button, Select } from "@isac-erp/ui";
import { useState } from "react";
import { usePrintThemeStyle } from "../../lib/printTheme";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { CreateSeanceDialog } from "./CreateSeanceDialog";

const STATUS_BADGE: Record<SeanceStatus, { label: string; variant: "success" | "destructive" | "default" | "muted" }> = {
  PROGRAMMEE: { label: "🟣 Programmée", variant: "muted" },
  EFFECTUEE: { label: "🟢 Effectuée", variant: "success" },
  REPORTEE: { label: "🟡 Reportée", variant: "muted" },
  ANNULEE: { label: "🔴 Annulée", variant: "destructive" },
  REMPLACEE: { label: "🔵 Remplacée", variant: "default" },
};

/**
 * Emploi du temps — vue unique filtrée par classe/enseignant/salle/filière/niveau/semestre
 * (MODULE-05.2 §1.2), jamais une table séparée par vue. Impression via le moteur de thèmes
 * d'impression (MODULE-05.1/ADR-037), pas de fichier PDF généré (§1.15).
 */
export function SeancesScreen() {
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const canModify = useHasPermission("EMPLOI_DU_TEMPS:MODIFICATION");
  const printThemeStyle = usePrintThemeStyle();

  const teachersQuery = trpc.teachers.list.useQuery({
    includeArchived: false,
    page: 1,
    pageSize: 200,
    sortBy: "lastName",
    sortDirection: "asc",
  });
  const classesQuery = trpc.schoolClasses.list.useQuery({});
  const roomsQuery = trpc.rooms.list.useQuery({});
  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const periodsQuery = trpc.academicPeriods.list.useQuery({});

  const seancesQuery = trpc.seances.list.useQuery({
    teacherId: teacherId || undefined,
    classId: classId || undefined,
    roomId: roomId || undefined,
    filiereId: filiereId || undefined,
    levelId: levelId || undefined,
    periodId: periodId || undefined,
  });

  const seances = seancesQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Enseignant</label>
            <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Tous</option>
              {(teachersQuery.data?.rows ?? []).map((t) => <option key={t.id} value={t.id}>{t.lastName} {t.firstName}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Classe</label>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Toutes</option>
              {(classesQuery.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Salle</label>
            <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">Toutes</option>
              {(roomsQuery.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Filière</label>
            <Select value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
              <option value="">Toutes</option>
              {(filieresQuery.data ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Niveau</label>
            <Select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">Tous</option>
              {(levelsQuery.data ?? []).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Semestre</label>
            <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
              <option value="">Tous</option>
              {(periodsQuery.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>Imprimer</Button>
          {canModify && <Button onClick={() => setCreateOpen(true)}>Nouvelle séance</Button>}
        </div>
      </div>

      <div data-print-area style={printThemeStyle} className="flex flex-col gap-2 print-text">
        <p className="hidden text-center text-base font-semibold print-title print:block">Emploi du temps</p>
        {seancesQuery.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!seancesQuery.isLoading && seances.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucune séance pour ces filtres.</p>
        )}
        {seances.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm print-border">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">
                {s.sessionDate.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                {" — "}
                {s.startTime} à {s.endTime}
              </span>
              <span className="text-muted-foreground">
                {s.subjectName} — {s.teacherName} — {s.classNames.join(", ")}
                {s.roomLabel ? ` — ${s.roomLabel}` : ""}
              </span>
            </div>
            <Badge variant={STATUS_BADGE[s.status].variant}>{STATUS_BADGE[s.status].label}</Badge>
          </div>
        ))}
      </div>

      {createOpen && <CreateSeanceDialog onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
