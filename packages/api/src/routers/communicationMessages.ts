import {
  communicationMessageSchema,
  listCommunicationMessagesInputSchema,
  markWhatsAppMessageSentInputSchema,
  sendQuickMessageInputSchema,
  sendQuickMessageResultSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as communicationMessageService from "../services/communicationMessageService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const communicationMessagesRouter = router({
  list: permissionProcedure("COMMUNICATION:LECTURE")
    .input(listCommunicationMessagesInputSchema)
    .output(z.array(communicationMessageSchema))
    .query(({ input }) => communicationMessageService.listCommunicationMessages(input)),

  sendQuick: permissionProcedure("COMMUNICATION:CREATION")
    .input(sendQuickMessageInputSchema)
    .output(sendQuickMessageResultSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await communicationMessageService.sendQuickMessage(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "COMMUNICATION_QUICK_SEND",
        module: "COMMUNICATION",
        entityType: "CommunicationMessage",
        result: "SUCCES",
        details: { channel: input.channel, recipientCount: input.recipientIds.length, sent: result.sent, failed: result.failed },
        ipAddress: ctx.ipAddress,
      });
      return result;
    }),

  markWhatsAppSent: permissionProcedure("COMMUNICATION:CREATION")
    .input(markWhatsAppMessageSentInputSchema)
    .output(communicationMessageSchema)
    .mutation(async ({ input, ctx }) => {
      const message = await communicationMessageService.markWhatsAppMessageSent(input.id, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "COMMUNICATION_WHATSAPP_MARK_SENT",
        module: "COMMUNICATION",
        entityType: "CommunicationMessage",
        entityId: message.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return message;
    }),
});
