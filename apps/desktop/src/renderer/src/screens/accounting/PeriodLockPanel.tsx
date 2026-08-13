import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

/** Verrouillage des périodes comptables (MODULE-07 §1.5/§8.15) — bloque toute nouvelle écriture sur la période. */
export function PeriodLockPanel() {
  const [year, setYear] = useState(new Date().getFullYear());
  const canValidate = useHasPermission("ECRITURES:VALIDATION");
  const utils = trpc.useUtils();
  const query = trpc.accountingPeriods.list.useQuery({ year });

  const lock = trpc.accountingPeriods.lock.useMutation({ onSuccess: () => void utils.accountingPeriods.list.invalidate() });
  const unlock = trpc.accountingPeriods.unlock.useMutation({ onSuccess: () => void utils.accountingPeriods.list.invalidate() });

  const byMonth = new Map((query.data ?? []).map((p) => [p.month, p]));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Verrouillage des périodes — {year}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setYear((y) => y - 1)}>
            ← {year - 1}
          </Button>
          <Button variant="outline" onClick={() => setYear((y) => y + 1)}>
            {year + 1} →
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {MONTH_LABELS.map((label, index) => {
            const month = index + 1;
            const period = byMonth.get(month);
            const isLocked = period?.isLocked ?? false;
            return (
              <div key={month} className="flex flex-col items-center gap-1 rounded-md border border-border p-2">
                <span className="text-xs font-medium">{label}</span>
                <Badge variant={isLocked ? "destructive" : "success"}>{isLocked ? "Verrouillé" : "Ouvert"}</Badge>
                {canValidate && (
                  <Button
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() =>
                      isLocked ? unlock.mutate({ year, month }) : lock.mutate({ year, month })
                    }
                  >
                    {isLocked ? "Déverrouiller" : "Verrouiller"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
