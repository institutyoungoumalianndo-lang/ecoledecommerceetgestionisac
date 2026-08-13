import { Card, CardContent, CardHeader, CardTitle, Label, Select, StatRingCard as StatCard } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/** Tableau de bord des inscriptions (MODULE-04.1 §5.8) — couleurs par pertinence. */
export function EnrollmentDashboardScreen() {
  const [academicYearId, setAcademicYearId] = useState("");
  const yearsQuery = trpc.academicYears.list.useQuery();
  const dashboardQuery = trpc.enrollments.dashboard.useQuery({ academicYearId: academicYearId || undefined });

  const data = dashboardQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-xs">
        <Label>Année universitaire</Label>
        <Select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
          <option value="">Année active</option>
          {(yearsQuery.data ?? []).map((y) => (
            <option key={y.id} value={y.id}>{y.label}</option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Nouvelles inscriptions" value={data?.newEnrollmentsCount} color="blue" />
        <StatCard label="Réinscriptions" value={data?.reenrollmentsCount} color="violet" />
        <StatCard label="Garçons" value={data?.byGender.M} color="sky" />
        <StatCard label="Filles" value={data?.byGender.F} color="pink" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BreakdownCard title="Effectifs par filière" rows={(data?.byFiliere ?? []).map((f) => ({ label: f.filiereName, count: f.count }))} />
        <BreakdownCard title="Effectifs par niveau" rows={(data?.byLevel ?? []).map((l) => ({ label: l.levelLabel, count: l.count }))} />
        <BreakdownCard title="Effectifs par classe" rows={(data?.byClass ?? []).map((c) => ({ label: c.className, count: c.count }))} />
      </div>
    </div>
  );
}

const ROW_PALETTE: { dot: string; badge: string }[] = [
  { dot: "bg-blue-500", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  { dot: "bg-violet-500", badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300" },
  { dot: "bg-pink-500", badge: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300" },
  { dot: "bg-sky-500", badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" },
];

function BreakdownCard({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <Card variant="static">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {rows.map((r, index) => {
              const palette = ROW_PALETTE[index % ROW_PALETTE.length]!;
              return (
                <li key={r.label} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 even:bg-muted/50">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${palette.dot}`} />
                    {r.label}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${palette.badge}`}>{r.count}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
