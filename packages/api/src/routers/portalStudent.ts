import { z } from "zod";
import {
  bulletinAnnuelSchema,
  bulletinPeriodeSchema,
  portalScheduleInputSchema,
  portalStudentFeeSummarySchema,
  portalStudentNoteSchema,
  seanceSchema,
} from "@isac-erp/shared";
import * as portalStudentService from "../services/portalStudentService.js";
import { portalProcedure, router } from "../trpc.js";

/**
 * Portail web — phase 2, lecture seule étudiant (MODULE-15 §1 décision 2/§4 phase 2). Toujours
 * `portalProcedure` (jamais `permissionProcedure`) : la portée vient du `credentialId` de la session,
 * résolu et vérifié dans `portalStudentService`, pas d'une permission RBAC.
 */
export const portalStudentRouter = router({
  schedule: portalProcedure
    .input(portalScheduleInputSchema)
    .output(z.array(seanceSchema))
    .query(({ input, ctx }) => portalStudentService.getPortalStudentSchedule(ctx.portalSession.credentialId, input)),

  notes: portalProcedure
    .output(z.array(portalStudentNoteSchema))
    .query(({ ctx }) => portalStudentService.getPortalStudentNotes(ctx.portalSession.credentialId)),

  bulletins: portalProcedure
    .output(z.object({ periode: z.array(bulletinPeriodeSchema), annuel: z.array(bulletinAnnuelSchema) }))
    .query(({ ctx }) => portalStudentService.getPortalStudentBulletins(ctx.portalSession.credentialId)),

  feeSummary: portalProcedure
    .output(portalStudentFeeSummarySchema)
    .query(({ ctx }) => portalStudentService.getPortalStudentFeeSummary(ctx.portalSession.credentialId)),
});
