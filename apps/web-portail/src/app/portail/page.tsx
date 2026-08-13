"use client";

import type {
  BulletinAnnuelDto,
  BulletinPeriodeDto,
  PortalGuardianChild,
  PortalSessionInfo,
  PortalStudentFeeSummary,
  PortalStudentNote,
  SeanceDto,
} from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, CardHeader, DataTable, type DataTableColumn, Label, Select, Tabs } from "@isac-erp/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trpcClient } from "../../lib/trpc";
import { clearPortalSessionToken, getPortalSessionToken } from "../../lib/session";

const PRINCIPAL_TYPE_LABELS = { STUDENT: "Étudiant", GUARDIAN: "Tuteur/Parent", TEACHER: "Enseignant" } as const;

const RELATIONSHIP_LABELS: Record<string, string> = {
  PERE: "Père",
  MERE: "Mère",
  TUTEUR_LEGAL: "Tuteur légal",
  FRERE: "Frère",
  SOEUR: "Sœur",
  ONCLE: "Oncle",
  TANTE: "Tante",
  GRAND_PARENT: "Grand-parent",
  AUTRE: "Autre",
};

const SEANCE_STATUS_LABELS = {
  PROGRAMMEE: "Programmée",
  EFFECTUEE: "Effectuée",
  REPORTEE: "Reportée",
  ANNULEE: "Annulée",
  REMPLACEE: "Remplacée",
} as const;

const SEANCE_STATUS_VARIANTS = {
  PROGRAMMEE: "default",
  EFFECTUEE: "success",
  REPORTEE: "warning",
  ANNULEE: "destructive",
  REMPLACEE: "warning",
} as const;

const PAYMENT_STATUS_LABELS = {
  TOTALEMENT_PAYE: "Totalement payé",
  PARTIELLEMENT_PAYE: "Partiellement payé",
  NON_PAYE: "Non payé",
} as const;

const PAYMENT_STATUS_VARIANTS = {
  TOTALEMENT_PAYE: "success",
  PARTIELLEMENT_PAYE: "warning",
  NON_PAYE: "destructive",
} as const;

function formatMontant(value: number): string {
  return `${Math.round(value).toLocaleString("fr-FR")} GNF`;
}

function formatNote(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

function seanceColumns(): DataTableColumn<SeanceDto>[] {
  return [
    {
      key: "sessionDate",
      header: "Date",
      value: (s) => s.sessionDate.getTime(),
      render: (s) => s.sessionDate.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" }),
    },
    { key: "startTime", header: "Heure", value: (s) => `${s.startTime} – ${s.endTime}` },
    { key: "subjectName", header: "Matière", value: (s) => s.subjectName },
    { key: "teacherName", header: "Enseignant", value: (s) => s.teacherName },
    { key: "roomLabel", header: "Salle", value: (s) => s.roomLabel ?? "—" },
    {
      key: "status",
      header: "Statut",
      value: (s) => SEANCE_STATUS_LABELS[s.status],
      render: (s) => <Badge variant={SEANCE_STATUS_VARIANTS[s.status]}>{SEANCE_STATUS_LABELS[s.status]}</Badge>,
    },
  ];
}

/**
 * Accueil du portail — phase 1 (identité) + phase 2 (MODULE-15 §1 décision 2/§4 phase 2, lecture seule
 * étudiant) + phase 3 (§4 phase 3, lecture seule tuteur/parent et enseignant). Chaque type de principal
 * a son propre tableau de bord de lecture, toujours scopé côté serveur au `credentialId` de la session.
 */
export default function PortailPage() {
  const router = useRouter();
  const [info, setInfo] = useState<PortalSessionInfo | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!getPortalSessionToken()) {
      router.replace("/connexion");
      return;
    }
    trpcClient.portalAuth.me
      .query()
      .then((result) => {
        if (result.mustChangePassword) {
          router.replace("/changer-mot-de-passe");
          return;
        }
        setInfo(result);
      })
      .catch(() => {
        clearPortalSessionToken();
        router.replace("/connexion");
      });
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await trpcClient.portalAuth.logout.mutate();
    } catch {
      // Le jeton est de toute façon effacé côté client — une erreur réseau ici ne doit pas bloquer.
    } finally {
      clearPortalSessionToken();
      router.replace("/connexion");
    }
  }

  if (!info) return null;

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Bienvenue, {info.displayName}</h1>
            <p className="text-sm text-window-foreground/70">{PRINCIPAL_TYPE_LABELS[info.principalType]}</p>
          </div>
          <Button variant="outline" onClick={() => void handleLogout()} disabled={loggingOut}>
            {loggingOut ? "Déconnexion…" : "Se déconnecter"}
          </Button>
        </CardHeader>
      </Card>

      {info.principalType === "STUDENT" && <StudentDashboard />}
      {info.principalType === "GUARDIAN" && <GuardianDashboard />}
      {info.principalType === "TEACHER" && <TeacherDashboard />}
    </div>
  );
}

type TabKey = "emploi-du-temps" | "notes" | "bulletins" | "paiement";

function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("emploi-du-temps");

  return (
    <Card variant="static">
      <CardContent className="flex flex-col gap-4 pt-4">
        <Tabs
          items={[
            { key: "emploi-du-temps", label: "Emploi du temps" },
            { key: "notes", label: "Notes" },
            { key: "bulletins", label: "Bulletins" },
            { key: "paiement", label: "Paiement" },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
        />
        {activeTab === "emploi-du-temps" && <ScheduleTab />}
        {activeTab === "notes" && <NotesTab />}
        {activeTab === "bulletins" && <BulletinsTab />}
        {activeTab === "paiement" && <FeeSummaryTab />}
      </CardContent>
    </Card>
  );
}

function ScheduleTab() {
  const [seances, setSeances] = useState<SeanceDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);
    trpcClient.portalStudent.schedule
      .query({ startDate, endDate })
      .then(setSeances)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement de l'emploi du temps."));
  }, []);

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;

  return (
    <DataTable
      columns={seanceColumns()}
      rows={seances ?? []}
      getRowId={(s) => s.id}
      emptyMessage={seances === null ? "Chargement…" : "Aucune séance dans les 14 prochains jours."}
    />
  );
}

function NotesTab() {
  const [notes, setNotes] = useState<PortalStudentNote[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    trpcClient.portalStudent.notes
      .query()
      .then(setNotes)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement des notes."));
  }, []);

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;

  const columns: DataTableColumn<PortalStudentNote>[] = [
    { key: "subjectName", header: "Matière", value: (n) => n.subjectName },
    { key: "academicPeriodLabel", header: "Période", value: (n) => n.academicPeriodLabel },
    { key: "coefficient", header: "Coeff.", value: (n) => n.coefficient },
    { key: "noteOrale", header: "Oral", value: (n) => n.noteOrale ?? -1, render: (n) => formatNote(n.noteOrale) },
    { key: "noteEcrite", header: "Écrit", value: (n) => n.noteEcrite ?? -1, render: (n) => formatNote(n.noteEcrite) },
    {
      key: "noteComposition",
      header: "Composition",
      value: (n) => n.noteComposition ?? -1,
      render: (n) => formatNote(n.noteComposition),
    },
    {
      key: "noteFinale",
      header: "Finale",
      value: (n) => n.noteFinale ?? -1,
      render: (n) => <span className="font-semibold">{formatNote(n.noteFinale)}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={notes ?? []}
      getRowId={(n) => n.id}
      emptyMessage={notes === null ? "Chargement…" : "Aucune note enregistrée."}
    />
  );
}

function BulletinsTab() {
  const [bulletins, setBulletins] = useState<{ periode: BulletinPeriodeDto[]; annuel: BulletinAnnuelDto[] } | null>(
    null
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    trpcClient.portalStudent.bulletins
      .query()
      .then(setBulletins)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement des bulletins."));
  }, []);

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;

  const periodeColumns: DataTableColumn<BulletinPeriodeDto>[] = [
    { key: "academicPeriodLabel", header: "Période", value: (b) => b.academicPeriodLabel },
    { key: "moyenne", header: "Moyenne", value: (b) => b.moyenne ?? -1, render: (b) => formatNote(b.moyenne) },
    { key: "rang", header: "Rang", value: (b) => b.rang ?? -1, render: (b) => (b.rang ? `${b.rang}/${b.effectifClasse}` : "—") },
    { key: "mention", header: "Mention", value: (b) => b.mention },
    { key: "regularite", header: "Régularité", value: (b) => b.regularite },
  ];

  const annuelColumns: DataTableColumn<BulletinAnnuelDto>[] = [
    { key: "academicYearLabel", header: "Année", value: (b) => b.academicYearLabel },
    {
      key: "moyenneAnnuelle",
      header: "Moyenne annuelle",
      value: (b) => b.moyenneAnnuelle ?? -1,
      render: (b) => formatNote(b.moyenneAnnuelle),
    },
    { key: "rang", header: "Rang", value: (b) => b.rang ?? -1, render: (b) => (b.rang ? `${b.rang}/${b.effectif}` : "—") },
    { key: "mention", header: "Mention", value: (b) => b.mention },
    { key: "decision", header: "Décision", value: (b) => b.decision },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Bulletins de période</h2>
        <DataTable
          columns={periodeColumns}
          rows={bulletins?.periode ?? []}
          getRowId={(b) => b.id}
          emptyMessage={bulletins === null ? "Chargement…" : "Aucun bulletin de période publié."}
        />
      </div>
      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Bulletins annuels</h2>
        <DataTable
          columns={annuelColumns}
          rows={bulletins?.annuel ?? []}
          getRowId={(b) => b.id}
          emptyMessage={bulletins === null ? "Chargement…" : "Aucun bulletin annuel publié."}
        />
      </div>
    </div>
  );
}

function FeeSummaryTab() {
  const [summary, setSummary] = useState<PortalStudentFeeSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    trpcClient.portalStudent.feeSummary
      .query()
      .then(setSummary)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement du statut de paiement."));
  }, []);

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;
  if (!summary) return <p className="text-sm text-foreground">Chargement…</p>;

  const columns: DataTableColumn<PortalStudentFeeSummary["lines"][number]>[] = [
    { key: "feeTypeName", header: "Type de frais", value: (l) => l.feeTypeName },
    { key: "netAmount", header: "Montant net", value: (l) => l.netAmount ?? 0, render: (l) => formatMontant(l.netAmount ?? 0) },
    { key: "paidAmount", header: "Payé", value: (l) => l.paidAmount, render: (l) => formatMontant(l.paidAmount) },
    {
      key: "remainingAmount",
      header: "Reste à payer",
      value: (l) => l.remainingAmount ?? 0,
      render: (l) => formatMontant(l.remainingAmount ?? 0),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={PAYMENT_STATUS_VARIANTS[summary.paymentStatus]}>
          {PAYMENT_STATUS_LABELS[summary.paymentStatus]}
        </Badge>
        <span className="text-sm text-foreground">
          Total dû : <strong>{formatMontant(summary.totalNet)}</strong> — Payé :{" "}
          <strong>{formatMontant(summary.totalPaid)}</strong> — Reste :{" "}
          <strong>{formatMontant(summary.totalRemaining)}</strong>
        </span>
      </div>
      <DataTable
        columns={columns}
        rows={summary.lines}
        getRowId={(l) => l.feeTypeId}
        emptyMessage="Aucun frais applicable."
      />
    </div>
  );
}

/** Tableau de bord tuteur/parent (MODULE-15 §4 phase 3) — sélecteur d'enfant puis mêmes 4 lectures que
 * l'étudiant, scopées côté serveur à l'enfant choisi (vérifié contre les enfants réels du tuteur). */
function GuardianDashboard() {
  const [children, setChildren] = useState<PortalGuardianChild[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("emploi-du-temps");

  useEffect(() => {
    trpcClient.portalGuardian.children
      .query()
      .then((result) => {
        setChildren(result);
        if (result.length > 0) setSelectedChildId(result[0]!.id);
      })
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement des enfants."));
  }, []);

  if (loadError) {
    return (
      <Card variant="static">
        <CardContent className="pt-4">
          <p className="text-sm text-destructive">{loadError}</p>
        </CardContent>
      </Card>
    );
  }

  if (children === null) {
    return (
      <Card variant="static">
        <CardContent className="pt-4">
          <p className="text-sm text-window-foreground/70">Chargement…</p>
        </CardContent>
      </Card>
    );
  }

  if (children.length === 0) {
    return (
      <Card variant="static">
        <CardContent className="pt-4">
          <p className="text-sm text-window-foreground/70">Aucun enfant rattaché à ce compte.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="static">
      <CardContent className="flex flex-col gap-4 pt-4">
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <Label>Enfant</Label>
          <Select value={selectedChildId} onChange={(e) => setSelectedChildId(e.target.value)}>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} — {RELATIONSHIP_LABELS[c.relationship] ?? c.relationship}
                {c.className ? ` — ${c.className}` : ""}
              </option>
            ))}
          </Select>
        </div>

        <Tabs
          items={[
            { key: "emploi-du-temps", label: "Emploi du temps" },
            { key: "notes", label: "Notes" },
            { key: "bulletins", label: "Bulletins" },
            { key: "paiement", label: "Paiement" },
          ]}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as TabKey)}
        />
        {activeTab === "emploi-du-temps" && <GuardianScheduleTab childId={selectedChildId} />}
        {activeTab === "notes" && <GuardianNotesTab childId={selectedChildId} />}
        {activeTab === "bulletins" && <GuardianBulletinsTab childId={selectedChildId} />}
        {activeTab === "paiement" && <GuardianFeeSummaryTab childId={selectedChildId} />}
      </CardContent>
    </Card>
  );
}

function GuardianScheduleTab({ childId }: { childId: string }) {
  const [seances, setSeances] = useState<SeanceDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setSeances(null);
    setLoadError(null);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);
    trpcClient.portalGuardian.schedule
      .query({ studentId: childId, startDate, endDate })
      .then(setSeances)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement de l'emploi du temps."));
  }, [childId]);

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;

  return (
    <DataTable
      columns={seanceColumns()}
      rows={seances ?? []}
      getRowId={(s) => s.id}
      emptyMessage={seances === null ? "Chargement…" : "Aucune séance dans les 14 prochains jours."}
    />
  );
}

function GuardianNotesTab({ childId }: { childId: string }) {
  const [notes, setNotes] = useState<PortalStudentNote[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setNotes(null);
    setLoadError(null);
    trpcClient.portalGuardian.notes
      .query({ studentId: childId })
      .then(setNotes)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement des notes."));
  }, [childId]);

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;

  const columns: DataTableColumn<PortalStudentNote>[] = [
    { key: "subjectName", header: "Matière", value: (n) => n.subjectName },
    { key: "academicPeriodLabel", header: "Période", value: (n) => n.academicPeriodLabel },
    { key: "coefficient", header: "Coeff.", value: (n) => n.coefficient },
    { key: "noteOrale", header: "Oral", value: (n) => n.noteOrale ?? -1, render: (n) => formatNote(n.noteOrale) },
    { key: "noteEcrite", header: "Écrit", value: (n) => n.noteEcrite ?? -1, render: (n) => formatNote(n.noteEcrite) },
    {
      key: "noteComposition",
      header: "Composition",
      value: (n) => n.noteComposition ?? -1,
      render: (n) => formatNote(n.noteComposition),
    },
    {
      key: "noteFinale",
      header: "Finale",
      value: (n) => n.noteFinale ?? -1,
      render: (n) => <span className="font-semibold">{formatNote(n.noteFinale)}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={notes ?? []}
      getRowId={(n) => n.id}
      emptyMessage={notes === null ? "Chargement…" : "Aucune note enregistrée."}
    />
  );
}

function GuardianBulletinsTab({ childId }: { childId: string }) {
  const [bulletins, setBulletins] = useState<{ periode: BulletinPeriodeDto[]; annuel: BulletinAnnuelDto[] } | null>(
    null
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setBulletins(null);
    setLoadError(null);
    trpcClient.portalGuardian.bulletins
      .query({ studentId: childId })
      .then(setBulletins)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement des bulletins."));
  }, [childId]);

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;

  const periodeColumns: DataTableColumn<BulletinPeriodeDto>[] = [
    { key: "academicPeriodLabel", header: "Période", value: (b) => b.academicPeriodLabel },
    { key: "moyenne", header: "Moyenne", value: (b) => b.moyenne ?? -1, render: (b) => formatNote(b.moyenne) },
    { key: "rang", header: "Rang", value: (b) => b.rang ?? -1, render: (b) => (b.rang ? `${b.rang}/${b.effectifClasse}` : "—") },
    { key: "mention", header: "Mention", value: (b) => b.mention },
    { key: "regularite", header: "Régularité", value: (b) => b.regularite },
  ];

  const annuelColumns: DataTableColumn<BulletinAnnuelDto>[] = [
    { key: "academicYearLabel", header: "Année", value: (b) => b.academicYearLabel },
    {
      key: "moyenneAnnuelle",
      header: "Moyenne annuelle",
      value: (b) => b.moyenneAnnuelle ?? -1,
      render: (b) => formatNote(b.moyenneAnnuelle),
    },
    { key: "rang", header: "Rang", value: (b) => b.rang ?? -1, render: (b) => (b.rang ? `${b.rang}/${b.effectif}` : "—") },
    { key: "mention", header: "Mention", value: (b) => b.mention },
    { key: "decision", header: "Décision", value: (b) => b.decision },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Bulletins de période</h2>
        <DataTable
          columns={periodeColumns}
          rows={bulletins?.periode ?? []}
          getRowId={(b) => b.id}
          emptyMessage={bulletins === null ? "Chargement…" : "Aucun bulletin de période publié."}
        />
      </div>
      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Bulletins annuels</h2>
        <DataTable
          columns={annuelColumns}
          rows={bulletins?.annuel ?? []}
          getRowId={(b) => b.id}
          emptyMessage={bulletins === null ? "Chargement…" : "Aucun bulletin annuel publié."}
        />
      </div>
    </div>
  );
}

function GuardianFeeSummaryTab({ childId }: { childId: string }) {
  const [summary, setSummary] = useState<PortalStudentFeeSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setSummary(null);
    setLoadError(null);
    trpcClient.portalGuardian.feeSummary
      .query({ studentId: childId })
      .then(setSummary)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement du statut de paiement."));
  }, [childId]);

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;
  if (!summary) return <p className="text-sm text-foreground">Chargement…</p>;

  const columns: DataTableColumn<PortalStudentFeeSummary["lines"][number]>[] = [
    { key: "feeTypeName", header: "Type de frais", value: (l) => l.feeTypeName },
    { key: "netAmount", header: "Montant net", value: (l) => l.netAmount ?? 0, render: (l) => formatMontant(l.netAmount ?? 0) },
    { key: "paidAmount", header: "Payé", value: (l) => l.paidAmount, render: (l) => formatMontant(l.paidAmount) },
    {
      key: "remainingAmount",
      header: "Reste à payer",
      value: (l) => l.remainingAmount ?? 0,
      render: (l) => formatMontant(l.remainingAmount ?? 0),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={PAYMENT_STATUS_VARIANTS[summary.paymentStatus]}>
          {PAYMENT_STATUS_LABELS[summary.paymentStatus]}
        </Badge>
        <span className="text-sm text-foreground">
          Total dû : <strong>{formatMontant(summary.totalNet)}</strong> — Payé :{" "}
          <strong>{formatMontant(summary.totalPaid)}</strong> — Reste :{" "}
          <strong>{formatMontant(summary.totalRemaining)}</strong>
        </span>
      </div>
      <DataTable
        columns={columns}
        rows={summary.lines}
        getRowId={(l) => l.feeTypeId}
        emptyMessage="Aucun frais applicable."
      />
    </div>
  );
}

/** Tableau de bord enseignant (MODULE-15 §4 phase 3) — emploi du temps propre, réutilise
 * `listSeances` filtré par `teacherId` résolu côté serveur depuis la session portail. */
function TeacherDashboard() {
  const [seances, setSeances] = useState<SeanceDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);
    trpcClient.portalTeacher.schedule
      .query({ startDate, endDate })
      .then(setSeances)
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : "Échec du chargement de l'emploi du temps."));
  }, []);

  return (
    <Card variant="static">
      <CardContent className="flex flex-col gap-4 pt-4">
        <h2 className="text-sm font-semibold text-foreground">Emploi du temps — 14 prochains jours</h2>
        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : (
          <DataTable
            columns={seanceColumns()}
            rows={seances ?? []}
            getRowId={(s) => s.id}
            emptyMessage={seances === null ? "Chargement…" : "Aucune séance dans les 14 prochains jours."}
          />
        )}
      </CardContent>
    </Card>
  );
}
