import { Button, Dialog, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

/** Formations suivies (MODULE-05 §1.5/§10.7) — donnée structurée, jamais supprimée du dossier sauf erreur de saisie. */
export function TeacherTrainingsTab({ teacherId }: { teacherId: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const canView = useHasPermission("ENSEIGNANTS_DOCUMENTS:LECTURE");
  const canCreate = useHasPermission("ENSEIGNANTS_DOCUMENTS:CREATION");
  const canDelete = useHasPermission("ENSEIGNANTS_DOCUMENTS:SUPPRESSION");
  const utils = trpc.useUtils();

  const query = trpc.teacherTrainings.listByTeacher.useQuery({ teacherId });
  const deleteTraining = trpc.teacherTrainings.delete.useMutation({
    onSuccess: () => void utils.teacherTrainings.listByTeacher.invalidate({ teacherId }),
  });

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canCreate && <Button onClick={() => setAddOpen(true)}>Ajouter une formation</Button>}
      </div>

      {(query.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucune formation renseignée.</p>}

      <div className="flex flex-col gap-2">
        {(query.data ?? []).map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">{t.title}</p>
              <p className="text-xs text-muted-foreground">
                {t.institution ? `${t.institution} — ` : ""}
                {new Date(t.startDate).toLocaleDateString("fr-FR")}
                {t.endDate ? ` au ${new Date(t.endDate).toLocaleDateString("fr-FR")}` : ""}
              </p>
            </div>
            {canDelete && (
              <Button variant="destructive" onClick={() => deleteTraining.mutate({ id: t.id })}>
                Supprimer
              </Button>
            )}
          </div>
        ))}
      </div>

      {addOpen && <AddTrainingDialog teacherId={teacherId} onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function AddTrainingDialog({ teacherId, onClose }: { teacherId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [institution, setInstitution] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const create = trpc.teacherTrainings.create.useMutation({
    onSuccess: () => {
      void utils.teacherTrainings.listByTeacher.invalidate({ teacherId });
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Ajouter une formation">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Intitulé</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Organisme</Label>
          <Input value={institution} onChange={(e) => setInstitution(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Date de début</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Date de fin</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={!title.trim() || !startDate || create.isPending}
            onClick={() =>
              create.mutate({
                teacherId,
                title,
                institution: institution || undefined,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : undefined,
              })
            }
          >
            {create.isPending ? "Ajout…" : "Ajouter"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
