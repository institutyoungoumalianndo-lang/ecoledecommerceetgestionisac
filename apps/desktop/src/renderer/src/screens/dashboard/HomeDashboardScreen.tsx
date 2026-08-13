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
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { trpc } from "../../lib/trpc";

// Cartes statistiques "neutres" (aucun statut à porter) : fond plein, une teinte par carte, cyclée
// sur la même famille de teintes que les graphiques. Deuxième adoucissement le 2026-07-30 (retour
// du porteur du projet, sur capture d'écran : le premier essai du même jour restait trop marqué) —
// teintes nettement désaturées ("poussiéreuses"/mates plutôt que franches), tout en gardant un
// contraste suffisant pour le texte blanc superposé (valeur ≥ 3.5:1, libellé text-white/80 ≥ 3:1,
// vérifiés). Orange exclu (trop proche du jeton --warning sémantique utilisé plus bas pour
// "Paiements en attente").
const CARD_DECORATIVE = ["#4A80B5", "#469171", "#947238", "#BA5E7D", "#7860A9"];
function decorativeColor(index: number): string {
  return CARD_DECORATIVE[index % CARD_DECORATIVE.length]!;
}

function formatAmount(value: number): string {
  return `${Math.round(value).toLocaleString("fr-FR")} GNF`;
}

/** Tableau de bord d'accueil unifié — refonte UI/UX Phase 3 (2026-07-30). ChartCard extrait vers
 * `@isac-erp/ui` le 2026-08-06 (Module 10) pour être réutilisé par les nouveaux écrans de rapports. */
export function HomeDashboardScreen() {
  const query = trpc.homeDashboard.get.useQuery();
  const cards = query.data?.cards;
  const charts = query.data?.charts;

  const genderData = charts?.byGender
    ? [
        { label: "Masculin", value: charts.byGender.M },
        { label: "Féminin", value: charts.byGender.F },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

      {!query.data && !query.isLoading && (
        <p className="text-sm text-muted-foreground">Aucune donnée disponible pour votre profil.</p>
      )}
    </div>
  );
}
