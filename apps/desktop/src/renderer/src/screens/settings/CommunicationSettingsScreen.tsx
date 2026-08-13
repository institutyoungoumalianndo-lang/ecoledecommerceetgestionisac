import type { NotificationEventType, SmsGatewayAccountDto } from "@isac-erp/shared";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, DataTable, type DataTableColumn, Dialog, Input, Label, Tabs } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";

const EVENT_LABELS: Record<NotificationEventType, string> = {
  INSCRIPTION_VALIDEE: "Inscription validée",
  PAIEMENT_SCOLARITE: "Paiement de scolarité",
  BULLETIN_DISPONIBLE: "Bulletin disponible",
  CHANGEMENT_EMPLOI_DU_TEMPS: "Changement d'emploi du temps",
  ABSENCE: "Absence (non actif — aucun module de suivi des absences)",
  CERTIFICAT_DISPONIBLE: "Certificat disponible (non actif — Module 9 à venir)",
  ATTESTATION_DISPONIBLE: "Attestation disponible (non actif — Module 9 à venir)",
  SANCTION_ENREGISTREE: "Sanction enregistrée",
  AFFECTATION_ENSEIGNANT_CREEE: "Nouvelle affectation enseignant",
};

/** Paramètres → Communication (Super Administrateur uniquement, voir MODULE-12 §1.12). */
export function CommunicationSettingsScreen() {
  const [tab, setTab] = useState("sms");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Communication</h2>
      <p className="text-sm text-muted-foreground">
        Configuration des passerelles SMS/WhatsApp/E-mail — toutes les communications automatiques ou manuelles
        utilisent ces réglages, jamais de saisie répétée par écran.
      </p>

      <Tabs
        items={[
          { key: "sms", label: "Comptes SMS" },
          { key: "whatsapp", label: "WhatsApp Business" },
          { key: "email", label: "E-mail (SMTP)" },
          { key: "signature", label: "Signature & pied de page" },
          { key: "evenements", label: "Notifications automatiques" },
        ]}
        activeKey={tab}
        onChange={setTab}
      />

      <div className="pt-2">
        {tab === "sms" && <SmsAccountsTab />}
        {tab === "whatsapp" && <WhatsAppTab />}
        {tab === "email" && <EmailTab />}
        {tab === "signature" && <SignatureTab />}
        {tab === "evenements" && <NotificationEventsTab />}
      </div>
    </div>
  );
}

function SmsAccountsTab() {
  const utils = trpc.useUtils();
  const query = trpc.communicationGatewaySettings.listSmsAccounts.useQuery();
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.communicationGatewaySettings.listSmsAccounts.invalidate();
  }

  const setDefault = trpc.communicationGatewaySettings.setDefaultSmsAccount.useMutation({ onSuccess: invalidate });
  const deleteAccount = trpc.communicationGatewaySettings.deleteSmsAccount.useMutation({ onSuccess: invalidate });
  const test = trpc.communicationGatewaySettings.testSmsAccount.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<SmsGatewayAccountDto>[] = [
    { key: "label", header: "Compte", value: (r) => r.label },
    { key: "fournisseur", header: "Fournisseur", value: (r) => r.providerName },
    { key: "url", header: "Adresse / identifiant", value: (r) => r.apiIdentifier ?? "—" },
    { key: "senderId", header: "Sender ID", value: (r) => r.senderId ?? "—" },
    { key: "solde", header: "Solde", value: (r) => (r.balance !== null ? r.balance.toLocaleString("fr-FR") : "—") },
    {
      key: "defaut",
      header: "Par défaut",
      value: (r) => (r.isDefault ? "Oui" : "Non"),
      render: (r) => (r.isDefault ? <Badge variant="success">Par défaut</Badge> : <span className="text-muted-foreground">—</span>),
    },
    {
      key: "connexion",
      header: "Connexion",
      value: (r) => r.connectionStatus,
      render: (r) => (
        <Badge variant={r.connectionStatus === "CONNECTE" ? "success" : r.connectionStatus === "DECONNECTE" ? "destructive" : "muted"}>
          {r.connectionStatus === "CONNECTE" ? "Connecté" : r.connectionStatus === "DECONNECTE" ? "Déconnecté" : "Inconnu"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Ciblez la passerelle SMS locale (téléphone Android dédié, voir la documentation du module) via son adresse
        réseau (ex. http://192.168.1.50:8080) et l'en-tête d'autorisation fourni par l'application installée sur le
        téléphone. Plusieurs comptes possibles (principal/secours) ; un seul est utilisé par défaut pour l'envoi.
      </p>
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>Nouveau compte SMS</Button>
      </div>
      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(r) => r.id}
        exportFilename="comptes-sms"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun compte SMS configuré."}
        rowActions={(r) => (
          <div className="flex flex-wrap justify-end gap-2">
            {!r.isDefault && (
              <Button variant="outline" onClick={() => setDefault.mutate({ id: r.id })}>Définir par défaut</Button>
            )}
            <Button variant="outline" onClick={() => test.mutate({ id: r.id })} disabled={test.isPending}>
              Tester la connexion
            </Button>
            <Button variant="destructive" onClick={() => deleteAccount.mutate({ id: r.id })}>Supprimer</Button>
          </div>
        )}
      />
      {test.data && (
        <p className={test.data.success ? "text-sm text-success" : "text-sm text-destructive"}>{test.data.message}</p>
      )}
      {createOpen && <CreateSmsAccountDialog onClose={() => setCreateOpen(false)} onSuccess={invalidate} />}
    </div>
  );
}

function CreateSmsAccountDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [providerName, setProviderName] = useState("Passerelle Android locale");
  const [label, setLabel] = useState("");
  const [apiIdentifier, setApiIdentifier] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [senderId, setSenderId] = useState("");
  const [officialPhoneNumber, setOfficialPhoneNumber] = useState("");

  const create = trpc.communicationGatewaySettings.createSmsAccount.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nouveau compte SMS">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Nom du compte (ex. "Principal", "Secours")</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Fournisseur</Label>
          <Input value={providerName} onChange={(e) => setProviderName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Adresse de la passerelle (ex. http://192.168.1.50:8080)</Label>
          <Input value={apiIdentifier} onChange={(e) => setApiIdentifier(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>En-tête d'autorisation (ex. "Basic xxxx")</Label>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sender ID (optionnel)</Label>
          <Input value={senderId} onChange={(e) => setSenderId(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Numéro officiel (optionnel)</Label>
          <Input value={officialPhoneNumber} onChange={(e) => setOfficialPhoneNumber(e.target.value)} />
        </div>
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={create.isPending || !label.trim() || !providerName.trim()}
            onClick={() =>
              create.mutate({
                providerName,
                label,
                apiIdentifier: apiIdentifier || undefined,
                apiKey: apiKey || undefined,
                senderId: senderId || undefined,
                officialPhoneNumber: officialPhoneNumber || undefined,
              })
            }
          >
            {create.isPending ? "Création…" : "Créer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function WhatsAppTab() {
  const utils = trpc.useUtils();
  const query = trpc.communicationGatewaySettings.getWhatsAppSettings.useQuery();
  const [businessPhoneNumber, setBusinessPhoneNumber] = useState("");

  useEffect(() => {
    if (query.data) setBusinessPhoneNumber(query.data.businessPhoneNumber ?? "");
  }, [query.data]);

  const update = trpc.communicationGatewaySettings.updateWhatsAppSettings.useMutation({
    onSuccess: () => void utils.communicationGatewaySettings.getWhatsAppSettings.invalidate(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Business</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Application classique (pas d'accès Cloud API) : aucun envoi automatique possible. Le numéro renseigné ici
          sert uniquement à identifier l'expéditeur ; chaque message reste "cliquer pour envoyer" (lien WhatsApp
          pré-rempli), un membre du personnel doit toujours cliquer "Envoyer" lui-même.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label>Numéro WhatsApp Business officiel</Label>
          <Input value={businessPhoneNumber} onChange={(e) => setBusinessPhoneNumber(e.target.value)} />
        </div>
        {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
        <div className="flex justify-end">
          <Button disabled={update.isPending} onClick={() => update.mutate({ businessPhoneNumber: businessPhoneNumber || null })}>
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmailTab() {
  const utils = trpc.useUtils();
  const query = trpc.communicationGatewaySettings.getEmailSettings.useQuery();
  const [officialEmail, setOfficialEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [useTls, setUseTls] = useState(true);

  useEffect(() => {
    if (query.data) {
      setOfficialEmail(query.data.officialEmail ?? "");
      setSmtpHost(query.data.smtpHost ?? "");
      setSmtpPort(query.data.smtpPort?.toString() ?? "");
      setSmtpUsername(query.data.smtpUsername ?? "");
      setUseTls(query.data.useTls);
    }
  }, [query.data]);

  const update = trpc.communicationGatewaySettings.updateEmailSettings.useMutation({
    onSuccess: () => void utils.communicationGatewaySettings.getEmailSettings.invalidate(),
  });
  const test = trpc.communicationGatewaySettings.testEmailSettings.useMutation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>E-mail (SMTP)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Adresse e-mail officielle</Label>
            <Input value={officialEmail} onChange={(e) => setOfficialEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Serveur SMTP</Label>
            <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.exemple.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Port</Label>
            <Input type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nom d'utilisateur</Label>
            <Input value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Mot de passe d'application {query.data?.hasSmtpPassword && "(déjà enregistré — laisser vide pour ne pas changer)"}</Label>
            <Input type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={useTls} onChange={(e) => setUseTls(e.target.checked)} className="h-4 w-4 rounded border-border text-primary" />
            Connexion sécurisée (TLS)
          </label>
        </div>
        {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
        {test.data && <p className={test.data.success ? "text-sm text-success" : "text-sm text-destructive"}>{test.data.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
            {test.isPending ? "Test…" : "Tester l'envoi"}
          </Button>
          <Button
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                officialEmail: officialEmail || null,
                smtpHost: smtpHost || null,
                smtpPort: smtpPort ? Number(smtpPort) : null,
                smtpUsername: smtpUsername || null,
                smtpPassword: smtpPassword || undefined,
                useTls,
              })
            }
          >
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SignatureTab() {
  const utils = trpc.useUtils();
  const query = trpc.communicationGatewaySettings.getSettings.useQuery();
  const [emailSignature, setEmailSignature] = useState("");
  const [messageFooter, setMessageFooter] = useState("");

  useEffect(() => {
    if (query.data) {
      setEmailSignature(query.data.emailSignature ?? "");
      setMessageFooter(query.data.messageFooter ?? "");
    }
  }, [query.data]);

  const update = trpc.communicationGatewaySettings.updateSettings.useMutation({
    onSuccess: () => void utils.communicationGatewaySettings.getSettings.invalidate(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signature & pied de page</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Le logo, le nom officiel et les coordonnées de l'établissement sont déjà configurés dans Paramètres →
          Établissement / Campus et réutilisés automatiquement — rien à ressaisir ici.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label>Signature des e-mails</Label>
          <textarea
            className="min-h-24 rounded-md border border-white bg-background text-foreground px-3 py-2 text-sm"
            value={emailSignature}
            onChange={(e) => setEmailSignature(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Pied de page des messages (SMS/WhatsApp)</Label>
          <textarea
            className="min-h-20 rounded-md border border-white bg-background text-foreground px-3 py-2 text-sm"
            value={messageFooter}
            onChange={(e) => setMessageFooter(e.target.value)}
          />
        </div>
        {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
        <div className="flex justify-end">
          <Button
            disabled={update.isPending}
            onClick={() => update.mutate({ emailSignature: emailSignature || null, messageFooter: messageFooter || null })}
          >
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationEventsTab() {
  const utils = trpc.useUtils();
  const query = trpc.notificationEventConfigs.list.useQuery();

  const update = trpc.notificationEventConfigs.update.useMutation({
    onSuccess: () => void utils.notificationEventConfigs.list.invalidate(),
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Canaux utilisés pour chaque notification automatique — WhatsApp n'apparaît jamais ici : ce canal reste
        toujours "cliquer pour envoyer", jamais un envoi automatique.
      </p>
      {(query.data ?? []).map((config) => (
        <Card key={config.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{EVENT_LABELS[config.eventType]}</CardTitle>
            <Badge variant={config.isActive ? "success" : "muted"}>{config.isActive ? "Actif" : "Inactif"}</Badge>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Modèle : {config.templateLabel}</p>
            <div className="flex items-center gap-4">
              {(["SMS", "EMAIL"] as const).map((channel) => (
                <label key={channel} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.channels.includes(channel)}
                    onChange={(e) =>
                      update.mutate({
                        id: config.id,
                        channels: e.target.checked
                          ? [...config.channels, channel]
                          : config.channels.filter((c) => c !== channel),
                      })
                    }
                    className="h-4 w-4 rounded border-border text-primary"
                  />
                  {channel === "SMS" ? "SMS" : "E-mail"}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.isActive}
                  onChange={(e) => update.mutate({ id: config.id, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                Actif
              </label>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
