import { z } from "zod";
import {
  checkSeanceConflictsInputSchema,
  checkSeanceConflictsResultSchema,
  closeMonthlyTimesheetInputSchema,
  createSeanceInputSchema,
  getMonthlyTimesheetInputSchema,
  getPayrollControlSummaryInputSchema,
  listMonthlyTimesheetsInputSchema,
  listSeancesInputSchema,
  openMonthlyTimesheetInputSchema,
  payrollControlSummarySchema,
  qualifySeanceInputSchema,
  qualifySeancesBulkInputSchema,
  qualifySeancesBulkResultSchema,
  saveMonthlyPointageInputSchema,
  seanceIdInputSchema,
  seanceSchema,
  teacherMonthlyTimesheetSchema,
  updateSeanceInputSchema,
} from "@isac-erp/shared";
import * as seanceService from "../services/seanceService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const seancesRouter = router({
  list: permissionProcedure("EMPLOI_DU_TEMPS:LECTURE")
    .input(listSeancesInputSchema)
    .output(z.array(seanceSchema))
    .query(({ input }) => seanceService.listSeances(input)),

  checkConflicts: permissionProcedure("EMPLOI_DU_TEMPS:LECTURE")
    .input(checkSeanceConflictsInputSchema)
    .output(checkSeanceConflictsResultSchema)
    .query(({ input }) => seanceService.checkSeanceConflicts(input)),

  create: permissionProcedure("EMPLOI_DU_TEMPS:MODIFICATION")
    .input(createSeanceInputSchema)
    .output(seanceSchema)
    .mutation(async ({ input, ctx }) => {
      const seance = await seanceService.createSeance(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SEANCE_CREATE",
        module: "EMPLOI_DU_TEMPS",
        entityType: "Seance",
        entityId: seance.id,
        result: "SUCCES",
        details: { teacherId: input.teacherId, sessionDate: input.sessionDate, classIds: input.classIds },
        ipAddress: ctx.ipAddress,
      });
      return seance;
    }),

  update: permissionProcedure("EMPLOI_DU_TEMPS:MODIFICATION")
    .input(updateSeanceInputSchema)
    .output(seanceSchema)
    .mutation(async ({ input, ctx }) => {
      const seance = await seanceService.updateSeance(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SEANCE_UPDATE",
        module: "EMPLOI_DU_TEMPS",
        entityType: "Seance",
        entityId: seance.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return seance;
    }),

  qualify: permissionProcedure("POINTAGE:VALIDATION")
    .input(qualifySeanceInputSchema)
    .output(seanceSchema)
    .mutation(async ({ input, ctx }) => {
      const seance = await seanceService.qualifySeance(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "SEANCE_QUALIFY",
        module: "POINTAGE",
        entityType: "Seance",
        entityId: seance.id,
        result: "SUCCES",
        details: { status: input.status, reason: input.reason ?? null },
        ipAddress: ctx.ipAddress,
      });
      return seance;
    }),

  qualifyBulk: permissionProcedure("POINTAGE:VALIDATION")
    .input(qualifySeancesBulkInputSchema)
    .output(qualifySeancesBulkResultSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await seanceService.qualifySeancesBulk(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "SEANCE_QUALIFY_BULK",
        module: "POINTAGE",
        entityType: "Seance",
        result: "SUCCES",
        details: { requested: input.ids.length, qualified: result.qualifiedCount },
        ipAddress: ctx.ipAddress,
      });
      return result;
    }),

  saveMonthlyPointage: permissionProcedure("POINTAGE:VALIDATION")
    .input(saveMonthlyPointageInputSchema)
    .output(teacherMonthlyTimesheetSchema)
    .mutation(async ({ input, ctx }) => {
      const timesheet = await seanceService.saveMonthlyPointage(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "POINTAGE_GRID_SAVE",
        module: "POINTAGE",
        entityType: "TeacherMonthlyTimesheet",
        entityId: timesheet.id,
        result: "SUCCES",
        details: { teacherId: input.teacherId, year: input.year, month: input.month, executedCount: input.executedSeanceIds.length },
        ipAddress: ctx.ipAddress,
      });
      return timesheet;
    }),

  getMonthlyTimesheet: permissionProcedure("POINTAGE:LECTURE")
    .input(getMonthlyTimesheetInputSchema)
    .output(teacherMonthlyTimesheetSchema)
    .query(({ input }) => seanceService.getMonthlyTimesheet(input)),

  openMonthlyTimesheet: permissionProcedure("POINTAGE:MODIFICATION")
    .input(openMonthlyTimesheetInputSchema)
    .output(teacherMonthlyTimesheetSchema)
    .mutation(async ({ input, ctx }) => {
      const timesheet = await seanceService.openMonthlyTimesheet(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_MONTHLY_TIMESHEET_OPEN",
        module: "POINTAGE",
        entityType: "TeacherMonthlyTimesheet",
        entityId: timesheet.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return timesheet;
    }),

  listMonthlyTimesheets: permissionProcedure("POINTAGE:LECTURE")
    .input(listMonthlyTimesheetsInputSchema)
    .output(z.array(teacherMonthlyTimesheetSchema))
    .query(({ input }) => seanceService.listMonthlyTimesheets(input.year, input.month)),

  closeMonthlyTimesheet: permissionProcedure("POINTAGE:VALIDATION")
    .input(closeMonthlyTimesheetInputSchema)
    .output(teacherMonthlyTimesheetSchema)
    .mutation(async ({ input, ctx }) => {
      const timesheet = await seanceService.closeMonthlyTimesheet(input.id, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_MONTHLY_TIMESHEET_CLOSE",
        module: "POINTAGE",
        entityType: "TeacherMonthlyTimesheet",
        entityId: timesheet.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return timesheet;
    }),

  reopenMonthlyTimesheet: permissionProcedure("POINTAGE:ADMINISTRATION")
    .input(seanceIdInputSchema)
    .output(teacherMonthlyTimesheetSchema)
    .mutation(async ({ input, ctx }) => {
      const timesheet = await seanceService.reopenMonthlyTimesheet(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_MONTHLY_TIMESHEET_REOPEN",
        module: "POINTAGE",
        entityType: "TeacherMonthlyTimesheet",
        entityId: timesheet.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return timesheet;
    }),

  getPayrollControlSummary: permissionProcedure("PAIE_BULLETINS:LECTURE")
    .input(getPayrollControlSummaryInputSchema)
    .output(z.array(payrollControlSummarySchema))
    .query(({ input }) => seanceService.getPayrollControlSummary(input.year, input.month)),
});
