import { z } from "zod";
import {
  createTeacherStatusInputSchema,
  teacherStatusIdInputSchema,
  teacherStatusSchema,
  updateTeacherStatusInputSchema,
} from "@isac-erp/shared";
import * as teacherStatusService from "../services/teacherStatusService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const teacherStatusesRouter = router({
  list: permissionProcedure("ENSEIGNANTS:LECTURE")
    .output(z.array(teacherStatusSchema))
    .query(() => teacherStatusService.listTeacherStatuses()),

  create: permissionProcedure("ENSEIGNANTS:ADMINISTRATION")
    .input(createTeacherStatusInputSchema)
    .output(teacherStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const status = await teacherStatusService.createTeacherStatus(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_STATUS_CREATE",
        module: "ENSEIGNANTS",
        entityType: "TeacherStatus",
        entityId: status.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return status;
    }),

  update: permissionProcedure("ENSEIGNANTS:ADMINISTRATION")
    .input(updateTeacherStatusInputSchema)
    .output(teacherStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const status = await teacherStatusService.updateTeacherStatus(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_STATUS_UPDATE",
        module: "ENSEIGNANTS",
        entityType: "TeacherStatus",
        entityId: status.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return status;
    }),

  deactivate: permissionProcedure("ENSEIGNANTS:ADMINISTRATION")
    .input(teacherStatusIdInputSchema)
    .output(teacherStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const status = await teacherStatusService.deactivateTeacherStatus(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_STATUS_DEACTIVATE",
        module: "ENSEIGNANTS",
        entityType: "TeacherStatus",
        entityId: status.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return status;
    }),

  reactivate: permissionProcedure("ENSEIGNANTS:ADMINISTRATION")
    .input(teacherStatusIdInputSchema)
    .output(teacherStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const status = await teacherStatusService.reactivateTeacherStatus(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_STATUS_REACTIVATE",
        module: "ENSEIGNANTS",
        entityType: "TeacherStatus",
        entityId: status.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return status;
    }),
});
