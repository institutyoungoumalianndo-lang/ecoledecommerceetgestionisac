import {
  createStudentAbsenceInputSchema,
  deleteStudentAbsenceInputSchema,
  listStudentAbsencesInputSchema,
  studentAbsenceSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as studentAbsenceService from "../services/studentAbsenceService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const studentAbsencesRouter = router({
  listByStudent: permissionProcedure("ABSENCES:LECTURE")
    .input(listStudentAbsencesInputSchema)
    .output(z.array(studentAbsenceSchema))
    .query(({ input }) => studentAbsenceService.listStudentAbsences(input.studentId)),

  create: permissionProcedure("ABSENCES:CREATION")
    .input(createStudentAbsenceInputSchema)
    .output(studentAbsenceSchema)
    .mutation(async ({ input, ctx }) => {
      const absence = await studentAbsenceService.createStudentAbsence(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "ABSENCE_CREATION",
        module: "ABSENCES",
        entityType: "StudentAbsence",
        entityId: absence.id,
        result: "SUCCES",
        details: { studentId: absence.studentId, justifiee: absence.justifiee },
        ipAddress: ctx.ipAddress,
      });
      return absence;
    }),

  delete: permissionProcedure("ABSENCES:SUPPRESSION")
    .input(deleteStudentAbsenceInputSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      await studentAbsenceService.deleteStudentAbsence(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "ABSENCE_SUPPRESSION",
        module: "ABSENCES",
        entityType: "StudentAbsence",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
    }),
});
