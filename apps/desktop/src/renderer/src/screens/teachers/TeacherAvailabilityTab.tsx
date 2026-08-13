import type { DayOfWeek } from "@isac-erp/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
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

/** Disponibilités (MODULE-05 §1.4/§10.5) — créneaux hebdomadaires récurrents + congés/indisponibilités datés. */
export function TeacherAvailabilityTab({ teacherId }: { teacherId: string }) {
  const canView = useHasPermission("ENSEIGNANTS_AFFECTATIONS:LECTURE");
  const canCreate = useHasPermission("ENSEIGNANTS_AFFECTATIONS:CREATION");
  const canDelete = useHasPermission("ENSEIGNANTS_AFFECTATIONS:SUPPRESSION");
  const utils = trpc.useUtils();

  const weeklyQuery = trpc.teacherAvailability.listWeekly.useQuery({ teacherId });
  const leavesQuery = trpc.teacherAvailability.listLeaves.useQuery({ teacherId });

  const [day, setDay] = useState<DayOfWeek>("LUNDI");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");

  const createWeekly = trpc.teacherAvailability.createWeekly.useMutation({
    onSuccess: () => void utils.teacherAvailability.listWeekly.invalidate({ teacherId }),
  });
  const deleteWeekly = trpc.teacherAvailability.deleteWeekly.useMutation({
    onSuccess: () => void utils.teacherAvailability.listWeekly.invalidate({ teacherId }),
  });

  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const createLeave = trpc.teacherAvailability.createLeave.useMutation({
    onSuccess: () => {
      void utils.teacherAvailability.listLeaves.invalidate({ teacherId });
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
    },
  });
  const deleteLeave = trpc.teacherAvailability.deleteLeave.useMutation({
    onSuccess: () => void utils.teacherAvailability.listLeaves.invalidate({ teacherId }),
  });

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Créneaux hebdomadaires de disponibilité</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canCreate && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Jour</Label>
                <Select value={day} onChange={(e) => setDay(e.target.value as DayOfWeek)}>
                  {Object.entries(DAY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>De</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>À</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
              <Button
                disabled={createWeekly.isPending}
                onClick={() => createWeekly.mutate({ teacherId, dayOfWeek: day, startTime, endTime })}
              >
                Ajouter
              </Button>
            </div>
          )}
          {createWeekly.error && <p className="text-sm text-destructive">{createWeekly.error.message}</p>}

          {(weeklyQuery.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun créneau renseigné.</p>
          )}
          <div className="flex flex-col gap-2">
            {(weeklyQuery.data ?? []).map((slot) => (
              <div key={slot.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                <span>{DAY_LABELS[slot.dayOfWeek]} — {slot.startTime} à {slot.endTime}</span>
                {canDelete && (
                  <Button variant="destructive" onClick={() => deleteWeekly.mutate({ id: slot.id })}>
                    Retirer
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Congés / indisponibilités</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canCreate && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Du</Label>
                <Input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Au</Label>
                <Input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Motif</Label>
                <Input value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} />
              </div>
              <Button
                disabled={!leaveStart || !leaveEnd || createLeave.isPending}
                onClick={() =>
                  createLeave.mutate({
                    teacherId,
                    startDate: new Date(leaveStart),
                    endDate: new Date(leaveEnd),
                    reason: leaveReason || undefined,
                  })
                }
              >
                Ajouter
              </Button>
            </div>
          )}
          {createLeave.error && <p className="text-sm text-destructive">{createLeave.error.message}</p>}

          {(leavesQuery.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun congé renseigné.</p>
          )}
          <div className="flex flex-col gap-2">
            {(leavesQuery.data ?? []).map((leave) => (
              <div key={leave.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                <span>
                  {new Date(leave.startDate).toLocaleDateString("fr-FR")} — {new Date(leave.endDate).toLocaleDateString("fr-FR")}
                  {leave.reason ? ` — ${leave.reason}` : ""}
                </span>
                {canDelete && (
                  <Button variant="destructive" onClick={() => deleteLeave.mutate({ id: leave.id })}>
                    Retirer
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
