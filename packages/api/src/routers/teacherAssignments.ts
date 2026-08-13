import {
  createTeacherAssignmentInputSchema,
  getTeacherPlannedHoursForMonthInputSchema,
  getTeacherWorkloadInputSchema,
  listTeacherAssignmentsInputSchema,
  teacherAssignmentIdInputSchema,
  teacherAssignmentSchema,
  teacherPlannedHoursForMonthSchema,
  teacherWorkloadSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as teacherAssignmentService from "../services/teacherAssignmentService.js";
import { getTeacherPlannedHoursForMonth } from "../services/payrollLineService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const teacherAssignmentsRouter = router({
  listByTeacher: permissionProcedure("ENSEIGNANTS_AFFECTATIONS:LECTURE")
    .input(listTeacherAssignmentsInputSchema)
    .output(z.array(teacherAssignmentSchema))
    .query(({ input }) => teacherAssignmentService.listTeacherAssignments(input.teacherId, input.includeInactive)),

  create: permissionProcedure("ENSEIGNANTS_AFFECTATIONS:CREATION")
    .input(createTeacherAssignmentInputSchema)
    .output(teacherAssignmentSchema)
    .mutation(async ({ input, ctx }) => {
      const assignment = await teacherAssignmentService.createTeacherAssignment(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_ASSIGNMENT_CREATE",
        module: "ENSEIGNANTS_AFFECTATIONS",
        entityType: "TeacherAssignment",
        entityId: assignment.id,
        result: "SUCCES",
        details: { teacherId: input.teacherId, subjectOfferingId: input.subjectOfferingId, classId: input.classId },
        ipAddress: ctx.ipAddress,
      });
      return assignment;
    }),

  deactivate: permissionProcedure("ENSEIGNANTS_AFFECTATIONS:SUPPRESSION")
    .input(teacherAssignmentIdInputSchema)
    .output(teacherAssignmentSchema)
    .mutation(async ({ input, ctx }) => {
      const assignment = await teacherAssignmentService.deactivateTeacherAssignment(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_ASSIGNMENT_DEACTIVATE",
        module: "ENSEIGNANTS_AFFECTATIONS",
        entityType: "TeacherAssignment",
        entityId: assignment.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return assignment;
    }),

  reactivate: permissionProcedure("ENSEIGNANTS_AFFECTATIONS:MODIFICATION")
    .input(teacherAssignmentIdInputSchema)
    .output(teacherAssignmentSchema)
    .mutation(async ({ input, ctx }) => {
      const assignment = await teacherAssignmentService.reactivateTeacherAssignment(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_ASSIGNMENT_REACTIVATE",
        module: "ENSEIGNANTS_AFFECTATIONS",
        entityType: "TeacherAssignment",
        entityId: assignment.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return assignment;
    }),

  getWorkload: permissionProcedure("ENSEIGNANTS_AFFECTATIONS:LECTURE")
    .input(getTeacherWorkloadInputSchema)
    .output(teacherWorkloadSchema)
    .query(({ input }) => teacherAssignmentService.getTeacherWorkload(input)),

  getPlannedHoursForMonth: permissionProcedure("ENSEIGNANTS_AFFECTATIONS:LECTURE")
    .input(getTeacherPlannedHoursForMonthInputSchema)
    .output(teacherPlannedHoursForMonthSchema)
    .query(async ({ input }) => ({
      plannedHours: await getTeacherPlannedHoursForMonth(input.teacherId, input.year, input.month),
    })),
});
