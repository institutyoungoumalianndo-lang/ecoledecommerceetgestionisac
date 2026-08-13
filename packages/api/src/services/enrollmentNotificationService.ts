import { prisma } from "@isac-erp/db";
import type { CommunicationContactDto, StudentEnrollmentDto } from "@isac-erp/shared";
import { dispatchAutomaticNotification } from "./communicationMessageService.js";

/** Notification automatique à l'inscription validée (voir MODULE-12 §1.10). N'échoue jamais bruyamment. */
export async function notifyEnrollmentValidated(enrollment: StudentEnrollmentDto): Promise<void> {
  try {
    const [student, campusSettings] = await Promise.all([
      prisma.student.findUniqueOrThrow({ where: { id: enrollment.studentId } }),
      prisma.campusSettings.findFirst(),
    ]);

    const variables: Record<string, string> = {
      Nom: student.lastName,
      Prénom: student.firstName,
      Classe: enrollment.className,
      Filière: enrollment.filiereName,
      Campus: campusSettings?.name ?? "",
      AnnéeUniversitaire: enrollment.academicYearLabel,
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
        className: enrollment.className,
        filiereName: enrollment.filiereName,
        fonction: null,
        statut: "Actif",
      },
    ];

    await dispatchAutomaticNotification("INSCRIPTION_VALIDEE", variables, recipients);
  } catch (err) {
    console.error("Notification automatique d'inscription en échec (non bloquant) :", err);
  }
}
