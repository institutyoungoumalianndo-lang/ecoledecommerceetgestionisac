import {
  createTeacherTrainingInputSchema,
  listTeacherTrainingsInputSchema,
  teacherTrainingIdInputSchema,
  teacherTrainingSchema,
  updateTeacherTrainingInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as teacherTrainingService from "../services/teacherTrainingService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const teacherTrainingsRouter = router({
  listByTeacher: permissionProcedure("ENSEIGNANTS_DOCUMENTS:LECTURE")
    .input(listTeacherTrainingsInputSchema)
    .output(z.array(teacherTrainingSchema))
    .query(({ input }) => teacherTrainingService.listTeacherTrainings(input.teacherId)),

  create: permissionProcedure("ENSEIGNANTS_DOCUMENTS:CREATION")
    .input(createTeacherTrainingInputSchema)
    .output(teacherTrainingSchema)
    .mutation(async ({ input, ctx }) => {
      const training = await teacherTrainingService.createTeacherTraining(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_TRAINING_CREATE",
        module: "ENSEIGNANTS_DOCUMENTS",
        entityType: "TeacherTraining",
        entityId: training.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return training;
    }),

  update: permissionProcedure("ENSEIGNANTS_DOCUMENTS:MODIFICATION")
    .input(updateTeacherTrainingInputSchema)
    .output(teacherTrainingSchema)
    .mutation(async ({ input, ctx }) => {
      const training = await teacherTrainingService.updateTeacherTraining(input);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_TRAINING_UPDATE",
        module: "ENSEIGNANTS_DOCUMENTS",
        entityType: "TeacherTraining",
        entityId: training.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return training;
    }),

  delete: permissionProcedure("ENSEIGNANTS_DOCUMENTS:SUPPRESSION")
    .input(teacherTrainingIdInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await teacherTrainingService.deleteTeacherTraining(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_TRAINING_DELETE",
        module: "ENSEIGNANTS_DOCUMENTS",
        entityType: "TeacherTraining",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return { success: true };
    }),
});
