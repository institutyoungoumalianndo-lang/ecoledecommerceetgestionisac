import {
  confirmTwoFactorSetupInputSchema,
  disableTwoFactorInputSchema,
  twoFactorBackupCodesSchema,
  twoFactorSetupSchema,
  twoFactorStatusSchema,
} from "@isac-erp/shared";
import * as twoFactorService from "../services/twoFactorService.js";
import { logAction } from "../services/auditService.js";
import { protectedProcedure, router } from "../trpc.js";

/** Double authentification (MODULE-11 §1.2) — toujours en libre-service sur le compte de l'appelant. */
export const twoFactorRouter = router({
  status: protectedProcedure.output(twoFactorStatusSchema).query(({ ctx }) => twoFactorService.getTwoFactorStatus(ctx.session.userId)),

  startSetup: protectedProcedure.output(twoFactorSetupSchema).mutation(({ ctx }) =>
    twoFactorService.startTwoFactorSetup(ctx.session.userId)
  ),

  confirmSetup: protectedProcedure
    .input(confirmTwoFactorSetupInputSchema)
    .output(twoFactorBackupCodesSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await twoFactorService.confirmTwoFactorSetup(ctx.session.userId, input.code);
      await logAction({
        userId: ctx.session.userId,
        action: "TWO_FACTOR_ENABLED",
        module: "IDENTITE",
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return result;
    }),

  disable: protectedProcedure.input(disableTwoFactorInputSchema).mutation(async ({ input, ctx }) => {
    await twoFactorService.disableTwoFactor(ctx.session.userId, input.password);
    await logAction({
      userId: ctx.session.userId,
      action: "TWO_FACTOR_DISABLED",
      module: "IDENTITE",
      result: "SUCCES",
      ipAddress: ctx.ipAddress,
    });
    return { success: true };
  }),
});
