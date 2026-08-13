import type { DayOfWeek, ScheduleBuilderAssignmentDto } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const DAY_LABELS: Record<DayOfWeek, string> = {
  LUNDI: "Lundi",
  MARDI: "Mardi",
  MERCREDI: "Mercredi",
  JEUDI: "Jeudi",
  VENDREDI: "Vendredi",
  SAMEDI: "Samedi",
  DIMANCHE: "Dimanche",
};

/**
 * Constructeur d'emploi du temps (2026-08-06, retour du porteur du projet) : pour une combinaison
 * Année × Filière (optionnelle) × Niveau × Module (= Semestre), affiche les affectations enregistrées
 * (Module 5) et permet de poser le jour/l'heure de chacune (Module 5.2 — SeanceRecurrenceTemplate),
 * avec blocage automatique en cas de conflit enseignant/salle/classe. Génère ensuite la grille
 * imprimable (EMPLOI_DU_TEMPS) depuis ces créneaux.
 */
export function ScheduleBuilderScreen() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [slotDialogFor, setSlotDialogFor] = useState<ScheduleBuilderAssignmentDto | null>(null);

  const canModify = useHasPermission("EMPLOI_DU_TEMPS:MODIFICATION");
  const yearsQuery = trpc.academicYears.list.useQuery();
  const activeYearId = yearsQuery.data?.find((y) => y.isActive)?.id ?? "";
  const effectiveYearId = academicYearId || activeYearId;

  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const periodsQuery = trpc.academicPeriods.list.useQuery({ academicYearId: effectiveYearId }, { enabled: Boolean(effectiveYearId) });

  const scopeReady = Boolean(effectiveYearId && levelId && periodId);
  const listQuery = trpc.scheduleBuilder.list.useQuery(
    { academicYearId: effectiveYearId, filiereId: filiereId || null, levelId, periodId },
    { enabled: scopeReady }
  );

  const generate = trpc.documents.generate.useMutation();

  const columns: DataTableColumn<ScheduleBuilderAssignmentDto>[] = [
    { key: "matiere", header: "Matière", value: (r) => r.subjectName },
    { key: "classe", header: "Classe", value: (r) => r.className },
    { key: "enseignant", header: "Enseignant", value: (r) => r.template?.teacherName ?? "—" },
    {
      key: "creneau",
      header: "Créneau",
      value: (r) => (r.template ? `${DAY_LABELS[r.template.dayOfWeek]} ${r.template.startTime}-${r.template.endTime}` : "À définir"),
      render: (r) =>
        r.template ? (
          <span className="text-sm">
            {DAY_LABELS[r.template.dayOfWeek]} {r.template.startTime}–{r.template.endTime}
            {r.template.roomLabel && <span className="text-muted-foreground"> — {r.template.roomLabel}</span>}
          </span>
        ) : (
          <Badge variant="destructive">À définir</Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label>Année universitaire</Label>
          <Select value={effectiveYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
            <option value="">—</option>
            {(yearsQuery.data ?? []).map((y) => (
              <option key={y.id} value={y.id}>{y.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Filière</Label>
          <Select value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
            <option value="">— Toutes —</option>
            {(filieresQuery.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Niveau</Label>
          <Select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
            <option value="">—</option>
            {(levelsQuery.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Module</Label>
          <Select value={periodId} disabled={!effectiveYearId} onChange={(e) => setPeriodId(e.target.value)}>
            <option value="">—</option>
            {(periodsQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </div>
      </div>

      {scopeReady && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {listQuery.data?.length ?? 0} affectation(s) — {(listQuery.data ?? []).filter((a) => !a.template).length} créneau(x) à définir.
          </p>
          <Button
            disabled={generate.isPending}
            onClick={() =>
              generate.mutate({
                documentType: "EMPLOI_DU_TEMPS",
                academicYearId: effectiveYearId,
                filiereId: filiereId || undefined,
                levelId,
                periodId,
              })
            }
          >
            {generate.isPending ? "Génération…" : "Générer l'emploi du temps"}
          </Button>
        </div>
      )}

      {generate.error && <p className="text-sm text-destructive">{generate.error.message}</p>}
      {generate.data && (
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Document généré — n° {generate.data.documentNumber}</p>
          <a href={resolveUploadUrl(generate.data.filePath) ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
            Voir le PDF
          </a>
        </div>
      )}

      {scopeReady && (
        <DataTable
          columns={columns}
          rows={listQuery.data ?? []}
          getRowId={(r) => r.id}
          emptyMessage={listQuery.isLoading ? "Chargement…" : "Aucune affectation pour cette sélection."}
          rowActions={
            canModify
              ? (r) => (
                  <Button variant="outline" onClick={() => setSlotDialogFor(r)}>
                    {r.template ? "Modifier le créneau" : "Définir le créneau"}
                  </Button>
                )
              : undefined
          }
        />
      )}

      {slotDialogFor && <SlotDialog assignment={slotDialogFor} onClose={() => setSlotDialogFor(null)} />}
    </div>
  );
}

function SlotDialog({ assignment, onClose }: { assignment: ScheduleBuilderAssignmentDto; onClose: () => void }) {
  const existing = assignment.template;
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(existing?.dayOfWeek ?? "LUNDI");
  const [startTime, setStartTime] = useState(existing?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(existing?.endTime ?? "10:00");
  const [roomId, setRoomId] = useState(existing?.roomId ?? "");

  const roomsQuery = trpc.rooms.list.useQuery({ activeOnly: true });
  const utils = trpc.useUtils();

  function invalidateAndClose() {
    void utils.scheduleBuilder.list.invalidate();
    onClose();
  }

  const create = trpc.seanceRecurrenceTemplates.create.useMutation({ onSuccess: invalidateAndClose });
  const update = trpc.seanceRecurrenceTemplates.update.useMutation({ onSuccess: invalidateAndClose });

  const error = create.error ?? update.error;
  const isPending = create.isPending || update.isPending;

  function handleSubmit() {
    if (existing) {
      // Ne touche jamais aux classes déjà couvertes par ce modèle (potentiellement mutualisé entre
      // plusieurs classes) — seuls le jour/l'heure/la salle sont modifiables depuis ce constructeur.
      update.mutate({
        id: existing.id,
        roomId: roomId || null,
        dayOfWeek,
        startTime,
        endTime,
        pedagogicalGroupId: existing.pedagogicalGroupId,
        classIds: existing.classIds,
        isActive: true,
      });
    } else {
      create.mutate({
        teacherId: assignment.teacherId,
        subjectOfferingId: assignment.subjectOfferingId,
        roomId: roomId || null,
        dayOfWeek,
        startTime,
        endTime,
        classIds: [assignment.classId],
      });
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Créneau — ${assignment.subjectName} — ${assignment.className}`}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label>Jour</Label>
            <Select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}>
              {Object.entries(DAY_LABELS)
                .filter(([key]) => key !== "DIMANCHE")
                .map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Heure de début</Label>
            <input type="time" className="h-9 rounded-md border border-border bg-background px-3 text-sm" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Heure de fin</Label>
            <input type="time" className="h-9 rounded-md border border-border bg-background px-3 text-sm" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Salle</Label>
            <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">—</option>
              {(roomsQuery.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error.message}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={isPending || startTime >= endTime} onClick={handleSubmit}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
