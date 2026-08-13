import { z } from "zod";
import {
  createSubjectInputSchema,
  listSubjectsInputSchema,
  subjectSchema,
  updateSubjectInputSchema,
} from "@isac-erp/shared";
import * as subjectService from "../services/subjectService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const subjectsRouter = router({
  list: permissionProcedure("MATIERES:LECTURE")
    .input(listSubjectsInputSchema)
    .output(z.array(subjectSchema))
    .query(({ input }) => subjectService.listSubjects(input)),

  getById: permissionProcedure("MATIERES:LECTURE")
    .input(z.object({ id: z.string().uuid() }))
    .output(subjectSchema)
    .query(({ input }) => subjectService.getSubjectById(input.id)),

  create: permissionProcedure("MATIERES:CREATION")
    .input(createSubjectInputSchema)
    .output(subjectSchema)
    .mutation(async ({ input, ctx }) => {
      const subject = await subjectService.createSubject(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SUBJECT_CREATE",
        module: "MATIERES",
        entityType: "Subject",
        entityId: subject.id,
        result: "SUCCES",
        details: { code: subject.code, name: subject.name },
        ipAddress: ctx.ipAddress,
      });
      return subject;
    }),

  update: permissionProcedure("MATIERES:MODIFICATION")
    .input(updateSubjectInputSchema)
    .output(subjectSchema)
    .mutation(async ({ input, ctx }) => {
      const subject = await subjectService.updateSubject(input);
      await logAction({
        userId: ctx.session.userId,
        action: "SUBJECT_UPDATE",
        module: "MATIERES",
        entityType: "Subject",
        entityId: subject.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return subject;
    }),

  deactivate: permissionProcedure("MATIERES:SUPPRESSION")
    .input(z.object({ id: z.string().uuid() }))
    .output(subjectSchema)
    .mutation(async ({ input, ctx }) => {
      const subject = await subjectService.deactivateSubject(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "SUBJECT_DEACTIVATE",
        module: "MATIERES",
        entityType: "Subject",
        entityId: subject.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return subject;
    }),

  reactivate: permissionProcedure("MATIERES:MODIFICATION")
    .input(z.object({ id: z.string().uuid() }))
    .output(subjectSchema)
    .mutation(async ({ input, ctx }) => {
      const subject = await subjectService.reactivateSubject(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "SUBJECT_REACTIVATE",
        module: "MATIERES",
        entityType: "Subject",
        entityId: subject.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return subject;
    }),
});
