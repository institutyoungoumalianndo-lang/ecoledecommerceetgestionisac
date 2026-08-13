import { TRPCError } from "@trpc/server";
import {
  bootstrapStatusSchema,
  createFirstAdminInputSchema,
  createPortalSsoTokenOutputSchema,
  exchangePortalSsoTokenInputSchema,
  loginInputSchema,
  loginOutputSchema,
  loginResultSchema,
  publicUserSchema,
  verifyTwoFactorInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as authService from "../services/authService.js";
import { getUserById } from "../services/userService.js";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";

export const authRouter = router({
  bootstrapStatus: publicProcedure.output(bootstrapStatusSchema).query(() => {
    return authService.getBootstrapStatus();
  }),

  createFirstAdmin: publicProcedure
    .input(createFirstAdminInputSchema)
    .output(publicUserSchema)
    .mutation(async ({ input, ctx }) => {
      return authService.createFirstAdmin(input, { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });
    }),

  login: publicProcedure
    .input(loginInputSchema)
    .output(loginResultSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await authService.login(input, { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });
      } catch (error) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: error instanceof Error ? error.message : "Échec de connexion.",
        });
      }
    }),

  verifyTwoFactor: publicProcedure
    .input(verifyTwoFactorInputSchema)
    .output(loginOutputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await authService.verifyTwoFactor(input, { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });
      } catch (error) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: error instanceof Error ? error.message : "Code invalide.",
        });
      }
    }),

  verifyAdminCredentials: publicProcedure
    .input(loginInputSchema)
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await authService.verifyAdminCredentials(input, {
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });
      } catch (error) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: error instanceof Error ? error.message : "Accès refusé.",
        });
      }
    }),

  /**
   * Ouverture directe du portail Super Administrateur depuis l'application desktop (2026-08-10,
   * retour du porteur du projet) — voir authService.createPortalSsoToken.
   */
  createPortalSsoToken: protectedProcedure.output(createPortalSsoTokenOutputSchema).mutation(async ({ ctx }) => {
    try {
      return await authService.createPortalSsoToken(ctx.session.userId, ctx.session.roleCode);
    } catch (error) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: error instanceof Error ? error.message : "Accès refusé.",
      });
    }
  }),

  exchangePortalSsoToken: publicProcedure
    .input(exchangePortalSsoTokenInputSchema)
    .output(loginOutputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await authService.exchangePortalSsoToken(input, { ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });
      } catch (error) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: error instanceof Error ? error.message : "Lien invalide.",
        });
      }
    }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.sessionToken) {
      await authService.logout(ctx.sessionToken, ctx.session.userId, {
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    }
    return { success: true };
  }),

  me: protectedProcedure.output(publicUserSchema.nullable()).query(async ({ ctx }) => {
    return getUserById(ctx.session.userId);
  }),
});
