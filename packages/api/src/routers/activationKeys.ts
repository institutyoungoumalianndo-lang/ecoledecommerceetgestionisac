import { TRPCError } from "@trpc/server";
import {
  activationKeyDtoSchema,
  generateActivationKeysInputSchema,
  loginOutputSchema,
  redeemActivationKeyInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as activationKeyService from "../services/activationKeyService.js";
import * as authService from "../services/authService.js";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";

/**
 * Clés d'activation d'installation (2026-08-10, ADR-054) — génération/liste/révocation réservées au
 * Super Administrateur (vérifié dans `activationKeyService`, défense en profondeur comme
 * `createPortalSsoToken`) ; `redeem` est public — c'est justement le point d'entrée avant toute
 * session, au tout premier lancement d'un poste.
 */
export const activationKeysRouter = router({
  generate: protectedProcedure
    .input(generateActivationKeysInputSchema)
    .output(z.array(activationKeyDtoSchema))
    .mutation(async ({ input, ctx }) => {
      try {
        return await activationKeyService.generateActivationKeys(input, ctx.session.userId, ctx.session.roleCode);
      } catch (error) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: error instanceof Error ? error.message : "Action non autorisée.",
        });
      }
    }),

  list: protectedProcedure.output(z.array(activationKeyDtoSchema)).query(async ({ ctx }) => {
    try {
      return await activationKeyService.listActivationKeys(ctx.session.roleCode);
    } catch (error) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: error instanceof Error ? error.message : "Action non autorisée.",
      });
    }
  }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await activationKeyService.revokeActivationKey(input.id, ctx.session.roleCode);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: error instanceof Error ? error.message : "Action non autorisée.",
        });
      }
    }),

  redeem: publicProcedure
    .input(redeemActivationKeyInputSchema)
    .output(loginOutputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await authService.redeemActivationKey(input, { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Clé d'activation invalide.",
        });
      }
    }),
});
