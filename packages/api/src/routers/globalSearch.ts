import { globalSearchInputSchema, globalSearchResultSchema } from "@isac-erp/shared";
import * as globalSearchService from "../services/globalSearchService.js";
import { hasPermission } from "../security/authorization.js";
import { protectedProcedure, router } from "../trpc.js";

/**
 * Recherche globale (refonte UI/UX, phase finale, 2026-07-30) — même principe que
 * `homeDashboard.get` : une seule procédure `protectedProcedure`, chaque catégorie gérée
 * individuellement par permission, jamais de donnée calculée puis simplement masquée côté client.
 */
export const globalSearchRouter = router({
  search: protectedProcedure
    .input(globalSearchInputSchema)
    .output(globalSearchResultSchema)
    .query(({ input, ctx }) => {
      const { roleCode, permissionCodes } = ctx.session;
      const can = (permission: Parameters<typeof hasPermission>[2]) => hasPermission(roleCode, permissionCodes, permission);

      return globalSearchService.globalSearch(input.query, {
        students: can("ETUDIANTS:LECTURE"),
        teachers: can("ENSEIGNANTS:LECTURE"),
        classes: can("CLASSES:LECTURE"),
        filieres: can("FILIERES:LECTURE"),
        documents: can("DOCUMENTS:LECTURE"),
        payments: can("PAIEMENTS:LECTURE"),
      });
    }),
});
