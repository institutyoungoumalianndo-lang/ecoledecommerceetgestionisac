import { z } from "zod";
import {
  createMessageTemplateInputSchema,
  listMessageTemplatesInputSchema,
  messageTemplateIdInputSchema,
  messageTemplateSchema,
  updateMessageTemplateInputSchema,
} from "@isac-erp/shared";
import * as messageTemplateService from "../services/messageTemplateService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const messageTemplatesRouter = router({
  list: permissionProcedure("MODELES_COMMUNICATION:LECTURE")
    .input(listMessageTemplatesInputSchema)
    .output(z.array(messageTemplateSchema))
    .query(({ input }) => messageTemplateService.listMessageTemplates(input)),

  create: permissionProcedure("MODELES_COMMUNICATION:MODIFICATION")
    .input(createMessageTemplateInputSchema)
    .output(messageTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      const template = await messageTemplateService.createMessageTemplate(input);
      await logAction({
        userId: ctx.session.userId,
        action: "MESSAGE_TEMPLATE_CREATE",
        module: "MODELES_COMMUNICATION",
        entityType: "MessageTemplate",
        entityId: template.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return template;
    }),

  update: permissionProcedure("MODELES_COMMUNICATION:MODIFICATION")
    .input(updateMessageTemplateInputSchema)
    .output(messageTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      const template = await messageTemplateService.updateMessageTemplate(input);
      await logAction({
        userId: ctx.session.userId,
        action: "MESSAGE_TEMPLATE_UPDATE",
        module: "MODELES_COMMUNICATION",
        entityType: "MessageTemplate",
        entityId: template.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return template;
    }),

  delete: permissionProcedure("MODELES_COMMUNICATION:MODIFICATION")
    .input(messageTemplateIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      await messageTemplateService.deleteMessageTemplate(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "MESSAGE_TEMPLATE_DELETE",
        module: "MODELES_COMMUNICATION",
        entityType: "MessageTemplate",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
    }),
});
