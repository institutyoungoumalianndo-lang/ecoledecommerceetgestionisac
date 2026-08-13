import { Card, CardContent, CardHeader, CardTitle, StatRingCard as StatCard } from "@isac-erp/ui";
import { trpc } from "../../lib/trpc";

/** Tableau de bord (MODULE-12 §1.1) — compteurs calculés à la demande, jamais mis en cache. */
export function CommunicationDashboardScreen() {
  const query = trpc.communicationDashboard.get.useQuery();
  const data = query.data;

  return (
    <div className="flex flex-col gap-4">
      <Card variant="static">
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="Total" value={String(data?.totalContacts ?? "—")} />
          <StatCard label="Étudiants" value={String(data?.totalStudents ?? "—")} />
          <StatCard label="Parents/tuteurs" value={String(data?.totalGuardians ?? "—")} />
          <StatCard label="Enseignants" value={String(data?.totalTeachers ?? "—")} />
          <StatCard label="Personnel" value={String(data?.totalStaff ?? "—")} />
        </CardContent>
      </Card>

      <Card variant="static">
        <CardHeader>
          <CardTitle>Envois</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="SMS envoyés" value={String(data?.smsSent ?? "—")} />
          <StatCard label="WhatsApp envoyés" value={String(data?.whatsappSent ?? "—")} />
          <StatCard label="E-mails envoyés" value={String(data?.emailsSent ?? "—")} />
          <StatCard label="Notifications automatiques" value={String(data?.automaticNotificationsSent ?? "—")} />
        </CardContent>
      </Card>

      <Card variant="static">
        <CardHeader>
          <CardTitle>Campagnes & état</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Campagnes créées" value={String(data?.campaignsCreated ?? "—")} />
          <StatCard label="Campagnes programmées" value={String(data?.campaignsScheduled ?? "—")} />
          <StatCard label="Messages échoués" value={String(data?.messagesFailed ?? "—")} />
          <StatCard label="Messages en attente" value={String(data?.messagesPending ?? "—")} />
        </CardContent>
      </Card>

      <Card variant="static">
        <CardHeader>
          <CardTitle>Solde SMS</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {data?.smsBalance !== null && data?.smsBalance !== undefined ? data.smsBalance.toLocaleString("fr-FR") : "Non renseigné"}
          </p>
          <p className="text-xs text-muted-foreground">Configuré depuis Paramètres → Communication → Comptes SMS.</p>
        </CardContent>
      </Card>
    </div>
  );
}
