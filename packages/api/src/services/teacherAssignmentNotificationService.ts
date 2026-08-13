import { prisma } from "@isac-erp/db";
import type { CommunicationContactDto, TeacherAssignmentDto } from "@isac-erp/shared";
import { dispatchAutomaticNotification } from "./communicationMessageService.js";

/**
 * Notification automatique de nouvelle affectation pédagogique (2026-08-06, retour du porteur du
 * projet, voir MODULE-12 §1.10) — l'enseignant concerné est notifié dès la création de l'affectation
 * (Module 5). Même principe que `notifySeanceChanged` (seanceNotificationService.ts) : n'échoue jamais
 * bruyamment, appelé en fire-and-forget par teacherAssignmentService.createTeacherAssignment.
 */
export async function notifyTeacherAssignmentCreated(assignment: TeacherAssignmentDto): Promise<void> {
  try {
    const [teacher, campusSettings] = await Promise.all([
      prisma.teacher.findUnique({ where: { id: assignment.teacherId } }),
      prisma.campusSettings.findFirst(),
    ]);
    if (!teacher) return;

    const variables: Record<string, string> = {
      Matière: assignment.subjectName,
      Classe: assignment.className,
      Filière: assignment.filiereName ?? "",
      Campus: campusSettings?.name ?? "",
    };

    const recipients: CommunicationContactDto[] = [
      {
        id: `ENSEIGNANT:${teacher.id}`,
        type: "ENSEIGNANT",
        lastName: teacher.lastName,
        firstName: teacher.firstName,
        phonePrimary: teacher.phonePrimary,
        phoneSecondary: teacher.phoneSecondary,
        whatsapp: null,
        email: teacher.email,
        campus: campusSettings?.name ?? null,
        className: assignment.className,
        filiereName: assignment.filiereName,
        fonction: null,
        statut: "Actif",
      },
    ];

    await dispatchAutomaticNotification("AFFECTATION_ENSEIGNANT_CREEE", variables, recipients);
  } catch (err) {
    console.error("Notification automatique de nouvelle affectation enseignant en échec (non bloquant) :", err);
  }
}
