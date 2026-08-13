import {
  portalChangePasswordInputSchema,
  portalLoginInputSchema,
  portalLoginOutputSchema,
  portalSessionInfoSchema,
} from "@isac-erp/shared";
import * as portalAuthService from "../services/portalAuthService.js";
import { portalProcedure, publicProcedure, router } from "../trpc.js";

/**
 * Authentification du portail web (MODULE-15 §3) — jamais de `permissionProcedure` ici : les
 * identités externes (étudiant/tuteur/enseignant) n'ont pas de rôle RBAC, voir `portalProcedure`.
 */
export const portalAuthRouter = router({
  login: publicProcedure
    .input(portalLoginInputSchema)
    .output(portalLoginOutputSchema)
    .mutation(({ input, ctx }) => portalAuthService.portalLogin(input, ctx.ipAddress)),

  logout: portalProcedure.mutation(({ ctx }) => {
    if (!ctx.sessionToken) return;
    return portalAuthService.portalLogout(ctx.sessionToken);
  }),

  me: portalProcedure
    .output(portalSessionInfoSchema)
    .query(({ ctx }) => portalAuthService.getPortalSessionInfo(ctx.portalSession.credentialId)),

  changePassword: portalProcedure
    .input(portalChangePasswordInputSchema)
    .mutation(({ input, ctx }) => portalAuthService.portalChangePassword(ctx.portalSession.credentialId, input)),
});
