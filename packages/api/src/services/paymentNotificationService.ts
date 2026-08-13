import { prisma } from "@isac-erp/db";
import type { CommunicationContactDto } from "@isac-erp/shared";
import { getStudentFeeSummary } from "./feeSummaryService.js";
import { dispatchAutomaticNotification } from "./communicationMessageService.js";

export interface PaymentNotificationContext {
  studentId: string;
  enrollmentId: string;
  academicYearId: string;
  amount: number;
  receiptNumber: string;
  paymentMethodLabel: string;
  createdAt: Date;
}

/**
 * Règle métier pure (voir MODULE-12 §1.11) : en cas de paiement partiel, le message précise le
 * montant restant à payer ; en cas de paiement complet, il précise que la totalité est soldée.
 */
export function buildSoldeMessage(resteAPayer: number): string {
  return resteAPayer > 0
    ? `Reste à payer : ${resteAPayer.toLocaleString("fr-FR")} GNF.`
    : "Totalité des frais de scolarité soldée.";
}

/**
 * Notification automatique de paiement — fonction obligatoire du chapitre (voir MODULE-12 §1.11).
 * Envoyée simultanément à l'étudiant et à tous ses tuteurs marqués contact principal (§6 point 6),
 * jamais avant l'émission du reçu (règle §3 point 2). N'échoue jamais bruyamment : le paiement reste
 * valide même si la notification échoue (règle §3 point 1) — voir dispatchAutomaticNotification.
 */
export async function notifyPayment(ctx: PaymentNotificationContext): Promise<void> {
  try {
    await notifyPaymentUnsafe(ctx);
  } catch (err) {
    console.error("Notification automatique de paiement en échec (non bloquant) :", err);
  }
}

async function notifyPaymentUnsafe(ctx: PaymentNotificationContext): Promise<void> {
  const [student, enrollment, academicYear, campusSettings, feeSummary, guardianLinks] = await Promise.all([
    prisma.student.findUniqueOrThrow({ where: { id: ctx.studentId } }),
    prisma.studentEnrollment.findUniqueOrThrow({
      where: { id: ctx.enrollmentId },
      include: { class: true, filiere: true },
    }),
    prisma.academicYear.findUniqueOrThrow({ where: { id: ctx.academicYearId } }),
    prisma.campusSettings.findFirst(),
    getStudentFeeSummary({ studentId: ctx.studentId, academicYearId: ctx.academicYearId }),
    prisma.studentGuardian.findMany({
      where: { studentId: ctx.studentId, isPrimaryContact: true },
      include: { guardian: true },
    }),
  ]);

  const resteAPayer = Math.max(0, feeSummary.totalRemaining);
  const soldeMessage = buildSoldeMessage(resteAPayer);

  const variables: Record<string, string> = {
    Nom: student.lastName,
    Prénom: student.firstName,
    Classe: enrollment.class.name,
    Filière: enrollment.filiere.name,
    Campus: campusSettings?.name ?? "",
    Montant: ctx.amount.toLocaleString("fr-FR"),
    Date: ctx.createdAt.toLocaleDateString("fr-FR"),
    Heure: ctx.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    NuméroReçu: ctx.receiptNumber,
    MontantTotal: feeSummary.totalNet.toLocaleString("fr-FR"),
    MontantPayé: feeSummary.totalPaid.toLocaleString("fr-FR"),
    ResteÀPayer: resteAPayer.toLocaleString("fr-FR"),
    AnnéeUniversitaire: academicYear.label,
    ModePaiement: ctx.paymentMethodLabel,
    SoldeMessage: soldeMessage,
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
      className: enrollment.class.name,
      filiereName: enrollment.filiere.name,
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
      className: enrollment.class.name,
      filiereName: enrollment.filiere.name,
      fonction: link.guardian.profession,
      statut: "Actif",
    })),
  ];

  await dispatchAutomaticNotification("PAIEMENT_SCOLARITE", variables, recipients);
}
