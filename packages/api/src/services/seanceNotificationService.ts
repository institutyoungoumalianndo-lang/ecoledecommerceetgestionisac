import { prisma } from "@isac-erp/db";
import type { CommunicationContactDto, SeanceDto } from "@isac-erp/shared";
import { dispatchAutomaticNotification } from "./communicationMessageService.js";

/**
 * Notification automatique de changement d'emploi du temps (voir MODULE-12 §1.10) — séance
 * reportée/annulée/remplacée, tous les étudiants inscrits dans les classes concernées. N'échoue
 * jamais bruyamment.
 */
export async function notifySeanceChanged(seance: SeanceDto): Promise<void> {
  if (seance.classIds.length === 0) return;
  try {
    const [enrollments, campusSettings] = await Promise.all([
      prisma.studentEnrollment.findMany({
        where: { classId: { in: seance.classIds }, cancelledAt: null },
        include: { student: true, class: true, filiere: true },
      }),
      prisma.campusSettings.findFirst(),
    ]);
    if (enrollments.length === 0) return;

    const variables: Record<string, string> = {
      Classe: seance.classNames.join(", "),
      Filière: enrollments[0]?.filiere.name ?? "",
      Campus: campusSettings?.name ?? "",
    };

    const recipients: CommunicationContactDto[] = enrollments.map((e) => ({
      id: `ETUDIANT:${e.student.id}`,
      type: "ETUDIANT" as const,
      lastName: e.student.lastName,
      firstName: e.student.firstName,
      phonePrimary: e.student.phonePrimary,
      phoneSecondary: e.student.phoneSecondary,
      whatsapp: null,
      email: e.student.email,
      campus: campusSettings?.name ?? null,
      className: e.class.name,
      filiereName: e.filiere.name,
      fonction: null,
      statut: "Actif",
    }));

    await dispatchAutomaticNotification("CHANGEMENT_EMPLOI_DU_TEMPS", variables, recipients);
  } catch (err) {
    console.error("Notification automatique de changement d'emploi du temps en échec (non bloquant) :", err);
  }
}
