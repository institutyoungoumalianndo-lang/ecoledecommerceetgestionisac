import { Badge, Card } from "@isac-erp/ui";
import { Calculator, CalendarClock, Percent, PiggyBank, Wallet } from "lucide-react";
import { trpc } from "../../lib/trpc";
import { CountUpAmount } from "./CountUpAmount";

/** Coût de la scolarité (MODULE-04.2 §1.7/§6.6) — "payé"/"reste à payer" calculés depuis les paiements réels (Module 4.3). */
export function StudentFeesTab({ studentId }: { studentId: string }) {
  const query = trpc.feeSummary.getForStudent.useQuery({ studentId });
  const data = query.data;

  if (!data) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const installments = data.lines
    .flatMap((line) => line.installments.map((i) => ({ ...i, feeTypeName: line.feeTypeName })))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const today = new Date();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Année universitaire : {data.academicYearLabel}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card variant="static" className="border-l-4 border-l-primary p-4 transition-transform hover:-translate-y-0.5">
          <p className="mb-3 inline-block rounded-full bg-primary/8 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            Tarification
          </p>
          <div className="flex items-center gap-2.5 border-b border-dashed border-border py-1.5">
            <Calculator className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Tarif total</span>
            <span className="ml-auto text-base font-bold">
              <CountUpAmount value={data.totalTariff} />
            </span>
          </div>
          <div className="flex items-center gap-2.5 py-1.5">
            <Percent className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Réductions</span>
            <span className="ml-auto text-base font-bold text-success">
              -<CountUpAmount value={data.totalReductions} />
            </span>
          </div>
        </Card>

        <Card variant="static" className="border-l-4 border-l-warning p-4 transition-transform hover:-translate-y-0.5">
          <p className="mb-3 inline-block rounded-full bg-primary/8 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            Situation
          </p>
          <div className="flex items-center gap-2.5 border-b border-dashed border-border py-1.5">
            <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Net à payer</span>
            <span className="ml-auto text-base font-bold">
              <CountUpAmount value={data.totalNet} />
            </span>
          </div>
          <div className="flex items-center gap-2.5 border-b border-dashed border-border py-1.5">
            <PiggyBank className="h-4 w-4 shrink-0 text-success" />
            <span className="text-xs text-muted-foreground">Payé</span>
            <span className="ml-auto text-base font-bold text-success">
              <CountUpAmount value={data.totalPaid} />
            </span>
          </div>
          <div className="flex items-center gap-2.5 py-1.5">
            <CalendarClock className="h-4 w-4 shrink-0 text-warning" />
            <span className="text-xs text-muted-foreground">Reste à payer</span>
            <span className="ml-auto text-base font-bold text-warning">
              <CountUpAmount value={data.totalRemaining} />
            </span>
          </div>
        </Card>
      </div>

      {data.totalSurplus > 0 && (
        <Badge variant="success">Excédent versé : {data.totalSurplus.toLocaleString("fr-FR")}</Badge>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Type de frais</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Tarif</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Réductions</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Net</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Payé</th>
              <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Solde</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line) => (
              <tr key={line.feeTypeId} className="border-t border-border even:bg-primary/5">
                <td className="px-3 py-2">{line.feeTypeName}</td>
                <td className="px-3 py-2">{line.tariffAmount !== null ? line.tariffAmount.toLocaleString("fr-FR") : "Non facturé"}</td>
                <td className="px-3 py-2">
                  {line.reductions.length === 0 ? "—" : `-${line.reductionAmount.toLocaleString("fr-FR")}`}
                </td>
                <td className="px-3 py-2 font-medium">{line.netAmount !== null ? line.netAmount.toLocaleString("fr-FR") : "—"}</td>
                <td className="px-3 py-2 text-emerald-700 dark:text-emerald-300">
                  {line.paidAmount > 0 ? line.paidAmount.toLocaleString("fr-FR") : "—"}
                </td>
                <td className="px-3 py-2">
                  {line.remainingAmount !== null && line.remainingAmount > 0 ? (
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      {line.remainingAmount.toLocaleString("fr-FR")}
                    </span>
                  ) : line.surplusAmount > 0 ? (
                    <Badge variant="success">Excédent +{line.surplusAmount.toLocaleString("fr-FR")}</Badge>
                  ) : line.netAmount !== null ? (
                    <Badge variant="success">Soldé</Badge>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {installments.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Échéance</th>
                <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Type de frais</th>
                <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Date limite</th>
                <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Montant</th>
                <th className="px-3 py-2 text-left font-medium text-secondary-foreground">Payé</th>
                <th className="px-3 py-2 text-left font-medium text-secondary-foreground">État</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((i) => {
                const late = i.remainingAmount > 0 && i.dueDate < today;
                const paid = i.remainingAmount <= 0;
                return (
                  <tr key={i.id} className="border-t border-border even:bg-primary/5">
                    <td className="px-3 py-2">{i.label ?? `Échéance ${i.orderIndex + 1}`}</td>
                    <td className="px-3 py-2 text-muted-foreground">{i.feeTypeName}</td>
                    <td className="px-3 py-2">{i.dueDate.toLocaleDateString("fr-FR")}</td>
                    <td className="px-3 py-2">{i.amount.toLocaleString("fr-FR")}</td>
                    <td className="px-3 py-2">{i.paidAmount > 0 ? i.paidAmount.toLocaleString("fr-FR") : "—"}</td>
                    <td className="px-3 py-2">
                      {paid ? (
                        <Badge variant="success">Soldée</Badge>
                      ) : late ? (
                        <Badge variant="destructive">En retard</Badge>
                      ) : (
                        <Badge variant="warning">À venir</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
