import { z } from "zod";
import { portalScheduleInputSchema, seanceSchema } from "@isac-erp/shared";
import * as portalTeacherService from "../services/portalTeacherService.js";
import { portalProcedure, router } from "../trpc.js";

/**
 * Portail web — phase 3, lecture seule enseignant (MODULE-15 §1 décision 2/§4 phase 3). Toujours
 * `portalProcedure` (jamais `permissionProcedure`) : la portée vient du `credentialId` de la session.
 */
export const portalTeacherRouter = router({
  schedule: portalProcedure
    .input(portalScheduleInputSchema)
    .output(z.array(seanceSchema))
    .query(({ input, ctx }) => portalTeacherService.getPortalTeacherSchedule(ctx.portalSession.credentialId, input)),
});
