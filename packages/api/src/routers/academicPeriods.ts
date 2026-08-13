import { z } from "zod";
import {
  academicPeriodSchema,
  createAcademicPeriodInputSchema,
  updateAcademicPeriodInputSchema,
} from "@isac-erp/shared";
import * as academicPeriodService from "../services/academicPeriodService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const academicPeriodsRouter = router({
  list: permissionProcedure("ANNEES:LECTURE")
    .input(z.object({ academicYearId: z.string().uuid().optional() }))
    .output(z.array(academicPeriodSchema))
    .query(({ input }) => academicPeriodService.listAcademicPeriods(input.academicYearId)),

  create: permissionProcedure("ANNEES:MODIFICATION")
    .input(createAcademicPeriodInputSchema)
    .output(academicPeriodSchema)
    .mutation(async ({ input, ctx }) => {
      const period = await academicPeriodService.createAcademicPeriod(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ACADEMIC_PERIOD_CREATE",
        module: "PARAMETRES",
        entityType: "AcademicPeriod",
        entityId: period.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return period;
    }),

  update: permissionProcedure("ANNEES:MODIFICATION")
    .input(updateAcademicPeriodInputSchema)
    .output(academicPeriodSchema)
    .mutation(async ({ input, ctx }) => {
      const period = await academicPeriodService.updateAcademicPeriod(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ACADEMIC_PERIOD_UPDATE",
        module: "PARAMETRES",
        entityType: "AcademicPeriod",
        entityId: period.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return period;
    }),

  delete: permissionProcedure("ANNEES:MODIFICATION")
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await academicPeriodService.deleteAcademicPeriod(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "ACADEMIC_PERIOD_DELETE",
        module: "PARAMETRES",
        entityType: "AcademicPeriod",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return { success: true };
    }),
});
