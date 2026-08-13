import { Card, CardContent, CardHeader, CardTitle, StatRingCard as StatCard } from "@isac-erp/ui";
import { trpc } from "../../lib/trpc";

/** Tableau de bord Enseignants (MODULE-05 §1.9/§10.9) — répartitions calculées à la volée. */
export function TeacherDashboardScreen() {
  const query = trpc.teacherDashboard.get.useQuery();
  const data = query.data;
  const maxStatusCount = data ? Math.max(1, ...data.byStatus.map((s) => s.count)) : 1;
  const maxSpecialtyCount = data ? Math.max(1, ...data.bySpecialty.map((s) => s.count)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Tableau de bord Enseignants</h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total enseignants" value={data?.totalCount} color="blue" />
        <StatCard
          label="Charge horaire moyenne / semaine"
          value={data ? `${data.averageWeeklyHours.toFixed(1)} h` : undefined}
          color="violet"
        />
        <StatCard label="Disponibles aujourd'hui" value={data?.availableCount} color="emerald" />
      </div>

      <Card variant="static">
        <CardHeader>
          <CardTitle>Répartition par statut</CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.byStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.byStatus.map((row) => (
                <div key={row.statusLabel} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{row.statusLabel}</span>
                    <span>{row.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-blue-500" style={{ width: `${(row.count / maxStatusCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="static">
        <CardHeader>
          <CardTitle>Répartition par spécialité</CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.bySpecialty.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.bySpecialty.map((row) => (
                <div key={row.specialty} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{row.specialty}</span>
                    <span>{row.count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-violet-500" style={{ width: `${(row.count / maxSpecialtyCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
