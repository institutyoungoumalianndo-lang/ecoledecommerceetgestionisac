import { z } from "zod";
import {
  campaignIdInputSchema,
  campaignSchema,
  createCampaignInputSchema,
  listCampaignsInputSchema,
  updateCampaignInputSchema,
} from "@isac-erp/shared";
import * as campaignService from "../services/campaignService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const campaignsRouter = router({
  list: permissionProcedure("CAMPAGNES:LECTURE")
    .input(listCampaignsInputSchema)
    .output(z.array(campaignSchema))
    .query(({ input }) => campaignService.listCampaigns(input)),

  create: permissionProcedure("CAMPAGNES:CREATION")
    .input(createCampaignInputSchema)
    .output(campaignSchema)
    .mutation(async ({ input, ctx }) => {
      const campaign = await campaignService.createCampaign(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "CAMPAIGN_CREATE",
        module: "CAMPAGNES",
        entityType: "Campaign",
        entityId: campaign.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return campaign;
    }),

  update: permissionProcedure("CAMPAGNES:MODIFICATION")
    .input(updateCampaignInputSchema)
    .output(campaignSchema)
    .mutation(async ({ input, ctx }) => {
      const campaign = await campaignService.updateCampaign(input);
      await logAction({
        userId: ctx.session.userId,
        action: "CAMPAIGN_UPDATE",
        module: "CAMPAGNES",
        entityType: "Campaign",
        entityId: campaign.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return campaign;
    }),

  duplicate: permissionProcedure("CAMPAGNES:MODIFICATION")
    .input(campaignIdInputSchema)
    .output(campaignSchema)
    .mutation(async ({ input, ctx }) => {
      const campaign = await campaignService.duplicateCampaign(input.id, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "CAMPAIGN_DUPLICATE",
        module: "CAMPAGNES",
        entityType: "Campaign",
        entityId: campaign.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return campaign;
    }),

  delete: permissionProcedure("CAMPAGNES:SUPPRESSION")
    .input(campaignIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      await campaignService.deleteCampaign(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "CAMPAIGN_DELETE",
        module: "CAMPAGNES",
        entityType: "Campaign",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
    }),

  schedule: permissionProcedure("CAMPAGNES:VALIDATION")
    .input(campaignIdInputSchema)
    .output(campaignSchema)
    .mutation(async ({ input, ctx }) => {
      const campaign = await campaignService.scheduleCampaign(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "CAMPAIGN_SCHEDULE",
        module: "CAMPAGNES",
        entityType: "Campaign",
        entityId: campaign.id,
        result: "SUCCES",
        details: { status: campaign.status },
        ipAddress: ctx.ipAddress,
      });
      return campaign;
    }),

  suspend: permissionProcedure("CAMPAGNES:VALIDATION")
    .input(campaignIdInputSchema)
    .output(campaignSchema)
    .mutation(async ({ input, ctx }) => {
      const campaign = await campaignService.suspendCampaign(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "CAMPAIGN_SUSPEND",
        module: "CAMPAGNES",
        entityType: "Campaign",
        entityId: campaign.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return campaign;
    }),

  resume: permissionProcedure("CAMPAGNES:VALIDATION")
    .input(campaignIdInputSchema)
    .output(campaignSchema)
    .mutation(async ({ input, ctx }) => {
      const campaign = await campaignService.resumeCampaign(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "CAMPAIGN_RESUME",
        module: "CAMPAGNES",
        entityType: "Campaign",
        entityId: campaign.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return campaign;
    }),
});
