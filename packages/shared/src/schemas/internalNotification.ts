import { z } from "zod";

/** Notification interne — in-app uniquement (voir MODULE-12 §1.10, canal INTERNE). */
export const internalNotificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  isRead: z.boolean(),
  linkType: z.string().nullable(),
  linkId: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type InternalNotificationDto = z.infer<typeof internalNotificationSchema>;

export const listInternalNotificationsInputSchema = z.object({ unreadOnly: z.boolean().optional() });
export type ListInternalNotificationsInput = z.infer<typeof listInternalNotificationsInputSchema>;

export const markInternalNotificationReadInputSchema = z.object({ id: z.string().uuid() });
export type MarkInternalNotificationReadInput = z.infer<typeof markInternalNotificationReadInputSchema>;
