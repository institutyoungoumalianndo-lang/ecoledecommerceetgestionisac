import { z } from "zod";

/** Tableau de bord (voir MODULE-12 §1.1). */
export const communicationDashboardSchema = z.object({
  totalContacts: z.number().int(),
  totalStudents: z.number().int(),
  totalGuardians: z.number().int(),
  totalTeachers: z.number().int(),
  totalStaff: z.number().int(),
  smsSent: z.number().int(),
  whatsappSent: z.number().int(),
  emailsSent: z.number().int(),
  campaignsCreated: z.number().int(),
  campaignsScheduled: z.number().int(),
  automaticNotificationsSent: z.number().int(),
  messagesFailed: z.number().int(),
  messagesPending: z.number().int(),
  smsBalance: z.number().nullable(),
});
export type CommunicationDashboardDto = z.infer<typeof communicationDashboardSchema>;
