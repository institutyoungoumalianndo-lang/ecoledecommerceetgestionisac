import type { PaymentAllocationInput, PaymentDto, StudentListRow } from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@isac-erp/ui";
import { useMemo, useState } from "react";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { ReceiptView } from "./ReceiptView";

interface SelectableRow {
  key: string;
  feeTypeId: string;
  feeInstallmentId: string | null;
  label: string;
  remainingAmount: number;
}

/**
 * Encaissement (MODULE-04.3 §1.2/§1.3/§4) : recherche étudiant → fiche +
 * coût de scolarité (Module 4.2 pour le dû, ce module pour le payé) →
 * sélection de ce qui est réglé (total, partiel, échéance(s), frais
 * spécifique) → reçu imprimable. Bloqué sans session de caisse ouverte.
 */
export function PaymentEncaissementScreen() {
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentListRow | null>(null);
  const [selected, setSelected] = useState<Map<string, number>>(new Map());
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [receipt, setReceipt] = useState<PaymentDto | null>(null);

  const utils = trpc.useUtils();
  const mySessionQuery = trpc.cashRegisterSessions.getMyOpenSession.useQuery();
  const methodsQuery = trpc.paymentMethods.list.useQuery();
  const searchQuery = trpc.students.list.useQuery(
    { search, includeArchived: false, sortBy: "lastName", sortDirection: "asc", page: 1, pageSize: 10 },
    { enabled: search.trim().length > 0 && !selectedStudent }
  );
  const contextQuery = trpc.payments.getContext.useQuery(
    { studentId: selectedStudent?.id ?? "" },
    { enabled: Boolean(selectedStudent) }
  );

  const context = contextQuery.data;
  const mySession = mySessionQuery.data;

  const rows: SelectableRow[] = useMemo(() => {
    if (!context) return [];
    const result: SelectableRow[] = [];
    for (const line of context.feeSummary.lines) {
      if (line.tariffAmount === null) continue;
      if (line.installments.length > 0) {
        for (const installment of line.installments) {
          if (installment.remainingAmount <= 0) continue;
          result.push({
            key: `${line.feeTypeId}:${installment.id}`,
            feeTypeId: line.feeTypeId,
            feeInstallmentId: installment.id,
            label: `${line.feeTypeName} — ${installment.label ?? `Échéance ${installment.orderIndex}`}`,
            remainingAmount: installment.remainingAmount,
          });
        }
      } else if ((line.remainingAmount ?? 0) > 0) {
        result.push({
          key: `${line.feeTypeId}:`,
          feeTypeId: line.feeTypeId,
          feeInstallmentId: null,
          label: line.feeTypeName,
          remainingAmount: line.remainingAmount ?? 0,
        });
      }
    }
    return result;
  }, [context]);

  const create = trpc.payments.create.useMutation({
    onSuccess: (payment) => {
      void utils.feeSummary.getForStudent.invalidate();
      void utils.payments.list.invalidate();
      void utils.cashRegisterSessions.getMyOpenSession.invalidate();
      void utils.payments.dashboard.invalidate();
      setReceipt(payment);
      setSelected(new Map());
    },
  });

  function resetStudent() {
    setSelectedStudent(null);
    setSelected(new Map());
    setSearch("");
  }

  function toggleAll() {
    if (selected.size === rows.length && rows.length > 0) {
      setSelected(new Map());
    } else {
      setSelected(new Map(rows.map((r) => [r.key, r.remainingAmount])));
    }
  }

  function toggleRow(row: SelectableRow) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(row.key)) next.delete(row.key);
      else next.set(row.key, row.remainingAmount);
      return next;
    });
  }

  function setAmount(row: SelectableRow, amount: number) {
    setSelected((prev) => new Map(prev).set(row.key, amount));
  }

  const total = [...selected.values()].reduce((sum, a) => sum + a, 0);
  const canSubmit = Boolean(mySession) && Boolean(paymentMethodId) && total > 0 && !create.isPending;

  function submit() {
    if (!selectedStudent || !mySession) return;
    const allocations: PaymentAllocationInput[] = rows
      .filter((r) => selected.has(r.key) && (selected.get(r.key) ?? 0) > 0)
      .map((r) => ({ feeTypeId: r.feeTypeId, feeInstallmentId: r.feeInstallmentId, amount: selected.get(r.key)! }));
    create.mutate({
      studentId: selectedStudent.id,
      cashRegisterSessionId: mySession.id,
      paymentMethodId,
      allocations,
    });
  }

  if (!mySession) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Aucune session de caisse ouverte. Ouvrez votre caisse depuis l'onglet « Caisse » avant d'encaisser.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!selectedStudent ? (
        <Card>
          <CardHeader>
            <CardTitle>Rechercher un étudiant</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Matricule, nom, prénom ou téléphone"
            />
            {searchQuery.data && searchQuery.data.rows.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-md border border-border p-1">
                {searchQuery.data.rows.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                      onClick={() => setSelectedStudent(s)}
                    >
                      {s.matricule} — {s.lastName} {s.firstName}
                      {s.phonePrimary ? ` — ${s.phonePrimary}` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                {context?.studentPhotoPath && (
                  <img
                    src={resolveUploadUrl(context.studentPhotoPath)!}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold">
                    {selectedStudent.lastName} {selectedStudent.firstName}{" "}
                    <span className="font-normal text-muted-foreground">— {selectedStudent.matricule}</span>
                  </p>
                  {context && (
                    <p className="text-sm text-muted-foreground">
                      {context.filiereName} / {context.levelLabel} / {context.className} — {context.academicYearLabel}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={resetStudent}>
                Changer d'étudiant
              </Button>
            </CardContent>
          </Card>

          {context && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Total dû</p>
                <p className="text-lg font-semibold">{context.feeSummary.totalNet.toLocaleString("fr-FR")}</p>
              </div>
              <div className="rounded-lg border border-l-4 border-emerald-500 bg-emerald-50 p-3 dark:bg-emerald-950/30">
                <p className="text-xs text-muted-foreground">Déjà payé</p>
                <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                  {context.feeSummary.totalPaid.toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="rounded-lg border border-l-4 border-amber-500 bg-amber-50 p-3 dark:bg-amber-950/30">
                <p className="text-xs text-muted-foreground">Solde restant</p>
                <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                  {context.feeSummary.totalRemaining.toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Montant sélectionné</p>
                <p className="text-lg font-semibold">{total.toLocaleString("fr-FR")}</p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Frais à régler</CardTitle>
              <Button variant="outline" onClick={toggleAll} disabled={rows.length === 0}>
                {selected.size === rows.length && rows.length > 0 ? "Tout désélectionner" : "Paiement total"}
              </Button>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <Badge variant="success">Aucun solde restant pour cette année.</Badge>
              ) : (
                <div className="flex flex-col gap-2">
                  {rows.map((row) => {
                    const checked = selected.has(row.key);
                    return (
                      <div key={row.key} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 even:bg-primary/5">
                        <input type="checkbox" checked={checked} onChange={() => toggleRow(row)} />
                        <span className="flex-1 text-sm">{row.label}</span>
                        <span className="text-xs text-muted-foreground">Reste dû : {row.remainingAmount.toLocaleString("fr-FR")}</span>
                        <Input
                          type="number"
                          min={0}
                          max={row.remainingAmount}
                          className="w-32"
                          disabled={!checked}
                          value={checked ? String(selected.get(row.key)) : ""}
                          onChange={(e) => setAmount(row, Number(e.target.value))}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Mode de paiement</Label>
                  <Select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
                    <option value="">—</option>
                    {(methodsQuery.data ?? [])
                      .filter((m) => m.isActive)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                  </Select>
                </div>
              </div>
              {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
              <div className="flex justify-end">
                <Button disabled={!canSubmit} onClick={submit}>
                  {create.isPending ? "Encaissement…" : `Encaisser ${total.toLocaleString("fr-FR")}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {receipt && (
        <ReceiptView
          payment={receipt}
          onClose={() => {
            setReceipt(null);
            resetStudent();
          }}
        />
      )}
    </div>
  );
}
