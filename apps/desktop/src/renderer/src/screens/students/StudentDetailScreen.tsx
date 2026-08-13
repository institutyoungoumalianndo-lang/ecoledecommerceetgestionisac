import { Button } from "@isac-erp/ui";
import {
  BookOpen,
  Coins,
  Contact,
  CreditCard,
  FileSignature,
  FileText,
  History,
  IdCard,
  MessageSquare,
  ShieldAlert,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { EnrollmentFormDialog } from "../enrollments/EnrollmentFormDialog";
import { ArchiveStudentDialog } from "./ArchiveStudentDialog";
import { FicheInscriptionTab } from "./FicheInscriptionTab";
import { PaymentCardTab } from "./PaymentCardTab";
import { StudentCardTab } from "./StudentCardTab";
import { StudentCommunicationsTab } from "./StudentCommunicationsTab";
import { StudentDocumentsTab } from "./StudentDocumentsTab";
import { StudentFeesTab } from "./StudentFeesTab";
import { StudentGuardiansTab } from "./StudentGuardiansTab";
import { StudentHistoryTab } from "./StudentHistoryTab";
import { StudentAbsencesTab } from "./StudentAbsencesTab";
import { StudentIdentityTab } from "./StudentIdentityTab";
import { StudentNotesTab } from "./StudentNotesTab";
import { StudentPaymentsTab } from "./StudentPaymentsTab";
import { StudentSanctionsTab } from "./StudentSanctionsTab";
import { type ProfileNavItem, StudentProfileRail } from "./StudentProfileRail";

const COMING_SOON_TABS: ProfileNavItem[] = [];

/** Fiche complète de l'étudiant (MODULE-04 §4.7) — point central de toutes les opérations. */
export function StudentDetailScreen({ studentId, onBack }: { studentId: string; onBack: () => void }) {
  const [tab, setTab] = useState("identite");
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [reenrollOpen, setReenrollOpen] = useState(false);

  const query = trpc.students.getById.useQuery({ id: studentId });
  const enrollmentsQuery = trpc.studentEnrollments.listByStudent.useQuery({ studentId });
  const utils = trpc.useUtils();
  const canModify = useHasPermission("ETUDIANTS:SUPPRESSION");
  const canReenroll = useHasPermission("INSCRIPTIONS:CREATION");

  const restore = trpc.students.restore.useMutation({
    onSuccess: () => void utils.students.getById.invalidate({ id: studentId }),
  });

  if (!query.data) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  const student = query.data;
  const currentEnrollment = enrollmentsQuery.data?.find((e) => e.isCurrentYear && !e.cancelledAt);

  const tabs: ProfileNavItem[] = [
    { key: "identite", label: "Identité", icon: IdCard },
    { key: "parents", label: "Parents / Tuteurs", icon: Users },
    { key: "documents", label: "Documents", icon: FileText },
    { key: "carte", label: "Carte d'étudiant", icon: Contact },
    { key: "carte-paiement", label: "Carte de paiement", icon: CreditCard },
    { key: "fiche-inscription", label: "Fiche d'inscription", icon: FileSignature },
    { key: "notes", label: "Notes / Bulletins", icon: BookOpen },
    { key: "historique", label: "Historique académique", icon: History },
    { key: "frais", label: "Frais de scolarité", icon: Coins },
    { key: "paiements", label: "Paiements", icon: Wallet },
    { key: "communications", label: "Communications", icon: MessageSquare },
    { key: "sanctions", label: "Sanctions", icon: ShieldAlert },
    { key: "presences", label: "Présences", icon: UserCheck },
    ...COMING_SOON_TABS,
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="px-0">
          ← Retour à la liste
        </Button>
        <div className="flex gap-2">
          {canReenroll && !student.archivedAt && (
            <Button variant="success" onClick={() => setReenrollOpen(true)}>
              Réinscrire
            </Button>
          )}
          {canModify && (
            <>
              {student.archivedAt ? (
                <Button variant="success" onClick={() => restore.mutate({ id: studentId })} disabled={restore.isPending}>
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

      <div className="flex flex-col gap-4 md:flex-row">
        <StudentProfileRail
          student={student}
          enrollment={
            currentEnrollment && {
              filiereName: currentEnrollment.filiereName,
              levelLabel: currentEnrollment.levelLabel,
              className: currentEnrollment.className,
              academicYearLabel: currentEnrollment.academicYearLabel,
            }
          }
          items={tabs}
          activeKey={tab}
          onChange={setTab}
          comingSoonCount={COMING_SOON_TABS.length}
        />

        <div className="min-w-0 flex-1">
          {tab === "identite" && <StudentIdentityTab student={student} />}
          {tab === "parents" && <StudentGuardiansTab studentId={studentId} />}
          {tab === "documents" && <StudentDocumentsTab studentId={studentId} />}
          {tab === "carte" && <StudentCardTab studentId={studentId} />}
          {tab === "carte-paiement" && <PaymentCardTab studentId={studentId} />}
          {tab === "fiche-inscription" && <FicheInscriptionTab studentId={studentId} />}
          {tab === "notes" && <StudentNotesTab studentId={studentId} studentName={`${student.lastName} ${student.firstName}`} />}
          {tab === "historique" && <StudentHistoryTab studentId={studentId} />}
          {tab === "frais" && <StudentFeesTab studentId={studentId} />}
          {tab === "paiements" && <StudentPaymentsTab studentId={studentId} />}
          {tab === "communications" && <StudentCommunicationsTab studentId={studentId} />}
          {tab === "sanctions" && <StudentSanctionsTab studentId={studentId} studentName={`${student.lastName} ${student.firstName}`} />}
          {tab === "presences" && <StudentAbsencesTab studentId={studentId} />}
        </div>
      </div>

      {archiveDialogOpen && (
        <ArchiveStudentDialog
          studentId={studentId}
          onClose={() => setArchiveDialogOpen(false)}
        />
      )}

      {reenrollOpen && (
        <EnrollmentFormDialog initialStudentId={studentId} onClose={() => setReenrollOpen(false)} />
      )}
    </div>
  );
}
