import type { DayOfWeek, SeanceRecurrenceTemplateDto } from "@isac-erp/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@isac-erp/ui";
import { trpc } from "../../lib/trpc";

const DAY_ORDER: DayOfWeek[] = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];

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
 * Emploi du temps hebdomadaire compact (2026-08-08, demande du porteur du projet — "voir dans un coin
 * l'emploi du temps de chaque professeur selon les affectations") — réutilise directement les créneaux
 * déjà posés via le Constructeur d'emploi du temps (`seanceRecurrenceTemplates`, Module 5.2), aucune
 * nouvelle donnée : un créneau récurrent découle toujours d'une affectation pédagogique existante.
 */
export function TeacherWeeklyScheduleCard({ teacherId }: { teacherId: string }) {
  const query = trpc.seanceRecurrenceTemplates.list.useQuery({ teacherId, activeOnly: true });
  const templates = query.data ?? [];

  const byDay = new Map<DayOfWeek, SeanceRecurrenceTemplateDto[]>(DAY_ORDER.map((d) => [d, []]));
  for (const t of templates) byDay.get(t.dayOfWeek)?.push(t);
  for (const list of byDay.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <Card variant="static">
      <CardHeader>
        <CardTitle>Emploi du temps hebdomadaire</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun créneau défini — à poser depuis le Constructeur d'emploi du temps une fois les affectations créées.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {DAY_ORDER.map((day) => (
              <div key={day} className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{DAY_LABELS[day]}</p>
                {(byDay.get(day) ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">—</p>
                ) : (
                  byDay.get(day)!.map((t) => (
                    <div key={t.id} className="rounded-md border border-border p-1.5 text-xs">
                      <p className="font-medium">{t.startTime}–{t.endTime}</p>
                      <p className="truncate" title={t.subjectName}>{t.subjectName}</p>
                      <p className="truncate text-muted-foreground" title={t.classNames.join(", ")}>
                        {t.classNames.join(", ")}
                        {t.roomLabel ? ` — ${t.roomLabel}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
