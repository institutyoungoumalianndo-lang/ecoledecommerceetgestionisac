import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { PermissionCode } from "@isac-erp/shared";
import { hasPermission } from "./security/authorization.js";
import type { Context } from "./context.js";

// superjson : sans transformer, les Date traversent le JSON en string et le
// typage client (basé sur les schémas Zod, qui déclarent Date) ne correspond
// plus à la valeur réelle reçue. Le même transformer doit être configuré
// côté client (apps/desktop/src/renderer/src/lib/trpc.ts).
const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Exige une session valide. Le Super Administrateur n'a pas de traitement
 * spécial ici — seulement dans `permissionProcedure`, où il court-circuite
 * la vérification de permission (voir MODULE-01 §3.3).
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Session invalide ou expirée." });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

/**
 * Exige une session valide ET la permission donnée — vérifiée côté serveur
 * pour CHAQUE appel, jamais seulement masquée côté UI (principe non
 * négociable n°1 de docs/ARCHITECTURE_MASTER.md).
 */
export function permissionProcedure(permission: PermissionCode) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!hasPermission(ctx.session.roleCode, ctx.session.permissionCodes, permission)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Action non autorisée." });
    }
    return next();
  });
}

/**
 * Exige une session portail valide (MODULE-15 §3) — jamais de vérification RBAC ici, la portée à
 * chaque enregistrement précis (un étudiant ne voit que ses propres données) est appliquée dans les
 * services eux-mêmes, pas via une permission.
 */
export const portalProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.portalSession) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Session invalide ou expirée." });
  }
  return next({ ctx: { ...ctx, portalSession: ctx.portalSession } });
});
