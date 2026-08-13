import type {
  CampaignAudienceType,
  CampaignDto,
  CampaignScheduleType,
  CampaignStatus,
  CommunicationChannelType,
} from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { ContactPicker } from "./ContactPicker";

const STATUS_BADGE: Record<CampaignStatus, { label: string; variant: "success" | "destructive" | "default" | "muted" }> = {
  BROUILLON: { label: "Brouillon", variant: "muted" },
  PLANIFIEE: { label: "Planifiée", variant: "default" },
  EN_COURS: { label: "En cours", variant: "default" },
  SUSPENDUE: { label: "Suspendue", variant: "muted" },
  TERMINEE: { label: "Terminée", variant: "success" },
  ANNULEE: { label: "Annulée", variant: "destructive" },
};

const AUDIENCE_LABELS: Record<CampaignAudienceType, string> = {
  INDIVIDUEL: "Sélection individuelle",
  CLASSE: "Une classe",
  CLASSES: "Plusieurs classes",
  FILIERE: "Une filière",
  FILIERES: "Plusieurs filières",
  CAMPUS: "Tout le campus",
  TOUS_ETUDIANTS: "Tous les étudiants",
  TOUS_ENSEIGNANTS: "Tous les enseignants",
  TOUS_PARENTS: "Tous les parents",
  TOUT_PERSONNEL: "Tout le personnel administratif",
};

/** Campagnes (voir MODULE-12 §1.5/§1.6/§1.7) — créer/enregistrer/modifier/planifier/suspendre/reprendre/supprimer/dupliquer. */
export function CampaignsScreen() {
  const canModify = useHasPermission("CAMPAGNES:MODIFICATION");
  const canValidate = useHasPermission("CAMPAGNES:VALIDATION");
  const canDelete = useHasPermission("CAMPAGNES:SUPPRESSION");
  const canCreate = useHasPermission("CAMPAGNES:CREATION");
  const utils = trpc.useUtils();
  const query = trpc.campaigns.list.useQuery({});
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.campaigns.list.invalidate();
    void utils.communicationDashboard.get.invalidate();
  }

  const duplicate = trpc.campaigns.duplicate.useMutation({ onSuccess: invalidate });
  const remove = trpc.campaigns.delete.useMutation({ onSuccess: invalidate });
  const schedule = trpc.campaigns.schedule.useMutation({ onSuccess: invalidate });
  const suspend = trpc.campaigns.suspend.useMutation({ onSuccess: invalidate });
  const resume = trpc.campaigns.resume.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<CampaignDto>[] = [
    { key: "nom", header: "Nom", value: (r) => r.name },
    { key: "canal", header: "Canal", value: (r) => r.channel },
    { key: "audience", header: "Audience", value: (r) => AUDIENCE_LABELS[r.audienceType] },
    { key: "planification", header: "Planification", value: (r) => r.scheduleType },
    { key: "destinataires", header: "Messages générés", value: (r) => String(r.recipientCount) },
    {
      key: "statut",
      header: "Statut",
      value: (r) => STATUS_BADGE[r.status].label,
      render: (r) => <Badge variant={STATUS_BADGE[r.status].variant}>{STATUS_BADGE[r.status].label}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Campagnes</h2>
        {canCreate && <Button onClick={() => setCreateOpen(true)}>Nouvelle campagne</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(r) => r.id}
        exportFilename="campagnes"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucune campagne."}
        rowActions={(r) => (
          <div className="flex flex-wrap justify-end gap-2">
            {canValidate && r.status === "BROUILLON" && (
              <Button variant="outline" onClick={() => schedule.mutate({ id: r.id })}>
                {r.scheduleType === "IMMEDIAT" ? "Envoyer" : "Planifier"}
              </Button>
            )}
            {canValidate && (r.status === "PLANIFIEE" || r.status === "EN_COURS") && (
              <Button variant="outline" onClick={() => suspend.mutate({ id: r.id })}>Suspendre</Button>
            )}
            {canValidate && r.status === "SUSPENDUE" && (
              <Button variant="outline" onClick={() => resume.mutate({ id: r.id })}>Reprendre</Button>
            )}
            {canModify && (
              <Button variant="outline" onClick={() => duplicate.mutate({ id: r.id })}>Dupliquer</Button>
            )}
            {canDelete && (
              <Button variant="destructive" onClick={() => remove.mutate({ id: r.id })}>Supprimer</Button>
            )}
          </div>
        )}
      />

      {createOpen && <CreateCampaignDialog onClose={() => setCreateOpen(false)} onSuccess={invalidate} />}
    </div>
  );
}

function CreateCampaignDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<CommunicationChannelType>("SMS");
  const [templateId, setTemplateId] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [audienceType, setAudienceType] = useState<CampaignAudienceType>("TOUS_ETUDIANTS");
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [filiereIds, setFiliereIds] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<CampaignScheduleType>("IMMEDIAT");
  const [scheduledFor, setScheduledFor] = useState("");

  const templatesQuery = trpc.messageTemplates.list.useQuery({ activeOnly: true });
  const classesQuery = trpc.schoolClasses.list.useQuery({});
  const filieresQuery = trpc.filieres.list.useQuery();

  const create = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const audienceFilter =
    audienceType === "INDIVIDUEL"
      ? { recipientIds }
      : audienceType === "CLASSE" || audienceType === "CLASSES"
        ? { classIds }
        : audienceType === "FILIERE" || audienceType === "FILIERES"
          ? { filiereIds }
          : undefined;

  const canSubmit = Boolean(name.trim()) && (Boolean(templateId) || Boolean(customContent.trim()));

  return (
    <Dialog open onClose={onClose} title="Nouvelle campagne">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Nom de la campagne</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Canal</Label>
            <Select value={channel} onChange={(e) => setChannel(e.target.value as CommunicationChannelType)}>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp (cliquer pour envoyer)</option>
              <option value="EMAIL">E-mail</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Modèle (optionnel)</Label>
          <Select value={templateId} onChange={(e) => { setTemplateId(e.target.value); if (e.target.value) setCustomContent(""); }}>
            <option value="">— Contenu personnalisé —</option>
            {(templatesQuery.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </Select>
        </div>
        {!templateId && (
          <div className="flex flex-col gap-1.5">
            <Label>Message</Label>
            <textarea
              className="min-h-24 rounded-md border border-white bg-background text-foreground px-3 py-2 text-sm"
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>Audience</Label>
          <Select value={audienceType} onChange={(e) => setAudienceType(e.target.value as CampaignAudienceType)}>
            {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>

        {audienceType === "INDIVIDUEL" && <ContactPicker selectedIds={recipientIds} onChange={setRecipientIds} />}

        {(audienceType === "CLASSE" || audienceType === "CLASSES") && (
          <div className="flex max-h-40 flex-col gap-1 overflow-auto rounded-lg border border-border p-2">
            {(classesQuery.data ?? []).map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={classIds.includes(c.id)}
                  onChange={() => setClassIds((prev) => (prev.includes(c.id) ? prev.filter((i) => i !== c.id) : [...prev, c.id]))}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                {c.name}
              </label>
            ))}
          </div>
        )}

        {(audienceType === "FILIERE" || audienceType === "FILIERES") && (
          <div className="flex max-h-40 flex-col gap-1 overflow-auto rounded-lg border border-border p-2">
            {(filieresQuery.data ?? []).map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filiereIds.includes(f.id)}
                  onChange={() => setFiliereIds((prev) => (prev.includes(f.id) ? prev.filter((i) => i !== f.id) : [...prev, f.id]))}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                {f.name}
              </label>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Planification</Label>
            <Select value={scheduleType} onChange={(e) => setScheduleType(e.target.value as CampaignScheduleType)}>
              <option value="IMMEDIAT">Envoi immédiat</option>
              <option value="DIFFERE">Envoi différé</option>
              <option value="QUOTIDIEN">Quotidienne</option>
              <option value="HEBDOMADAIRE">Hebdomadaire</option>
              <option value="MENSUEL">Mensuelle</option>
            </Select>
          </div>
          {scheduleType !== "IMMEDIAT" && (
            <div className="flex flex-col gap-1.5">
              <Label>Date/heure de départ</Label>
              <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </div>
          )}
        </div>

        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={!canSubmit || create.isPending}
            onClick={() =>
              create.mutate({
                name,
                channel,
                templateId: templateId || undefined,
                customContent: customContent || undefined,
                audienceType,
                audienceFilter,
                scheduleType,
                scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
              })
            }
          >
            {create.isPending ? "Création…" : "Créer la campagne"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
