import { prisma } from "@isac-erp/db";
import type { CommunicationContactDto, SanctionType } from "@isac-erp/shared";
import { dispatchAutomaticNotification } from "./communicationMessageService.js";

const SANCTION_TYPE_LABELS: Record<SanctionType, string> = {
  AVERTISSEMENT: "Avertissement",
  BLAME: "Blâme",
  RETENUE: "Retenue",
  EXCLUSION_TEMPORAIRE: "Exclusion temporaire",
  EXCLUSION_DEFINITIVE: "Exclusion définitive",
  AUTRE: "Autre",
};

/**
 * Notification automatique dès l'enregistrement d'une sanction disciplinaire (voir MODULE-12 §1.10,
 * NotificationEventType.SANCTION_ENREGISTREE) — envoyée simultanément à l'étudiant et à tous ses
 * tuteurs marqués contact principal, même principe que `notifyPayment` (retour du porteur du projet,
 * 2026-08-03 : "notification automatique"). N'échoue jamais bruyamment : la sanction reste valide même
 * si la notification échoue (règle §3 point 1).
 */
export async function notifySanction(
  studentId: string,
  type: SanctionType,
  motif: string,
  date: Date
): Promise<void> {
  try {
    const [student, campusSettings, guardianLinks] = await Promise.all([
      prisma.student.findUniqueOrThrow({ where: { id: studentId } }),
      prisma.campusSettings.findFirst(),
      prisma.studentGuardian.findMany({
        where: { studentId, isPrimaryContact: true },
        include: { guardian: true },
      }),
    ]);
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, cancelledAt: null },
      orderBy: { enrollmentDate: "desc" },
      include: { class: true, filiere: true },
    });

    const variables: Record<string, string> = {
      Nom: student.lastName,
      Prénom: student.firstName,
      Classe: enrollment?.class.name ?? "—",
      Filière: enrollment?.filiere.name ?? "—",
      Campus: campusSettings?.name ?? "",
      TypeSanction: SANCTION_TYPE_LABELS[type],
      Motif: motif,
      Date: date.toLocaleDateString("fr-FR"),
    };

    const recipients: CommunicationContactDto[] = [
      {
        id: `ETUDIANT:${student.id}`,
        type: "ETUDIANT",
        lastName: student.lastName,
        firstName: student.firstName,
        phonePrimary: student.phonePrimary,
        phoneSecondary: student.phoneSecondary,
        whatsapp: null,
        email: student.email,
        campus: campusSettings?.name ?? null,
        className: enrollment?.class.name ?? null,
        filiereName: enrollment?.filiere.name ?? null,
        fonction: null,
        statut: "Actif",
      },
      ...guardianLinks.map((link) => ({
        id: `PARENT:${link.guardian.id}`,
        type: "PARENT" as const,
        lastName: link.guardian.lastName,
        firstName: link.guardian.firstName,
        phonePrimary: link.guardian.phonePrimary,
        phoneSecondary: link.guardian.phoneSecondary,
        whatsapp: link.guardian.whatsapp,
        email: link.guardian.email,
        campus: campusSettings?.name ?? null,
        className: enrollment?.class.name ?? null,
        filiereName: enrollment?.filiere.name ?? null,
        fonction: link.guardian.profession,
        statut: "Actif",
      })),
    ];

    await dispatchAutomaticNotification("SANCTION_ENREGISTREE", variables, recipients);
  } catch (err) {
    console.error("Notification automatique de sanction en échec (non bloquant) :", err);
  }
}
