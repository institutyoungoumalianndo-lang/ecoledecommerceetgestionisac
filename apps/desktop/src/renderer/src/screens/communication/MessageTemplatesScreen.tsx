import type { MessageTemplateDto } from "@isac-erp/shared";
import { Badge, Button, DataTable, type DataTableColumn, Dialog, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

/** Bibliothèque de modèles avec variables (voir MODULE-12 §1.8/§1.9). */
export function MessageTemplatesScreen() {
  const canModify = useHasPermission("MODELES_COMMUNICATION:MODIFICATION");
  const utils = trpc.useUtils();
  const query = trpc.messageTemplates.list.useQuery({});
  const [editing, setEditing] = useState<MessageTemplateDto | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  function invalidate() {
    void utils.messageTemplates.list.invalidate();
  }

  const remove = trpc.messageTemplates.delete.useMutation({ onSuccess: invalidate });

  const columns: DataTableColumn<MessageTemplateDto>[] = [
    { key: "label", header: "Libellé", value: (r) => r.label },
    { key: "code", header: "Code", value: (r) => r.code },
    { key: "content", header: "Contenu", value: (r) => r.content },
    {
      key: "type",
      header: "Type",
      value: (r) => (r.isSystem ? "Système" : "Personnalisé"),
      render: (r) => <Badge variant={r.isSystem ? "muted" : "default"}>{r.isSystem ? "Système" : "Personnalisé"}</Badge>,
    },
    {
      key: "statut",
      header: "Statut",
      value: (r) => (r.isActive ? "Actif" : "Inactif"),
      render: (r) => <Badge variant={r.isActive ? "success" : "muted"}>{r.isActive ? "Actif" : "Inactif"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Modèles de message</h2>
        {canModify && <Button onClick={() => setCreateOpen(true)}>Nouveau modèle</Button>}
      </div>

      <p className="text-sm text-muted-foreground">
        Variables disponibles : {"{Nom} {Prénom} {Classe} {Filière} {Campus} {Montant} {Date} {Heure} {NuméroReçu} {MontantTotal} {MontantPayé} {ResteÀPayer} {AnnéeUniversitaire}"}
      </p>

      <DataTable
        columns={columns}
        rows={query.data ?? []}
        getRowId={(r) => r.id}
        exportFilename="modeles-communication"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun modèle."}
        rowActions={
          canModify
            ? (r) => (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(r)}>Modifier</Button>
                  {!r.isSystem && (
                    <Button variant="destructive" onClick={() => remove.mutate({ id: r.id })}>Supprimer</Button>
                  )}
                </div>
              )
            : undefined
        }
      />

      {createOpen && <CreateTemplateDialog onClose={() => setCreateOpen(false)} onSuccess={invalidate} />}
      {editing && <EditTemplateDialog template={editing} onClose={() => setEditing(null)} onSuccess={invalidate} />}
    </div>
  );
}

function CreateTemplateDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");

  const create = trpc.messageTemplates.create.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Créer un modèle">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Code (ex. RAPPEL_REUNION)</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Libellé</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Contenu</Label>
          <textarea
            className="min-h-28 rounded-md border border-white bg-background text-foreground px-3 py-2 text-sm"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            disabled={create.isPending || !code.trim() || !label.trim() || !content.trim()}
            onClick={() => create.mutate({ code, label, content })}
          >
            {create.isPending ? "Création…" : "Créer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function EditTemplateDialog({
  template,
  onClose,
  onSuccess,
}: {
  template: MessageTemplateDto;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [label, setLabel] = useState(template.label);
  const [content, setContent] = useState(template.content);
  const [isActive, setIsActive] = useState(template.isActive);

  const update = trpc.messageTemplates.update.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title={`Modifier "${template.label}"`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Libellé</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Contenu</Label>
          <textarea
            className="min-h-28 rounded-md border border-white bg-background text-foreground px-3 py-2 text-sm"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-border text-primary" />
          Actif
        </label>
        {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button disabled={update.isPending} onClick={() => update.mutate({ id: template.id, label, content, isActive })}>
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
