import { prisma } from "@isac-erp/db";
import type { CommunicationDashboardDto } from "@isac-erp/shared";

/** Tableau de bord (voir MODULE-12 §1.1). Compteurs comptés à la demande, jamais stockés en cache. */
export async function getCommunicationDashboard(): Promise<CommunicationDashboardDto> {
  const [
    totalStudents,
    totalGuardians,
    totalTeachers,
    totalStaff,
    smsSent,
    whatsappSent,
    emailsSent,
    campaignsCreated,
    campaignsScheduled,
    automaticNotificationsSent,
    messagesFailed,
    messagesPending,
    defaultSmsAccount,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.guardian.count(),
    prisma.teacher.count(),
    prisma.employee.count(),
    prisma.communicationMessage.count({ where: { channel: "SMS", status: { in: ["ENVOYE", "LIVRE", "LU"] } } }),
    prisma.communicationMessage.count({ where: { channel: "WHATSAPP", status: { in: ["ENVOYE", "LIVRE", "LU"] } } }),
    prisma.communicationMessage.count({ where: { channel: "EMAIL", status: { in: ["ENVOYE", "LIVRE", "LU"] } } }),
    prisma.campaign.count(),
    prisma.campaign.count({ where: { status: "PLANIFIEE" } }),
    prisma.communicationMessage.count({
      where: { campaignId: null, templateId: { not: null }, status: { in: ["ENVOYE", "LIVRE", "LU"] } },
    }),
    prisma.communicationMessage.count({ where: { status: "ECHOUE" } }),
    prisma.communicationMessage.count({ where: { status: "EN_ATTENTE" } }),
    prisma.smsGatewayAccount.findFirst({ where: { isDefault: true } }),
  ]);

  return {
    totalContacts: totalStudents + totalGuardians + totalTeachers + totalStaff,
    totalStudents,
    totalGuardians,
    totalTeachers,
    totalStaff,
    smsSent,
    whatsappSent,
    emailsSent,
    campaignsCreated,
    campaignsScheduled,
    automaticNotificationsSent,
    messagesFailed,
    messagesPending,
    smsBalance: defaultSmsAccount?.balance !== undefined && defaultSmsAccount?.balance !== null ? Number(defaultSmsAccount.balance) : null,
  };
}
