import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

/** Budget (MODULE-07 §1.9/§8.9) — écart prévisionnel/réalisé toujours calculé à la volée. */
export function BudgetScreen() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const canModify = useHasPermission("BUDGET:CREATION");
  const utils = trpc.useUtils();

  const categoriesQuery = trpc.expenseCategories.list.useQuery();
  const budgetQuery = trpc.budgets.getByYear.useQuery({ year });

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const line of budgetQuery.data?.lines ?? []) {
      initial[line.categoryId] = String(line.allocatedAmount);
    }
    setAmounts(initial);
  }, [budgetQuery.data]);

  const create = trpc.budgets.create.useMutation({ onSuccess: () => void utils.budgets.getByYear.invalidate({ year }) });
  const updateLines = trpc.budgets.updateLines.useMutation({ onSuccess: () => void utils.budgets.getByYear.invalidate({ year }) });

  function save() {
    const lines = Object.entries(amounts)
      .filter(([, v]) => Number(v) > 0)
      .map(([categoryId, v]) => ({ categoryId, allocatedAmount: Number(v) }));
    if (budgetQuery.data) {
      updateLines.mutate({ budgetId: budgetQuery.data.id, lines });
    } else {
      create.mutate({ year, lines });
    }
  }

  const budget = budgetQuery.data;
  const lineByCategory = new Map((budget?.lines ?? []).map((l) => [l.categoryId, l]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setYear((y) => y - 1)}>← {year - 1}</Button>
        <h2 className="text-lg font-semibold text-foreground">Budget {year}</h2>
        <Button variant="outline" onClick={() => setYear((y) => y + 1)}>{year + 1} →</Button>
      </div>

      {budget && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Total budgété</p>
            <p className="text-lg font-semibold">{budget.totalAllocated.toLocaleString("fr-FR")}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Total réalisé</p>
            <p className="text-lg font-semibold">{budget.totalActual.toLocaleString("fr-FR")}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Écart</p>
            <p className={`text-lg font-semibold ${budget.totalVariance < 0 ? "text-destructive" : "text-success"}`}>
              {budget.totalVariance.toLocaleString("fr-FR")}
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Répartition par catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {(categoriesQuery.data ?? []).filter((c) => c.isActive).map((category) => {
              const line = lineByCategory.get(category.id);
              return (
                <div key={category.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 even:bg-primary/5">
                  <span className="flex-1 text-sm">{category.name}</span>
                  {line && (
                    <Badge variant={line.variance < 0 ? "destructive" : "success"}>
                      Réalisé : {line.actualAmount.toLocaleString("fr-FR")} (écart {line.variance.toLocaleString("fr-FR")})
                    </Badge>
                  )}
                  <Input
                    type="number"
                    min={0}
                    className="w-36"
                    disabled={!canModify}
                    value={amounts[category.id] ?? ""}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [category.id]: e.target.value }))}
                  />
                </div>
              );
            })}
          </div>
          {canModify && (
            <div className="mt-4 flex justify-end">
              <Button onClick={save} disabled={create.isPending || updateLines.isPending}>
                {create.isPending || updateLines.isPending ? "Enregistrement…" : "Enregistrer le budget"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
