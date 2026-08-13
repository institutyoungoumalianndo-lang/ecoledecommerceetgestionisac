import { z } from "zod";
import {
  academicYearIdInputSchema,
  academicYearSchema,
  createAcademicYearInputSchema,
  updateAcademicYearInputSchema,
} from "@isac-erp/shared";
import * as academicYearService from "../services/academicYearService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const academicYearsRouter = router({
  list: permissionProcedure("ANNEES:LECTURE")
    .output(z.array(academicYearSchema))
    .query(() => academicYearService.listAcademicYears()),

  create: permissionProcedure("ANNEES:CREATION")
    .input(createAcademicYearInputSchema)
    .output(academicYearSchema)
    .mutation(async ({ input, ctx }) => {
      const year = await academicYearService.createAcademicYear(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ACADEMIC_YEAR_CREATE",
        module: "PARAMETRES",
        entityType: "AcademicYear",
        entityId: year.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return year;
    }),

  update: permissionProcedure("ANNEES:MODIFICATION")
    .input(updateAcademicYearInputSchema)
    .output(academicYearSchema)
    .mutation(async ({ input, ctx }) => {
      const year = await academicYearService.updateAcademicYear(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ACADEMIC_YEAR_UPDATE",
        module: "PARAMETRES",
        entityType: "AcademicYear",
        entityId: year.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return year;
    }),

  activate: permissionProcedure("ANNEES:ADMINISTRATION")
    .input(academicYearIdInputSchema)
    .output(academicYearSchema)
    .mutation(async ({ input, ctx }) => {
      const year = await academicYearService.activateAcademicYear(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "ACADEMIC_YEAR_ACTIVATE",
        module: "PARAMETRES",
        entityType: "AcademicYear",
        entityId: year.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return year;
    }),

  close: permissionProcedure("ANNEES:ADMINISTRATION")
    .input(academicYearIdInputSchema)
    .output(academicYearSchema)
    .mutation(async ({ input, ctx }) => {
      const year = await academicYearService.closeAcademicYear(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "ACADEMIC_YEAR_CLOSE",
        module: "PARAMETRES",
        entityType: "AcademicYear",
        entityId: year.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return year;
    }),

  reopen: permissionProcedure("ANNEES:ADMINISTRATION")
    .input(academicYearIdInputSchema)
    .output(academicYearSchema)
    .mutation(async ({ input, ctx }) => {
      const year = await academicYearService.reopenAcademicYear(input.id, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "ACADEMIC_YEAR_REOPEN",
        module: "PARAMETRES",
        entityType: "AcademicYear",
        entityId: year.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return year;
    }),
});
