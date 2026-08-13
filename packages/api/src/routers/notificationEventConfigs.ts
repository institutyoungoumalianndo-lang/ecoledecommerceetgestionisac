import { z } from "zod";
import { notificationEventConfigSchema, updateNotificationEventConfigInputSchema } from "@isac-erp/shared";
import * as notificationEventConfigService from "../services/notificationEventConfigService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const notificationEventConfigsRouter = router({
  list: permissionProcedure("PARAMETRES_COMMUNICATION:LECTURE")
    .output(z.array(notificationEventConfigSchema))
    .query(() => notificationEventConfigService.listNotificationEventConfigs()),

  update: permissionProcedure("PARAMETRES_COMMUNICATION:MODIFICATION")
    .input(updateNotificationEventConfigInputSchema)
    .output(notificationEventConfigSchema)
    .mutation(async ({ input, ctx }) => {
      const config = await notificationEventConfigService.updateNotificationEventConfig(input);
      await logAction({
        userId: ctx.session.userId,
        action: "NOTIFICATION_EVENT_CONFIG_UPDATE",
        module: "PARAMETRES_COMMUNICATION",
        entityType: "NotificationEventConfig",
        entityId: config.id,
        result: "SUCCES",
        details: { eventType: config.eventType, channels: config.channels, isActive: config.isActive },
        ipAddress: ctx.ipAddress,
      });
      return config;
    }),
});
