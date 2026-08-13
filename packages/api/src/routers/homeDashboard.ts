import { homeDashboardSchema } from "@isac-erp/shared";
import * as homeDashboardService from "../services/homeDashboardService.js";
import { hasPermission } from "../security/authorization.js";
import { protectedProcedure, router } from "../trpc.js";

/**
 * Tableau de bord d'accueil unifié — refonte UI/UX Phase 3 (2026-07-30). Une
 * seule procédure `protectedProcedure` (session valide requise, pas de
 * permission unique) car chaque section est indépendamment gérée par
 * permission ci-dessous — jamais de donnée calculée puis simplement masquée
 * côté client (principe non négociable n°1 de docs/ARCHITECTURE_MASTER.md).
 */
export const homeDashboardRouter = router({
  get: protectedProcedure.output(homeDashboardSchema).query(({ ctx }) => {
    const { roleCode, permissionCodes, userId } = ctx.session;
    const can = (permission: Parameters<typeof hasPermission>[2]) => hasPermission(roleCode, permissionCodes, permission);

    return homeDashboardService.getHomeDashboard(userId, {
      students: can("ETUDIANTS:LECTURE"),
      enrollments: can("INSCRIPTIONS:LECTURE"),
      payments: can("PAIEMENTS:LECTURE"),
      finance: can("RAPPORTS_FINANCIERS:LECTURE"),
      teachers: can("ENSEIGNANTS:LECTURE"),
      pedagogical: can("MATIERES:LECTURE"),
      timetable: can("EMPLOI_DU_TEMPS:LECTURE"),
      evaluation: can("NOTES:LECTURE"),
      communication: can("COMMUNICATION:LECTURE"),
      documents: can("DOCUMENTS:LECTURE"),
    });
  }),
});
