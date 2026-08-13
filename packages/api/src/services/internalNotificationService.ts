import { prisma } from "@isac-erp/db";
import type { InternalNotificationDto, ListInternalNotificationsInput } from "@isac-erp/shared";

/** Notification interne — in-app uniquement (voir MODULE-12 §1.10, canal INTERNE). */
export async function createInternalNotification(
  userId: string,
  title: string,
  content: string,
  link?: { type: string; id: string }
): Promise<void> {
  await prisma.internalNotification.create({
    data: { userId, title, content, linkType: link?.type ?? null, linkId: link?.id ?? null },
  });
}

export async function listInternalNotifications(
  userId: string,
  input: ListInternalNotificationsInput
): Promise<InternalNotificationDto[]> {
  return prisma.internalNotification.findMany({
    where: { userId, isRead: input.unreadOnly ? false : undefined },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function markInternalNotificationRead(id: string, userId: string): Promise<void> {
  await prisma.internalNotification.updateMany({ where: { id, userId }, data: { isRead: true } });
}

/** Centre de notifications (refonte UI/UX, phase finale, 2026-07-30) — "Tout marquer comme lu". */
export async function markAllInternalNotificationsRead(userId: string): Promise<void> {
  await prisma.internalNotification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
