import { z } from "zod";
import {
  communicationSettingsSchema,
  createSmsGatewayAccountInputSchema,
  emailGatewaySettingsSchema,
  smsGatewayAccountIdInputSchema,
  smsGatewayAccountSchema,
  testGatewayResultSchema,
  updateCommunicationSettingsInputSchema,
  updateEmailGatewaySettingsInputSchema,
  updateSmsGatewayAccountInputSchema,
  updateWhatsAppGatewaySettingsInputSchema,
  whatsAppGatewaySettingsSchema,
} from "@isac-erp/shared";
import * as gatewaySettingsService from "../services/communicationGatewaySettingsService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const communicationGatewaySettingsRouter = router({
  listSmsAccounts: permissionProcedure("PARAMETRES_COMMUNICATION:LECTURE")
    .output(z.array(smsGatewayAccountSchema))
    .query(() => gatewaySettingsService.listSmsGatewayAccounts()),

  createSmsAccount: permissionProcedure("PARAMETRES_COMMUNICATION:MODIFICATION")
    .input(createSmsGatewayAccountInputSchema)
    .output(smsGatewayAccountSchema)
    .mutation(async ({ input, ctx }) => {
      const account = await gatewaySettingsService.createSmsGatewayAccount(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SMS_GATEWAY_ACCOUNT_CREATE",
        module: "PARAMETRES_COMMUNICATION",
        entityType: "SmsGatewayAccount",
        entityId: account.id,
        result: "SUCCES",
        details: { providerName: input.providerName },
        ipAddress: ctx.ipAddress,
      });
      return account;
    }),

  updateSmsAccount: permissionProcedure("PARAMETRES_COMMUNICATION:MODIFICATION")
    .input(updateSmsGatewayAccountInputSchema)
    .output(smsGatewayAccountSchema)
    .mutation(async ({ input, ctx }) => {
      const account = await gatewaySettingsService.updateSmsGatewayAccount(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SMS_GATEWAY_ACCOUNT_UPDATE",
        module: "PARAMETRES_COMMUNICATION",
        entityType: "SmsGatewayAccount",
        entityId: account.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return account;
    }),

  setDefaultSmsAccount: permissionProcedure("PARAMETRES_COMMUNICATION:MODIFICATION")
    .input(smsGatewayAccountIdInputSchema)
    .output(smsGatewayAccountSchema)
    .mutation(async ({ input, ctx }) => {
      const account = await gatewaySettingsService.setDefaultSmsGatewayAccount(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "SMS_GATEWAY_ACCOUNT_SET_DEFAULT",
        module: "PARAMETRES_COMMUNICATION",
        entityType: "SmsGatewayAccount",
        entityId: account.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return account;
    }),

  deleteSmsAccount: permissionProcedure("PARAMETRES_COMMUNICATION:MODIFICATION")
    .input(smsGatewayAccountIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      await gatewaySettingsService.deleteSmsGatewayAccount(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "SMS_GATEWAY_ACCOUNT_DELETE",
        module: "PARAMETRES_COMMUNICATION",
        entityType: "SmsGatewayAccount",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
    }),

  testSmsAccount: permissionProcedure("PARAMETRES_COMMUNICATION:MODIFICATION")
    .input(smsGatewayAccountIdInputSchema)
    .output(testGatewayResultSchema)
    .mutation(({ input }) => gatewaySettingsService.testSmsGatewayAccount(input.id)),

  getWhatsAppSettings: permissionProcedure("PARAMETRES_COMMUNICATION:LECTURE")
    .output(whatsAppGatewaySettingsSchema)
    .query(() => gatewaySettingsService.getWhatsAppGatewaySettings()),

  updateWhatsAppSettings: permissionProcedure("PARAMETRES_COMMUNICATION:MODIFICATION")
    .input(updateWhatsAppGatewaySettingsInputSchema)
    .output(whatsAppGatewaySettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const settings = await gatewaySettingsService.updateWhatsAppGatewaySettings(input);
      await logAction({
        userId: ctx.session.userId,
        action: "WHATSAPP_GATEWAY_SETTINGS_UPDATE",
        module: "PARAMETRES_COMMUNICATION",
        entityType: "WhatsAppGatewaySettings",
        entityId: settings.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return settings;
    }),

  getEmailSettings: permissionProcedure("PARAMETRES_COMMUNICATION:LECTURE")
    .output(emailGatewaySettingsSchema)
    .query(() => gatewaySettingsService.getEmailGatewaySettings()),

  updateEmailSettings: permissionProcedure("PARAMETRES_COMMUNICATION:MODIFICATION")
    .input(updateEmailGatewaySettingsInputSchema)
    .output(emailGatewaySettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const settings = await gatewaySettingsService.updateEmailGatewaySettings(input);
      await logAction({
        userId: ctx.session.userId,
        action: "EMAIL_GATEWAY_SETTINGS_UPDATE",
        module: "PARAMETRES_COMMUNICATION",
        entityType: "EmailGatewaySettings",
        entityId: settings.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return settings;
    }),

  testEmailSettings: permissionProcedure("PARAMETRES_COMMUNICATION:MODIFICATION")
    .output(testGatewayResultSchema)
    .mutation(() => gatewaySettingsService.testEmailGatewaySettings()),

  getSettings: permissionProcedure("PARAMETRES_COMMUNICATION:LECTURE")
    .output(communicationSettingsSchema)
    .query(() => gatewaySettingsService.getCommunicationSettings()),

  updateSettings: permissionProcedure("PARAMETRES_COMMUNICATION:MODIFICATION")
    .input(updateCommunicationSettingsInputSchema)
    .output(communicationSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const settings = await gatewaySettingsService.updateCommunicationSettings(input);
      await logAction({
        userId: ctx.session.userId,
        action: "COMMUNICATION_SETTINGS_UPDATE",
        module: "PARAMETRES_COMMUNICATION",
        entityType: "CommunicationSettings",
        entityId: settings.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return settings;
    }),
});
