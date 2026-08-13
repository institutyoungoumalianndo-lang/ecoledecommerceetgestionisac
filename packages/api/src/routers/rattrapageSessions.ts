import {
  deleteRattrapageSessionInputSchema,
  echecMatiereSchema,
  getEchecsRattrapageInputSchema,
  rattrapageSessionSchema,
  upsertRattrapageSessionInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as rattrapageService from "../services/rattrapageService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const rattrapageSessionsRouter = router({
  getEchecs: permissionProcedure("SESSIONNAIRES:LECTURE")
    .input(getEchecsRattrapageInputSchema)
    .output(z.array(echecMatiereSchema))
    .query(({ input }) => rattrapageService.getEchecsRattrapage(input)),

  upsertSession: permissionProcedure("SESSIONNAIRES:CREATION")
    .input(upsertRattrapageSessionInputSchema)
    .output(rattrapageSessionSchema)
    .mutation(async ({ input, ctx }) => {
      const session = await rattrapageService.upsertRattrapageSession(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "SESSIONNAIRE_SESSION_PROGRAMMEE",
        module: "SESSIONNAIRES",
        entityType: "RattrapageSession",
        entityId: session.id,
        result: "SUCCES",
        details: { filiereId: input.filiereId, levelId: input.levelId, academicYearId: input.academicYearId, subjectId: input.subjectId },
        ipAddress: ctx.ipAddress,
      });
      return session;
    }),

  deleteSession: permissionProcedure("SESSIONNAIRES:SUPPRESSION")
    .input(deleteRattrapageSessionInputSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      await rattrapageService.deleteRattrapageSession(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "SESSIONNAIRE_SESSION_SUPPRESSION",
        module: "SESSIONNAIRES",
        entityType: "RattrapageSession",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
    }),
});
