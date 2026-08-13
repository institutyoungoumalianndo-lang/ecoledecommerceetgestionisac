import { Card, CardContent, CardHeader, CardTitle, StatRingCard as StatCard } from "@isac-erp/ui";
import { trpc } from "../../lib/trpc";

/** Tableau de bord pédagogique (MODULE-02.1 §1.11/§9.13) — répartitions calculées à la volée sur l'année active. */
export function PedagogicalDashboardScreen() {
  const query = trpc.pedagogicalDashboard.get.useQuery();
  const data = query.data;
  const maxHours = data ? Math.max(1, data.hoursByType.course, data.hoursByType.td, data.hoursByType.tp, data.hoursByType.personalWork) : 1;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Tableau de bord pédagogique</h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Filières actives" value={data?.filiereCount} color="blue" />
        <StatCard label="Niveaux actifs" value={data?.levelCount} color="violet" />
        <StatCard label="Classes actives" value={data?.classCount} color="emerald" />
        <StatCard label="Matières actives" value={data?.subjectCount} color="amber" />
        <StatCard label="Unités d'enseignement" value={data?.teachingUnitCount} color="pink" />
      </div>

      <Card variant="static">
        <CardHeader>
          <CardTitle>Répartition des volumes horaires (année active)</CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <div className="flex flex-col gap-3">
              {[
                { label: "Cours", value: data.hoursByType.course, color: "bg-blue-500" },
                { label: "Travaux dirigés (TD)", value: data.hoursByType.td, color: "bg-violet-500" },
                { label: "Travaux pratiques (TP)", value: data.hoursByType.tp, color: "bg-emerald-500" },
                { label: "Travail personnel", value: data.hoursByType.personalWork, color: "bg-amber-500" },
              ].map((row) => (
                <div key={row.label} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{row.label}</span>
                    <span>{row.value} h</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full ${row.color}`} style={{ width: `${(row.value / maxHours) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="static">
        <CardHeader>
          <CardTitle>Répartition des crédits par filière</CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.creditsByFiliere.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {data.creditsByFiliere.map((f) => (
                <li key={f.filiereId} className="flex items-center justify-between rounded-md px-2 py-1 even:bg-muted/50">
                  <span>{f.filiereName}</span>
                  <span className="font-medium">{f.totalCredits} crédits</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
