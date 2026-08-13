"use client";

import type {
  CashRegisterDto,
  CashRegisterSessionDto,
  PaymentContext,
  PaymentDashboard,
  PaymentDto,
  PaymentMethodDto,
  StudentListRow,
} from "@isac-erp/shared";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  FormField,
  Input,
  Select,
  ServerDataTable,
  StatCard,
  Tabs,
  type ServerDataTableColumn,
} from "@isac-erp/ui";
import { Coins, CreditCard, Landmark, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { trpcClient } from "../../../../lib/trpc";

type TabKey = "encaissement" | "caisse" | "historique";

function formatAmount(value: number): string {
  return `${Math.round(value).toLocaleString("fr-FR")} GNF`;
}

/**
 * Gestion des paiements côté portail Super Administrateur — réutilise directement les routeurs
 * `payments`/`cashRegisters`/`cashRegisterSessions`/`paymentMethods` déjà existants (même modèle
 * qu'`AdminStudentsPage`, aucune nouvelle route API). Reprend les 3 onglets de `PaymentsScreen.tsx`
 * (desktop) : Encaissement, Caisse, Historique.
 */
export default function AdminPaymentsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("encaissement");
  const [mySession, setMySession] = useState<CashRegisterSessionDto | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function refreshMySession() {
    try {
      const session = await trpcClient.cashRegisterSessions.getMyOpenSession.query();
      setMySession(session);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Impossible de contacter le serveur.");
    }
  }

  useEffect(() => {
    void refreshMySession();
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <h1 className="text-lg font-semibold text-window-foreground">Paiements</h1>

      {loadError && (
        <Card variant="static" className="p-4">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button variant="outline" className="mt-2" onClick={() => void refreshMySession()}>
            Réessayer
          </Button>
        </Card>
      )}

      <Card variant="static" className="p-4">
        <Tabs
          items={[
            { key: "encaissement", label: "Encaissement" },
            { key: "caisse", label: "Caisse" },
            { key: "historique", label: "Historique" },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
        />
        <div className="pt-4">
          {activeTab === "encaissement" && (
            <EncaissementTab mySession={mySession} onOpenCaisse={() => setActiveTab("caisse")} onPaid={refreshMySession} />
          )}
          {activeTab === "caisse" && <CaisseTab mySession={mySession} onSessionChange={refreshMySession} />}
          {activeTab === "historique" && <HistoriqueTab />}
        </div>
      </Card>
    </div>
  );
}

function EncaissementTab({
  mySession,
  onOpenCaisse,
  onPaid,
}: {
  mySession: CashRegisterSessionDto | null | undefined;
  onOpenCaisse: () => void;
  onPaid: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<StudentListRow[]>([]);
  const [student, setStudent] = useState<StudentListRow | null>(null);
  const [context, setContext] = useState<PaymentContext | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDto[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PaymentDto | null>(null);

  useEffect(() => {
    trpcClient.paymentMethods.list
      .query()
      .then((list) => setPaymentMethods(list.filter((m) => m.isActive)))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Impossible de charger les modes de paiement."));
  }, []);

  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      trpcClient.students.list
        .query({ search, page: 1, pageSize: 20 })
        .then((result) => setResults(result.rows))
        .catch((err: unknown) => setError(err instanceof Error ? err.message : "Échec de la recherche."));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  async function selectStudent(row: StudentListRow) {
    setStudent(row);
    setResults([]);
    setSearch("");
    setError(null);
    try {
      const ctx = await trpcClient.payments.getContext.query({ studentId: row.id });
      setContext(ctx);
      setAmounts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le dossier de l'étudiant.");
    }
  }

  function toggleLine(feeTypeId: string, remaining: number, checked: boolean) {
    setAmounts((prev) => {
      const next = { ...prev };
      if (checked) next[feeTypeId] = remaining;
      else delete next[feeTypeId];
      return next;
    });
  }

  function selectAll() {
    if (!context) return;
    const next: Record<string, number> = {};
    for (const line of context.feeSummary.lines) {
      if ((line.remainingAmount ?? 0) > 0) next[line.feeTypeId] = line.remainingAmount ?? 0;
    }
    setAmounts(next);
  }

  const total = Object.values(amounts).reduce((sum, v) => sum + v, 0);

  async function handleSubmit() {
    if (!mySession || !context || !paymentMethodId || total <= 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payment = await trpcClient.payments.create.mutate({
        studentId: context.studentId,
        cashRegisterSessionId: mySession.id,
        paymentMethodId,
        allocations: Object.entries(amounts)
          .filter(([, amount]) => amount > 0)
          .map(([feeTypeId, amount]) => ({ feeTypeId, amount })),
      });
      setReceipt(payment);
      setStudent(null);
      setContext(null);
      setAmounts({});
      onPaid();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'encaissement.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (mySession === undefined) return null;

  if (!mySession) {
    return (
      <Card variant="static" className="p-6 text-center">
        <p className="text-sm text-foreground">Aucune session de caisse ouverte.</p>
        <Button className="mt-3" onClick={onOpenCaisse}>
          Ouvrir la caisse
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!student && (
        <FormField label="Rechercher un étudiant">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Matricule, nom, prénom…" />
          {results.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 rounded-md border border-border">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                    onClick={() => void selectStudent(r)}
                  >
                    <strong>{r.matricule}</strong> — {r.lastName} {r.firstName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </FormField>
      )}

      {context && (
        <Card variant="form">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {context.studentName} ({context.studentMatricule}) — {context.className}
            </CardTitle>
            <Button variant="outline" onClick={() => { setStudent(null); setContext(null); setAmounts({}); }}>
              Changer d'étudiant
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {context.feeSummary.lines
                .filter((l) => (l.remainingAmount ?? 0) > 0)
                .map((line) => (
                  <label key={line.feeTypeId} className="flex items-center justify-between gap-3 rounded-md border border-border p-2">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={line.feeTypeId in amounts}
                        onChange={(e) => toggleLine(line.feeTypeId, line.remainingAmount ?? 0, e.target.checked)}
                      />
                      {line.feeTypeName} — reste {formatAmount(line.remainingAmount ?? 0)}
                    </span>
                    {line.feeTypeId in amounts && (
                      <Input
                        type="number"
                        className="w-32"
                        value={amounts[line.feeTypeId]}
                        max={line.remainingAmount ?? undefined}
                        min={0}
                        onChange={(e) =>
                          setAmounts((prev) => ({ ...prev, [line.feeTypeId]: Number(e.target.value) }))
                        }
                      />
                    )}
                  </label>
                ))}
              <Button type="button" variant="outline" onClick={selectAll} className="self-start">
                Sélectionner tout (paiement total)
              </Button>
            </div>

            <FormField label="Mode de paiement" required>
              <Select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
                <option value="">—</option>
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </Select>
            </FormField>

            <p className="text-sm font-semibold text-foreground">Total : {formatAmount(total)}</p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !paymentMethodId || total <= 0}
            >
              {isSubmitting ? "Encaissement…" : "Encaisser"}
            </Button>
          </CardContent>
        </Card>
      )}

      {receipt && (
        <Dialog open onClose={() => setReceipt(null)} title="Paiement enregistré">
          <div className="flex flex-col gap-2 text-sm text-foreground">
            <p>Reçu n° <strong>{receipt.receiptNumber}</strong></p>
            <p>{receipt.studentName} ({receipt.studentMatricule})</p>
            <p>Montant : <strong>{formatAmount(receipt.amount)}</strong></p>
            <p>Mode : {receipt.paymentMethodLabel}</p>
            <Button onClick={() => setReceipt(null)}>Fermer</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function CaisseTab({
  mySession,
  onSessionChange,
}: {
  mySession: CashRegisterSessionDto | null | undefined;
  onSessionChange: () => void;
}) {
  const [registers, setRegisters] = useState<CashRegisterDto[]>([]);
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalanceDeclared, setClosingBalanceDeclared] = useState(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<PaymentDashboard | null>(null);

  useEffect(() => {
    trpcClient.cashRegisters.list
      .query()
      .then((list) => setRegisters(list.filter((r) => r.isActive)))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Impossible de charger les caisses."));
    trpcClient.payments.dashboard
      .query()
      .then(setDashboard)
      .catch(() => {
        // Non bloquant — le tableau de bord reste simplement vide.
      });
  }, [mySession]);

  async function handleOpen() {
    setIsSubmitting(true);
    setError(null);
    try {
      await trpcClient.cashRegisterSessions.open.mutate({ cashRegisterId, openingBalance, notes: notes || undefined });
      onSessionChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'ouverture de la caisse.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClose() {
    if (!mySession) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await trpcClient.cashRegisterSessions.close.mutate({
        id: mySession.id,
        closingBalanceDeclared,
        notes: notes || undefined,
      });
      onSessionChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la fermeture de la caisse.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {dashboard && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Encaissé aujourd'hui" value={dashboard.totalToday} icon={CreditCard} accent="success" formatValue={formatAmount} />
          <StatCard label="Encaissé cette semaine" value={dashboard.totalWeek} icon={Landmark} color="#4A80B5" formatValue={formatAmount} />
          <StatCard label="Encaissé ce mois" value={dashboard.totalMonth} icon={Wallet} color="#469171" formatValue={formatAmount} />
          <StatCard label="Reste à recouvrer" value={dashboard.totalOutstanding} icon={Coins} accent="warning" formatValue={formatAmount} />
        </div>
      )}

      {mySession === undefined ? null : mySession ? (
        <Card variant="form">
          <CardHeader>
            <CardTitle>Session ouverte — {mySession.cashRegisterName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-foreground">
              Ouverte le {mySession.openedAt.toLocaleString("fr-FR")} — Fonds de caisse initial :{" "}
              {formatAmount(mySession.openingBalance)}
            </p>
            <p className="text-sm text-foreground">
              Encaissé sur cette session : {formatAmount(mySession.totalCollected)} ({mySession.paymentCount} paiement(s))
            </p>
            <FormField label="Solde déclaré à la fermeture" required>
              <Input type="number" min={0} value={closingBalanceDeclared} onChange={(e) => setClosingBalanceDeclared(Number(e.target.value))} />
            </FormField>
            <FormField label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button variant="destructive" onClick={() => void handleClose()} disabled={isSubmitting}>
              {isSubmitting ? "Fermeture…" : "Fermer la caisse"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card variant="form">
          <CardHeader>
            <CardTitle>Ouvrir une session de caisse</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <FormField label="Caisse" required>
              <Select value={cashRegisterId} onChange={(e) => setCashRegisterId(e.target.value)}>
                <option value="">—</option>
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Fonds de caisse initial" required>
              <Input type="number" min={0} value={openingBalance} onChange={(e) => setOpeningBalance(Number(e.target.value))} />
            </FormField>
            <FormField label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={() => void handleOpen()} disabled={isSubmitting || !cashRegisterId}>
              {isSubmitting ? "Ouverture…" : "Ouvrir la caisse"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HistoriqueTab() {
  const [rows, setRows] = useState<PaymentDto[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "VALIDE" | "ANNULE">("");
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<PaymentDto | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  function refresh() {
    setIsLoading(true);
    setLoadError(null);
    trpcClient.payments.list
      .query({ search: search || undefined, status: status || undefined, page, pageSize: 20 })
      .then((result) => {
        setRows(result.items);
        setTotal(result.total);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Impossible de charger les paiements."))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, page]);

  async function confirmCancel() {
    if (!cancelTarget || !cancelReason.trim()) return;
    setIsCancelling(true);
    try {
      await trpcClient.payments.cancel.mutate({ id: cancelTarget.id, reason: cancelReason });
      setCancelTarget(null);
      setCancelReason("");
      refresh();
    } finally {
      setIsCancelling(false);
    }
  }

  const columns: ServerDataTableColumn<PaymentDto>[] = [
    { key: "receiptNumber", header: "Reçu", value: (p) => p.receiptNumber },
    { key: "studentName", header: "Étudiant", value: (p) => `${p.studentName} (${p.studentMatricule})` },
    { key: "amount", header: "Montant", value: (p) => p.amount, render: (p) => formatAmount(p.amount) },
    { key: "paymentMethodLabel", header: "Mode", value: (p) => p.paymentMethodLabel },
    { key: "createdAt", header: "Date", value: (p) => p.createdAt.getTime(), render: (p) => p.createdAt.toLocaleDateString("fr-FR") },
    { key: "recordedByName", header: "Encaissé par", value: (p) => p.recordedByName },
    {
      key: "status",
      header: "Statut",
      value: (p) => p.status,
      render: (p) => <Badge variant={p.status === "VALIDE" ? "success" : "muted"}>{p.status === "VALIDE" ? "Validé" : "Annulé"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      <div className="flex gap-3">
        <Select value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }} className="w-48">
          <option value="">Tous les statuts</option>
          <option value="VALIDE">Validé</option>
          <option value="ANNULE">Annulé</option>
        </Select>
      </div>

      <ServerDataTable
        columns={columns}
        rows={rows}
        getRowId={(p) => p.id}
        total={total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Reçu, étudiant…"
        isLoading={isLoading}
        emptyMessage="Aucun paiement."
        columnStorageKey="portal-admin-payments-table-columns"
        rowActions={(p) =>
          p.status === "VALIDE" ? (
            <Button variant="destructive" onClick={() => setCancelTarget(p)}>
              Annuler
            </Button>
          ) : undefined
        }
      />

      {cancelTarget && (
        <Dialog open onClose={() => setCancelTarget(null)} title="Annuler ce paiement" variant="destructive">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-destructive">
              Reçu {cancelTarget.receiptNumber} — {formatAmount(cancelTarget.amount)}. Cette action est définitive.
            </p>
            <FormField label="Motif" required>
              <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Justification…" />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelTarget(null)}>Annuler</Button>
              <Button variant="destructive" onClick={() => void confirmCancel()} disabled={isCancelling || !cancelReason.trim()}>
                {isCancelling ? "Confirmation…" : "Confirmer l'annulation"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
