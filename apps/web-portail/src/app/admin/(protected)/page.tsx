"use client";

import type { HomeDashboard } from "@isac-erp/shared";
import {
  CHART_CATEGORICAL_PALETTE as CATEGORICAL,
  CHART_SEQUENTIAL_BLUE as SEQUENTIAL_BLUE,
  CHART_SEQUENTIAL_ORANGE as SEQUENTIAL_ORANGE,
  ChartCard,
  StatCard,
} from "@isac-erp/ui";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  Coins,
  CreditCard,
  GraduationCap,
  Landmark,
  Mail,
  MessageSquare,
  Presentation,
  School,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { trpcClient } from "../../../lib/trpc";

const CARD_DECORATIVE = ["#4A80B5", "#469171", "#947238", "#BA5E7D", "#7860A9"];
function decorativeColor(index: number): string {
  return CARD_DECORATIVE[index % CARD_DECORATIVE.length]!;
}

function formatAmount(value: number): string {
  return `${Math.round(value).toLocaleString("fr-FR")} GNF`;
}

/**
 * Tableau de bord général (MODULE-15 §1 décision 1) — réutilise `homeDashboard.get`, même point
 * d'entrée que `HomeDashboardScreen.tsx` côté desktop (`protectedProcedure` + scoping par
 * permission ; le Super Administrateur possède tout implicitement, voir `hasPermission`).
 */
export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<HomeDashboard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    trpcClient.homeDashboard.get
      .query()
      .then(setDashboard)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement du tableau de bord."));
  }, []);

  const cards = dashboard?.cards;
  const charts = dashboard?.charts;
  const genderData = charts?.byGender
    ? [
        { label: "Masculin", value: charts.byGender.M },
        { label: "Féminin", value: charts.byGender.F },
      ]
    : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Étudiants actifs" value={cards?.activeStudentsCount ?? null} icon={GraduationCap} color={decorativeColor(0)} />
        <StatCard label="Inscrits aujourd'hui" value={cards?.enrolledTodayCount ?? null} icon={UserPlus} color={decorativeColor(1)} />
        <StatCard
          label="Encaissé aujourd'hui"
          value={cards?.collectedTodayAmount ?? null}
          icon={CreditCard}
          accent="success"
          formatValue={formatAmount}
        />
        <StatCard
          label="Encaissé ce mois"
          value={cards?.collectedMonthAmount ?? null}
          icon={Landmark}
          accent="success"
          formatValue={formatAmount}
        />
        <StatCard label="Étudiants débiteurs" value={cards?.debtorStudentsCount ?? null} icon={AlertTriangle} accent="destructive" />
        <StatCard label="Professeurs" value={cards?.activeTeachersCount ?? null} icon={Presentation} color={decorativeColor(2)} />
        <StatCard label="Classes" value={cards?.classCount ?? null} icon={School} color={decorativeColor(3)} />
        <StatCard label="Filières" value={cards?.filiereCount ?? null} icon={BookOpen} color={decorativeColor(4)} />
        <StatCard label="Séances cette semaine" value={cards?.seancesThisWeekCount ?? null} icon={CalendarClock} color={decorativeColor(0)} />
        <StatCard
          label="Périodes d'évaluation actives"
          value={cards?.openEvaluationPeriodsCount ?? null}
          icon={ClipboardCheck}
          color={decorativeColor(1)}
        />
        <StatCard
          label="Paiements en attente"
          value={cards?.pendingPaymentsAmount ?? null}
          icon={Coins}
          accent="warning"
          formatValue={formatAmount}
        />
        <StatCard label="SMS envoyés ce mois" value={cards?.smsSentMonthCount ?? null} icon={MessageSquare} color={decorativeColor(2)} />
        <StatCard label="WhatsApp envoyés ce mois" value={cards?.whatsappSentMonthCount ?? null} icon={MessageSquare} color={decorativeColor(3)} />
        <StatCard label="Emails envoyés ce mois" value={cards?.emailsSentMonthCount ?? null} icon={Mail} color={decorativeColor(4)} />
        <StatCard label="Notifications non lues" value={cards?.notificationsCount ?? null} icon={Bell} color={decorativeColor(0)} />
        <StatCard label="Alertes importantes" value={cards?.importantAlertsCount ?? null} icon={AlertTriangle} accent="destructive" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Évolution des inscriptions" empty={!charts?.enrollmentsByMonth?.length} accentColor={SEQUENTIAL_BLUE}>
          <LineChart data={charts?.enrollmentsByMonth ?? []} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="value" name="Inscriptions" stroke={SEQUENTIAL_BLUE} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Paiements mensuels" empty={!charts?.paymentsByMonth?.length} accentColor={CATEGORICAL[2]!}>
          <BarChart data={charts?.paymentsByMonth ?? []} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v.toLocaleString("fr-FR")} />
            <Tooltip formatter={(v) => formatAmount(Number(v))} />
            <Bar dataKey="value" name="Paiements" fill={SEQUENTIAL_BLUE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Historique des encaissements (14 derniers jours)"
          empty={!charts?.collectionsHistory?.length}
          accentColor={CATEGORICAL[4]!}
        >
          <AreaChart data={charts?.collectionsHistory ?? []} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v.toLocaleString("fr-FR")} />
            <Tooltip formatter={(v) => formatAmount(Number(v))} />
            <Area type="monotone" dataKey="value" name="Encaissements" stroke={SEQUENTIAL_BLUE} fill={SEQUENTIAL_BLUE} fillOpacity={0.15} />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Évolution des recettes" empty={!charts?.revenueByMonth?.length} accentColor={SEQUENTIAL_BLUE}>
          <BarChart data={charts?.revenueByMonth ?? []} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v.toLocaleString("fr-FR")} />
            <Tooltip formatter={(v) => formatAmount(Number(v))} />
            <Bar dataKey="recettes" name="Recettes" fill={SEQUENTIAL_BLUE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Évolution des dépenses" empty={!charts?.revenueByMonth?.length} accentColor={SEQUENTIAL_ORANGE}>
          <BarChart data={charts?.revenueByMonth ?? []} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v.toLocaleString("fr-FR")} />
            <Tooltip formatter={(v) => formatAmount(Number(v))} />
            <Bar dataKey="depenses" name="Dépenses" fill={SEQUENTIAL_ORANGE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Répartition des étudiants par filière" empty={!charts?.byFiliere?.length} accentColor={CATEGORICAL[2]!}>
          <BarChart data={charts?.byFiliere ?? []} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={110} />
            <Tooltip />
            <Bar dataKey="count" name="Étudiants" radius={[0, 4, 4, 0]}>
              {(charts?.byFiliere ?? []).map((entry, index) => (
                <Cell key={entry.label} fill={CATEGORICAL[index % CATEGORICAL.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Répartition par niveau" empty={!charts?.byLevel?.length} accentColor={CATEGORICAL[5]!}>
          <BarChart data={charts?.byLevel ?? []} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" name="Étudiants" radius={[4, 4, 0, 0]}>
              {(charts?.byLevel ?? []).map((entry, index) => (
                <Cell key={entry.label} fill={CATEGORICAL[index % CATEGORICAL.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard
          title="Répartition par sexe"
          empty={genderData.every((d) => d.value === 0) || !charts?.byGender}
          accentColor={CATEGORICAL[4]!}
        >
          <PieChart margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
            <Tooltip />
            <Legend />
            <Pie data={genderData} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {genderData.map((entry, index) => (
                <Cell key={entry.label} fill={CATEGORICAL[index % CATEGORICAL.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartCard>
      </div>
    </div>
  );
}
