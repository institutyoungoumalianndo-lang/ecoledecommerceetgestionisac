import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  chartAccountSchema,
  createChartAccountInputSchema,
  listChartAccountsInputSchema,
  updateChartAccountInputSchema,
} from "@isac-erp/shared";
import * as chartAccountService from "../services/chartAccountService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const chartAccountsRouter = router({
  list: permissionProcedure("COMPTABILITE:LECTURE")
    .input(listChartAccountsInputSchema)
    .output(z.array(chartAccountSchema))
    .query(({ input }) => chartAccountService.listChartAccounts(input)),

  create: permissionProcedure("COMPTABILITE:CREATION")
    .input(createChartAccountInputSchema)
    .output(chartAccountSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const account = await chartAccountService.createChartAccount(input);
        await logAction({
          userId: ctx.session.userId,
          action: "CHART_ACCOUNT_CREATE",
          module: "COMPTABILITE",
          entityType: "ChartAccount",
          entityId: account.id,
          result: "SUCCES",
          details: { code: account.code, label: account.label, type: account.type },
          ipAddress: ctx.ipAddress,
        });
        return account;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Création du compte impossible.",
        });
      }
    }),

  update: permissionProcedure("COMPTABILITE:MODIFICATION")
    .input(updateChartAccountInputSchema)
    .output(chartAccountSchema)
    .mutation(async ({ input, ctx }) => {
      const account = await chartAccountService.updateChartAccount(input);
      await logAction({
        userId: ctx.session.userId,
        action: "CHART_ACCOUNT_UPDATE",
        module: "COMPTABILITE",
        entityType: "ChartAccount",
        entityId: account.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return account;
    }),

  deactivate: permissionProcedure("COMPTABILITE:SUPPRESSION")
    .input(z.object({ id: z.string().uuid() }))
    .output(chartAccountSchema)
    .mutation(async ({ input, ctx }) => {
      const account = await chartAccountService.deactivateChartAccount(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "CHART_ACCOUNT_DEACTIVATE",
        module: "COMPTABILITE",
        entityType: "ChartAccount",
        entityId: account.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return account;
    }),

  reactivate: permissionProcedure("COMPTABILITE:MODIFICATION")
    .input(z.object({ id: z.string().uuid() }))
    .output(chartAccountSchema)
    .mutation(async ({ input, ctx }) => {
      const account = await chartAccountService.reactivateChartAccount(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "CHART_ACCOUNT_REACTIVATE",
        module: "COMPTABILITE",
        entityType: "ChartAccount",
        entityId: account.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return account;
    }),
});
