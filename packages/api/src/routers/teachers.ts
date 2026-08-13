import {
  archiveTeacherInputSchema,
  createTeacherInputSchema,
  teacherIdInputSchema,
  teacherListFilterInputSchema,
  teacherListPageSchema,
  teacherListRowSchema,
  teacherSchema,
  updateTeacherInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as teacherService from "../services/teacherService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const teachersRouter = router({
  list: permissionProcedure("ENSEIGNANTS:LECTURE")
    .input(teacherListFilterInputSchema)
    .output(teacherListPageSchema)
    .query(({ input }) => teacherService.listTeachers(input)),

  listForExport: permissionProcedure("ENSEIGNANTS:EXPORT")
    .input(teacherListFilterInputSchema.omit({ page: true, pageSize: true }))
    .output(z.array(teacherListRowSchema))
    .query(({ input }) => teacherService.listTeachersForExport(input)),

  getById: permissionProcedure("ENSEIGNANTS:LECTURE")
    .input(teacherIdInputSchema)
    .output(teacherSchema)
    .query(({ input }) => teacherService.getTeacherById(input.id)),

  create: permissionProcedure("ENSEIGNANTS:CREATION")
    .input(createTeacherInputSchema)
    .output(teacherSchema)
    .mutation(async ({ input, ctx }) => {
      const teacher = await teacherService.createTeacher(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_CREATE",
        module: "ENSEIGNANTS",
        entityType: "Teacher",
        entityId: teacher.id,
        result: "SUCCES",
        details: { matricule: teacher.matricule },
        ipAddress: ctx.ipAddress,
      });
      return teacher;
    }),

  update: permissionProcedure("ENSEIGNANTS:MODIFICATION")
    .input(updateTeacherInputSchema)
    .output(teacherSchema)
    .mutation(async ({ input, ctx }) => {
      const teacher = await teacherService.updateTeacher(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_UPDATE",
        module: "ENSEIGNANTS",
        entityType: "Teacher",
        entityId: teacher.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return teacher;
    }),

  archive: permissionProcedure("ENSEIGNANTS:SUPPRESSION")
    .input(archiveTeacherInputSchema)
    .output(teacherSchema)
    .mutation(async ({ input, ctx }) => {
      const teacher = await teacherService.archiveTeacher(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_ARCHIVE",
        module: "ENSEIGNANTS",
        entityType: "Teacher",
        entityId: teacher.id,
        result: "SUCCES",
        details: { reason: input.reason },
        ipAddress: ctx.ipAddress,
      });
      return teacher;
    }),

  restore: permissionProcedure("ENSEIGNANTS:SUPPRESSION")
    .input(teacherIdInputSchema)
    .output(teacherSchema)
    .mutation(async ({ input, ctx }) => {
      const teacher = await teacherService.restoreTeacher(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_RESTORE",
        module: "ENSEIGNANTS",
        entityType: "Teacher",
        entityId: teacher.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return teacher;
    }),
});
