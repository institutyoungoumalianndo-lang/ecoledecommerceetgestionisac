import type { PedagogicalPerformanceGroupDto } from "@isac-erp/shared";
import {
  Button,
  Card,
  CHART_CATEGORICAL_PALETTE as CATEGORICAL,
  CHART_SEQUENTIAL_ORANGE as SEQUENTIAL_ORANGE,
  ChartCard,
  DataTable,
  type DataTableColumn,
  Input,
  Label,
  Select,
  Tabs,
} from "@isac-erp/ui";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { trpc } from "../../lib/trpc";

function formatAmount(value: number): string {
  return `${Math.round(value).toLocaleString("fr-FR")} GNF`;
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)} %`;
}

const GROUP_COLUMNS: DataTableColumn<PedagogicalPerformanceGroupDto>[] = [
  { key: "label", header: "Filière / Niveau", value: (r) => r.label },
  { key: "studentCount", header: "Étudiants", value: (r) => r.studentCount },
  { key: "averageGrade", header: "Moyenne", value: (r) => r.averageGrade ?? 0, render: (r) => (r.averageGrade === null ? "—" : r.averageGrade.toFixed(2)) },
  { key: "successRate", header: "Taux de réussite", value: (r) => r.successRate ?? 0, render: (r) => formatPercent(r.successRate) },
];

function defaultStartDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 5, 1);
  return d.toISOString().slice(0, 10);
}

function defaultEndDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Rapports décisionnels (MODULE-10 §1.1/§1.2) — performance pédagogique et tendances financières/RH
 * sur période configurable. Ne duplique pas le tableau de bord d'accueil : se concentre sur le taux
 * de réussite (seul KPI décisionnel hérité de l'ancien système) et les tendances sur plage de dates
 * choisie. Écran imprimable (`window.print()`) — pas de document PDF archivé (décision du porteur du
 * projet, 2026-08-06).
 */
export function DecisionalReportsScreen() {
  const [tab, setTab] = useState("pedagogique");

  const [academicYearId, setAcademicYearId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [levelId, setLevelId] = useState("");

  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());

  const yearsQuery = trpc.academicYears.list.useQuery();
  const periodsQuery = trpc.academicPeriods.list.useQuery({ academicYearId }, { enabled: Boolean(academicYearId) });
  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();

  const pedagogicalQuery = trpc.decisionalReports.pedagogicalPerformance.useQuery(
    { academicYearId, periodId: periodId || undefined, filiereId: filiereId || undefined, levelId: levelId || undefined },
    { enabled: Boolean(academicYearId) }
  );

  const financialQuery = trpc.decisionalReports.financialTrends.useQuery(
    { startDate: new Date(startDate), endDate: new Date(endDate) },
    { enabled: Boolean(startDate && endDate) }
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Rapports décisionnels</h2>
        <Button onClick={() => window.print()}>Imprimer</Button>
      </div>

      <Tabs
        items={[
          { key: "pedagogique", label: "Performance pédagogique" },
          { key: "financier", label: "Tendances financières/RH" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      <div data-print-area className="flex flex-col gap-4 pt-2">
        {tab === "pedagogique" && (
          <div className="flex flex-col gap-4">
            <Card variant="static" className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label>Année universitaire</Label>
                <Select
                  value={academicYearId}
                  onChange={(e) => {
                    setAcademicYearId(e.target.value);
                    setPeriodId("");
                  }}
                >
                  <option value="">—</option>
                  {(yearsQuery.data ?? []).map((y) => (
                    <option key={y.id} value={y.id}>{y.label}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Semestre</Label>
                <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)} disabled={!academicYearId}>
                  <option value="">Annuel</option>
                  {(periodsQuery.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Filière</Label>
                <Select value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
                  <option value="">Toutes</option>
                  {(filieresQuery.data ?? []).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Niveau</Label>
                <Select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
                  <option value="">Tous</option>
                  {(levelsQuery.data ?? []).map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </Select>
              </div>
            </Card>

            {!academicYearId ? (
              <p className="text-sm text-muted-foreground">Sélectionnez une année universitaire.</p>
            ) : (
              <>
                <Card variant="static" className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Ensemble — {pedagogicalQuery.data?.overall.studentCount ?? 0} étudiant(s), moyenne{" "}
                    <strong>{pedagogicalQuery.data?.overall.averageGrade?.toFixed(2) ?? "—"}</strong>, taux de réussite{" "}
                    <strong>{formatPercent(pedagogicalQuery.data?.overall.successRate ?? null)}</strong>
                  </p>
                </Card>

                <ChartCard
                  title="Taux de réussite par filière"
                  empty={!pedagogicalQuery.data?.byFiliere.length}
                  accentColor={CATEGORICAL[0]!}
                >
                  <BarChart data={pedagogicalQuery.data?.byFiliere ?? []} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v) => `${Number(v).toFixed(1)} %`} />
                    <Bar dataKey="successRate" name="Taux de réussite" fill={CATEGORICAL[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>

                <DataTable
                  columns={GROUP_COLUMNS}
                  rows={pedagogicalQuery.data?.byFiliere ?? []}
                  getRowId={(r) => r.label}
                  exportFilename="performance-par-filiere"
                  emptyMessage={pedagogicalQuery.isLoading ? "Chargement…" : "Aucune donnée."}
                />

                <DataTable
                  columns={GROUP_COLUMNS}
                  rows={pedagogicalQuery.data?.byLevel ?? []}
                  getRowId={(r) => r.label}
                  exportFilename="performance-par-niveau"
                  emptyMessage={pedagogicalQuery.isLoading ? "Chargement…" : "Aucune donnée."}
                />
              </>
            )}
          </div>
        )}

        {tab === "financier" && (
          <div className="flex flex-col gap-4">
            <Card variant="static" className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label>Du</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Au</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </Card>

            <Card variant="static" className="grid grid-cols-2 gap-4 p-4 md:grid-cols-5">
              <div>
                <p className="text-xs text-muted-foreground">Recettes</p>
                <p className="text-sm font-semibold">{formatAmount(financialQuery.data?.totalRevenue ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dépenses</p>
                <p className="text-sm font-semibold">{formatAmount(financialQuery.data?.totalExpenses ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Masse salariale</p>
                <p className="text-sm font-semibold">{formatAmount(financialQuery.data?.totalPayrollCost ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coût par étudiant</p>
                <p className="text-sm font-semibold">
                  {financialQuery.data?.costPerStudent === null || financialQuery.data?.costPerStudent === undefined
                    ? "—"
                    : formatAmount(financialQuery.data.costPerStudent)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taux de recouvrement des frais</p>
                <p className="text-sm font-semibold">{formatPercent(financialQuery.data?.feeRecoveryRate ?? null)}</p>
              </div>
            </Card>

            <ChartCard title="Recettes / Dépenses / Masse salariale par mois" empty={!financialQuery.data?.points.length} accentColor={CATEGORICAL[0]!}>
              <BarChart data={financialQuery.data?.points ?? []} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v.toLocaleString("fr-FR")} />
                <Tooltip formatter={(v) => formatAmount(Number(v))} />
                <Bar dataKey="revenue" name="Recettes" fill={CATEGORICAL[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Dépenses" fill={SEQUENTIAL_ORANGE} radius={[4, 4, 0, 0]} />
                <Bar dataKey="payrollCost" name="Masse salariale" fill={CATEGORICAL[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>
          </div>
        )}
      </div>
    </div>
  );
}
