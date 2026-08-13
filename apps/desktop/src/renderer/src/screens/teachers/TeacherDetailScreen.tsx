import { Badge, Button, Tabs, type TabItem } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { ArchiveTeacherDialog } from "./ArchiveTeacherDialog";
import { TeacherAssignmentsTab } from "./TeacherAssignmentsTab";
import { TeacherAvailabilityTab } from "./TeacherAvailabilityTab";
import { TeacherDocumentsTab } from "./TeacherDocumentsTab";
import { TeacherHistoryTab } from "./TeacherHistoryTab";
import { TeacherEmargementTab } from "./TeacherEmargementTab";
import { TeacherContractsTab } from "./TeacherContractsTab";
import { TeacherIdentityTab } from "./TeacherIdentityTab";
import { TeacherTrainingsTab } from "./TeacherTrainingsTab";

/** Dossier numérique complet de l'enseignant (MODULE-05 §1.5/§10.6) — point central de toutes les opérations. */
export function TeacherDetailScreen({
  teacherId,
  onBack,
  onCreatePayrollProfile,
}: {
  teacherId: string;
  onBack: () => void;
  onCreatePayrollProfile?: (teacherId: string) => void;
}) {
  const [tab, setTab] = useState("identite");
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const query = trpc.teachers.getById.useQuery({ id: teacherId });
  const utils = trpc.useUtils();
  const canModify = useHasPermission("ENSEIGNANTS:SUPPRESSION");

  const restore = trpc.teachers.restore.useMutation({
    onSuccess: () => void utils.teachers.getById.invalidate({ id: teacherId }),
  });

  if (!query.data) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  const teacher = query.data;

  const tabs: TabItem[] = [
    { key: "identite", label: "Identité" },
    { key: "affectations", label: "Affectations & charge horaire" },
    { key: "disponibilites", label: "Disponibilités" },
    { key: "emargement", label: "Émargement" },
    { key: "contrats", label: "Contrats" },
    { key: "formations", label: "Formations" },
    { key: "documents", label: "Documents" },
    { key: "historique", label: "Historique" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-1 px-0">
            ← Retour à la liste
          </Button>
          <h2 className="text-lg font-semibold text-foreground">
            {teacher.lastName} {teacher.firstName}{" "}
            <span className="font-normal text-muted-foreground">— {teacher.matricule}</span>
            {teacher.archivedAt && (
              <Badge variant="muted" className="ml-2">
                Archivé
              </Badge>
            )}
          </h2>
        </div>
        <div className="flex gap-2">
          {!teacher.archivedAt && !teacher.payrollEmployeeId && onCreatePayrollProfile && (
            <Button variant="outline" onClick={() => onCreatePayrollProfile(teacherId)}>
              Ajouter à la paie
            </Button>
          )}
          {canModify && (
            <>
              {teacher.archivedAt ? (
                <Button variant="success" onClick={() => restore.mutate({ id: teacherId })} disabled={restore.isPending}>
                  Restaurer
                </Button>
              ) : (
                <Button variant="destructive" onClick={() => setArchiveDialogOpen(true)}>
                  Archiver
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Tabs items={tabs} activeKey={tab} onChange={setTab} />

      <div className="pt-2">
        {tab === "identite" && <TeacherIdentityTab teacher={teacher} />}
        {tab === "affectations" && <TeacherAssignmentsTab teacherId={teacherId} />}
        {tab === "disponibilites" && <TeacherAvailabilityTab teacherId={teacherId} />}
        {tab === "emargement" && <TeacherEmargementTab teacherId={teacherId} />}
        {tab === "contrats" && <TeacherContractsTab teacherId={teacherId} />}
        {tab === "formations" && <TeacherTrainingsTab teacherId={teacherId} />}
        {tab === "documents" && <TeacherDocumentsTab teacherId={teacherId} />}
        {tab === "historique" && <TeacherHistoryTab teacherId={teacherId} />}
      </div>

      {archiveDialogOpen && (
        <ArchiveTeacherDialog teacherId={teacherId} onClose={() => setArchiveDialogOpen(false)} />
      )}
    </div>
  );
}
