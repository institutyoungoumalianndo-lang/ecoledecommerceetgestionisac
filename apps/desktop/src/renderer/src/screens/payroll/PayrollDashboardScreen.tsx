import { Card, CardContent, CardHeader, CardTitle, StatRingCard as StatCard } from "@isac-erp/ui";
import { trpc } from "../../lib/trpc";

/** Tableau de bord de la paie (MODULE-08 §1.12/§11.18) — calculé à la volée. */
export function PayrollDashboardScreen() {
  const query = trpc.payrollDashboard.get.useQuery({});
  const data = query.data;
  const maxHistory = data ? Math.max(1, ...data.monthlyHistory.map((h) => h.total)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Tableau de bord de la paie</h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Masse salariale du mois" value={data ? data.monthlyPayroll.toLocaleString("fr-FR") : undefined} color="blue" />
        <StatCard label="Masse salariale annuelle" value={data ? data.yearlyPayroll.toLocaleString("fr-FR") : undefined} color="violet" />
        <StatCard label="Employés payés (mois)" value={data?.paidEmployeeCount} color="emerald" />
        <StatCard label="Employés en attente" value={data?.pendingEmployeeCount} color="amber" />
        <StatCard label="Salaires enseignants" value={data ? data.teacherSalaries.toLocaleString("fr-FR") : undefined} color="blue" />
        <StatCard label="Salaires personnel administratif" value={data ? data.administrativeSalaries.toLocaleString("fr-FR") : undefined} color="violet" />
        <StatCard label="Coût des heures d'enseignement" value={data ? data.teachingHoursCost.toLocaleString("fr-FR") : undefined} color="pink" />
        <StatCard label="Total primes / retenues" value={data ? `${data.totalPrimes.toLocaleString("fr-FR")} / ${data.totalRetenues.toLocaleString("fr-FR")}` : undefined} color="amber" />
      </div>

      <Card variant="static">
        <CardHeader>
          <CardTitle>Historique des paiements mensuels</CardTitle>
        </CardHeader>
        <CardContent>
          {!data || data.monthlyHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.monthlyHistory.map((h) => (
                <div key={`${h.year}-${h.month}`} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">{h.label}</span>
                    <span>{h.total.toLocaleString("fr-FR")}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-blue-500" style={{ width: `${(h.total / maxHistory) * 100}%` }} />
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
