import type { AuditLogEntry } from "@isac-erp/shared";
import { Badge, DataTable, type DataTableColumn, Input, Select } from "@isac-erp/ui";
import { useState } from "react";
import { formatTimestamp } from "../../lib/formatTimestamp";
import { trpc } from "../../lib/trpc";

const RESULT_OPTIONS = [
  { value: "", label: "Tous résultats" },
  { value: "SUCCES", label: "Succès" },
  { value: "ECHEC", label: "Échec" },
] as const;

/**
 * Filtres envoyés au serveur (module/résultat/dates) ; recherche, tri et
 * pagination fine restent gérés par <DataTable> sur le lot ramené (jusqu'à
 * 200 lignes — cohérent avec l'échelle d'un seul campus, voir
 * docs/RAPPORT_ANALYSE_ISAC_ERP.md sur les volumes réels attendus).
 */
export function AuditLogScreen() {
  const [module, setModule] = useState("");
  const [result, setResult] = useState<(typeof RESULT_OPTIONS)[number]["value"]>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const query = trpc.auditLog.list.useQuery({
    module: module || undefined,
    result: result || undefined,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    page: 1,
    pageSize: 200,
  });

  const columns: DataTableColumn<AuditLogEntry>[] = [
    { key: "createdAt", header: "Date et heure", value: (e) => formatTimestamp(e.createdAt) },
    {
      key: "user",
      header: "Utilisateur",
      value: (e) => e.userDisplayName ?? e.usernameInput ?? "—",
    },
    { key: "action", header: "Action", value: (e) => e.action },
    { key: "module", header: "Module", value: (e) => e.module },
    {
      key: "result",
      header: "Résultat",
      value: (e) => e.result,
      render: (e) => (
        <Badge variant={e.result === "SUCCES" ? "success" : "destructive"}>{e.result}</Badge>
      ),
    },
    { key: "ip", header: "Adresse IP", value: (e) => e.ipAddress ?? "—" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Journal d'audit</h1>

      <DataTable
        columns={columns}
        rows={query.data?.entries ?? []}
        getRowId={(e) => e.id}
        exportFilename="journal-audit"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune entrée."}
        filters={
          <>
            <Input
              placeholder="Module"
              value={module}
              onChange={(e) => setModule(e.target.value)}
              className="w-32"
            />
            <Select value={result} onChange={(e) => setResult(e.target.value as typeof result)}>
              {RESULT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </>
        }
      />
    </div>
  );
}
