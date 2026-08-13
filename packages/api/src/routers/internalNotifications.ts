import { z } from "zod";
import {
  internalNotificationSchema,
  listInternalNotificationsInputSchema,
  markInternalNotificationReadInputSchema,
} from "@isac-erp/shared";
import * as internalNotificationService from "../services/internalNotificationService.js";
import { protectedProcedure, router } from "../trpc.js";

/** Boîte personnelle — accessible à tout utilisateur connecté sur ses propres notifications, aucune
 * permission dédiée (comme la cloche de tout ERP, indépendante des droits du module Communication). */
export const internalNotificationsRouter = router({
  list: protectedProcedure
    .input(listInternalNotificationsInputSchema)
    .output(z.array(internalNotificationSchema))
    .query(({ input, ctx }) => internalNotificationService.listInternalNotifications(ctx.session.userId, input)),

  markRead: protectedProcedure
    .input(markInternalNotificationReadInputSchema)
    .mutation(({ input, ctx }) => internalNotificationService.markInternalNotificationRead(input.id, ctx.session.userId)),

  markAllRead: protectedProcedure.mutation(({ ctx }) =>
    internalNotificationService.markAllInternalNotificationsRead(ctx.session.userId)
  ),
});
