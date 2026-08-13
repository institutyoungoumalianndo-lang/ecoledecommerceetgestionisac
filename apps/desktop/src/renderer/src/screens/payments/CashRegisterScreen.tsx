import type { CashRegisterSessionDto } from "@isac-erp/shared";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  StatRingCard as StatCard,
  type DataTableColumn,
} from "@isac-erp/ui";
import { useState } from "react";
import { formatTimestamp } from "../../lib/formatTimestamp";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { CloseCashSessionDialog } from "./CloseCashSessionDialog";
import { OpenCashSessionDialog } from "./OpenCashSessionDialog";

/** Caisse (MODULE-04.3 §1.6/§4) : ouverture/fermeture, tableau de bord temps réel, historique des sessions. */
export function CashRegisterScreen() {
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closingSession, setClosingSession] = useState<CashRegisterSessionDto | null>(null);
  const canOpen = useHasPermission("CAISSE:CREATION");
  const canClose = useHasPermission("CAISSE:VALIDATION");

  const mySessionQuery = trpc.cashRegisterSessions.getMyOpenSession.useQuery();
  const dashboardQuery = trpc.payments.dashboard.useQuery();
  const historyQuery = trpc.cashRegisterSessions.list.useQuery({});

  const mySession = mySessionQuery.data;
  const dashboard = dashboardQuery.data;

  const columns: DataTableColumn<CashRegisterSessionDto>[] = [
    { key: "cashRegisterName", header: "Caisse", value: (s) => s.cashRegisterName },
    { key: "openedByName", header: "Ouverte par", value: (s) => s.openedByName },
    { key: "openedAt", header: "Ouverture", value: (s) => formatTimestamp(s.openedAt) },
    { key: "closedAt", header: "Fermeture", value: (s) => (s.closedAt ? formatTimestamp(s.closedAt) : "—") },
    { key: "totalCollected", header: "Total encaissé", value: (s) => s.totalCollected, render: (s) => s.totalCollected.toLocaleString("fr-FR") },
    { key: "paymentCount", header: "Opérations", value: (s) => s.paymentCount },
    {
      key: "variance",
      header: "Écart",
      value: (s) => s.variance ?? 0,
      render: (s) =>
        s.status === "OUVERTE" ? (
          <Badge variant="muted">En cours</Badge>
        ) : s.variance === 0 ? (
          <Badge variant="success">0</Badge>
        ) : (
          <Badge variant="destructive">{(s.variance ?? 0) > 0 ? "+" : ""}{s.variance?.toLocaleString("fr-FR")}</Badge>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card variant="static">
        <CardHeader>
          <CardTitle>Ma session de caisse</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          {mySession ? (
            <div>
              <p className="text-sm">
                <strong>{mySession.cashRegisterName}</strong> ouverte à {formatTimestamp(mySession.openedAt)} — solde initial{" "}
                {mySession.openingBalance.toLocaleString("fr-FR")}
              </p>
              <p className="text-sm text-muted-foreground">
                {mySession.paymentCount} paiement(s), {mySession.totalCollected.toLocaleString("fr-FR")} encaissé.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune session ouverte — l'encaissement est bloqué tant qu'une caisse n'est pas ouverte.</p>
          )}
          {!mySession && canOpen && <Button onClick={() => setOpenDialogOpen(true)}>Ouvrir une caisse</Button>}
          {mySession && canClose && (
            <Button variant="destructive" onClick={() => setClosingSession(mySession)}>
              Fermer la caisse
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Encaissé aujourd'hui" value={dashboard ? dashboard.totalToday.toLocaleString("fr-FR") : undefined} color="blue" />
        <StatCard label="Encaissé cette semaine" value={dashboard ? dashboard.totalWeek.toLocaleString("fr-FR") : undefined} color="violet" />
        <StatCard label="Encaissé ce mois" value={dashboard ? dashboard.totalMonth.toLocaleString("fr-FR") : undefined} color="emerald" />
        <StatCard label="Soldes restants (année active)" value={dashboard ? dashboard.totalOutstanding.toLocaleString("fr-FR") : undefined} color="amber" />
      </div>

      <Card variant="static">
        <CardHeader>
          <CardTitle>Répartition par mode de paiement (aujourd'hui)</CardTitle>
        </CardHeader>
        <CardContent>
          {!dashboard || dashboard.byPaymentMethod.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paiement aujourd'hui.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {dashboard.byPaymentMethod.map((m) => (
                <li key={m.paymentMethodId} className="flex items-center justify-between rounded-md px-2 py-1 even:bg-muted/50">
                  <span>{m.paymentMethodLabel}</span>
                  <span className="font-medium">
                    {m.total.toLocaleString("fr-FR")} ({m.count})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Historique des sessions</h3>
        <DataTable
          columns={columns}
          rows={historyQuery.data ?? []}
          getRowId={(s) => s.id}
          exportFilename="sessions-caisse"
          emptyMessage={historyQuery.isLoading ? "Chargement…" : "Aucune session enregistrée."}
        />
      </div>

      {openDialogOpen && <OpenCashSessionDialog onClose={() => setOpenDialogOpen(false)} />}
      {closingSession && <CloseCashSessionDialog session={closingSession} onClose={() => setClosingSession(null)} />}
    </div>
  );
}
