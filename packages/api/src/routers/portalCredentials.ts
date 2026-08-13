import { z } from "zod";
import {
  createPortalCredentialInputSchema,
  createPortalCredentialOutputSchema,
  portalCredentialSchema,
  setPortalCredentialActiveInputSchema,
} from "@isac-erp/shared";
import * as portalCredentialService from "../services/portalCredentialService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

/**
 * Gestion des comptes portail côté personnel (MODULE-15 §2.2) — création/liste/activation,
 * distincte de `portalAuthRouter` (public, jamais gardé par une permission RBAC).
 */
export const portalCredentialsRouter = router({
  list: permissionProcedure("PORTAIL_WEB:LECTURE")
    .output(z.array(portalCredentialSchema))
    .query(() => portalCredentialService.listPortalCredentials()),

  create: permissionProcedure("PORTAIL_WEB:CREATION")
    .input(createPortalCredentialInputSchema)
    .output(createPortalCredentialOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await portalCredentialService.createPortalCredential(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "PORTAL_CREDENTIAL_CREATE",
        module: "PORTAIL_WEB",
        entityType: "PortalCredential",
        entityId: result.credential.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
        details: { channel: input.channel, principalType: result.credential.principalType },
      });
      return result;
    }),

  setActive: permissionProcedure("PORTAIL_WEB:ADMINISTRATION")
    .input(setPortalCredentialActiveInputSchema)
    .output(portalCredentialSchema)
    .mutation(async ({ input, ctx }) => {
      const credential = await portalCredentialService.setPortalCredentialActive(input);
      await logAction({
        userId: ctx.session.userId,
        action: input.isActive ? "PORTAL_CREDENTIAL_ACTIVATE" : "PORTAL_CREDENTIAL_DEACTIVATE",
        module: "PORTAIL_WEB",
        entityType: "PortalCredential",
        entityId: credential.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return credential;
    }),
});
