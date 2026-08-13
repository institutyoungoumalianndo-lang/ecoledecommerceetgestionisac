import { z } from "zod";
import {
  bulletinAnnuelSchema,
  bulletinPeriodeSchema,
  portalGuardianChildIdInputSchema,
  portalGuardianChildScheduleInputSchema,
  portalGuardianChildSchema,
  portalStudentFeeSummarySchema,
  portalStudentNoteSchema,
  seanceSchema,
} from "@isac-erp/shared";
import * as portalGuardianService from "../services/portalGuardianService.js";
import { portalProcedure, router } from "../trpc.js";

/**
 * Portail web — phase 3, lecture seule tuteur/parent (MODULE-15 §1 décision 2/§4 phase 3). Toujours
 * `portalProcedure` (jamais `permissionProcedure`) : la portée vient du `credentialId` de la session,
 * l'enfant demandé est systématiquement revérifié côté service contre les enfants réels du tuteur.
 */
export const portalGuardianRouter = router({
  children: portalProcedure
    .output(z.array(portalGuardianChildSchema))
    .query(({ ctx }) => portalGuardianService.listPortalGuardianChildren(ctx.portalSession.credentialId)),

  schedule: portalProcedure
    .input(portalGuardianChildScheduleInputSchema)
    .output(z.array(seanceSchema))
    .query(({ input, ctx }) =>
      portalGuardianService.getPortalGuardianChildSchedule(ctx.portalSession.credentialId, input.studentId, input)
    ),

  notes: portalProcedure
    .input(portalGuardianChildIdInputSchema)
    .output(z.array(portalStudentNoteSchema))
    .query(({ input, ctx }) =>
      portalGuardianService.getPortalGuardianChildNotes(ctx.portalSession.credentialId, input.studentId)
    ),

  bulletins: portalProcedure
    .input(portalGuardianChildIdInputSchema)
    .output(z.object({ periode: z.array(bulletinPeriodeSchema), annuel: z.array(bulletinAnnuelSchema) }))
    .query(({ input, ctx }) =>
      portalGuardianService.getPortalGuardianChildBulletins(ctx.portalSession.credentialId, input.studentId)
    ),

  feeSummary: portalProcedure
    .input(portalGuardianChildIdInputSchema)
    .output(portalStudentFeeSummarySchema)
    .query(({ input, ctx }) =>
      portalGuardianService.getPortalGuardianChildFeeSummary(ctx.portalSession.credentialId, input.studentId)
    ),
});
