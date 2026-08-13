import { prisma } from "@isac-erp/db";
import type { CommunicationContactDto } from "@isac-erp/shared";
import { dispatchAutomaticNotification } from "./communicationMessageService.js";

/**
 * Notification automatique à la disponibilité d'un bulletin (voir MODULE-12 §1.10). Couvre à la
 * fois "Bulletin disponible" et "Nouvelle note" du chapitre — fusionnés : notifié seulement quand
 * les notes deviennent définitives (verrouillage à la génération du bulletin), pas à chaque saisie
 * individuelle (voir MODULE-12 §6 point 4). N'échoue jamais bruyamment.
 */
export async function notifyBulletinDisponible(
  studentId: string,
  classLabel: string,
  filiereLabel: string | null
): Promise<void> {
  try {
    const [student, campusSettings] = await Promise.all([
      prisma.student.findUniqueOrThrow({ where: { id: studentId } }),
      prisma.campusSettings.findFirst(),
    ]);

    const variables: Record<string, string> = {
      Nom: student.lastName,
      Prénom: student.firstName,
      Classe: classLabel,
      Filière: filiereLabel ?? "",
      Campus: campusSettings?.name ?? "",
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
        className: classLabel,
        filiereName: filiereLabel,
        fonction: null,
        statut: "Actif",
      },
    ];

    await dispatchAutomaticNotification("BULLETIN_DISPONIBLE", variables, recipients);
  } catch (err) {
    console.error("Notification automatique de bulletin en échec (non bloquant) :", err);
  }
}
