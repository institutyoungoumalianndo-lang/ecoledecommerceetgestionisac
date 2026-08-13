import {
  createTeacherDocumentInputSchema,
  listTeacherDocumentsInputSchema,
  teacherDocumentIdInputSchema,
  teacherDocumentSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as teacherDocumentService from "../services/teacherDocumentService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const teacherDocumentsRouter = router({
  listByTeacher: permissionProcedure("ENSEIGNANTS_DOCUMENTS:LECTURE")
    .input(listTeacherDocumentsInputSchema)
    .output(z.array(teacherDocumentSchema))
    .query(({ input }) => teacherDocumentService.listTeacherDocuments(input.teacherId)),

  create: permissionProcedure("ENSEIGNANTS_DOCUMENTS:CREATION")
    .input(createTeacherDocumentInputSchema)
    .output(teacherDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      const document = await teacherDocumentService.createTeacherDocument(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_DOCUMENT_CREATE",
        module: "ENSEIGNANTS_DOCUMENTS",
        entityType: "TeacherDocument",
        entityId: document.id,
        result: "SUCCES",
        details: { teacherId: input.teacherId, type: input.type },
        ipAddress: ctx.ipAddress,
      });
      return document;
    }),

  delete: permissionProcedure("ENSEIGNANTS_DOCUMENTS:SUPPRESSION")
    .input(teacherDocumentIdInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await teacherDocumentService.deleteTeacherDocument(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TEACHER_DOCUMENT_DELETE",
        module: "ENSEIGNANTS_DOCUMENTS",
        entityType: "TeacherDocument",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return { success: true };
    }),
});
