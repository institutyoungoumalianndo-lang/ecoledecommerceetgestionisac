import {
  createTeacherLeaveInputSchema,
  createTeacherWeeklyAvailabilityInputSchema,
  listTeacherAvailabilityInputSchema,
  teacherLeaveIdInputSchema,
  teacherLeaveSchema,
  teacherWeeklyAvailabilityIdInputSchema,
  teacherWeeklyAvailabilitySchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as teacherAvailabilityService from "../services/teacherAvailabilityService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const teacherAvailabilityRouter = router({
  listWeekly: permissionProcedure("ENSEIGNANTS_AFFECTATIONS:LECTURE")
    .input(listTeacherAvailabilityInputSchema)
    .output(z.array(teacherWeeklyAvailabilitySchema))
    .query(({ input }) => teacherAvailabilityService.listTeacherWeeklyAvailability(input.teacherId)),

  createWeekly: permissionProcedure("ENSEIGNANTS_AFFECTATIONS:CREATION")
    .input(createTeacherWeeklyAvailabilityInputSchema)
    .output(teacherWeeklyAvailabilitySchema)
    .mutation(async ({ input, ctx }) => {
      const slot = await teacherAvailabilityService.createTeacherWeeklyAvailability(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_WEEKLY_AVAILABILITY_CREATE",
        module: "ENSEIGNANTS_AFFECTATIONS",
        entityType: "TeacherWeeklyAvailability",
        entityId: slot.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return slot;
    }),

  deleteWeekly: permissionProcedure("ENSEIGNANTS_AFFECTATIONS:SUPPRESSION")
    .input(teacherWeeklyAvailabilityIdInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await teacherAvailabilityService.deleteTeacherWeeklyAvailability(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_WEEKLY_AVAILABILITY_DELETE",
        module: "ENSEIGNANTS_AFFECTATIONS",
        entityType: "TeacherWeeklyAvailability",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return { success: true };
    }),

  listLeaves: permissionProcedure("ENSEIGNANTS_AFFECTATIONS:LECTURE")
    .input(listTeacherAvailabilityInputSchema)
    .output(z.array(teacherLeaveSchema))
    .query(({ input }) => teacherAvailabilityService.listTeacherLeaves(input.teacherId)),

  createLeave: permissionProcedure("ENSEIGNANTS_AFFECTATIONS:CREATION")
    .input(createTeacherLeaveInputSchema)
    .output(teacherLeaveSchema)
    .mutation(async ({ input, ctx }) => {
      const leave = await teacherAvailabilityService.createTeacherLeave(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_LEAVE_CREATE",
        module: "ENSEIGNANTS_AFFECTATIONS",
        entityType: "TeacherLeave",
        entityId: leave.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return leave;
    }),

  deleteLeave: permissionProcedure("ENSEIGNANTS_AFFECTATIONS:SUPPRESSION")
    .input(teacherLeaveIdInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await teacherAvailabilityService.deleteTeacherLeave(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_LEAVE_DELETE",
        module: "ENSEIGNANTS_AFFECTATIONS",
        entityType: "TeacherLeave",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return { success: true };
    }),
});
