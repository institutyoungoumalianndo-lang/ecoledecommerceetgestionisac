import {
  createStudentDocumentInputSchema,
  listStudentDocumentsInputSchema,
  replaceStudentDocumentInputSchema,
  studentDocumentIdInputSchema,
  studentDocumentSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as studentDocumentService from "../services/studentDocumentService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const studentDocumentsRouter = router({
  listByStudent: permissionProcedure("ETUDIANTS_DOCUMENTS:LECTURE")
    .input(listStudentDocumentsInputSchema)
    .output(z.array(studentDocumentSchema))
    .query(({ input }) => studentDocumentService.listStudentDocuments(input.studentId)),

  create: permissionProcedure("ETUDIANTS_DOCUMENTS:CREATION")
    .input(createStudentDocumentInputSchema)
    .output(studentDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      const document = await studentDocumentService.createStudentDocument(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_DOCUMENT_CREATE",
        module: "ETUDIANTS_DOCUMENTS",
        entityType: "StudentDocument",
        entityId: document.id,
        result: "SUCCES",
        details: { studentId: input.studentId, type: input.type },
        ipAddress: ctx.ipAddress,
      });
      return document;
    }),

  replace: permissionProcedure("ETUDIANTS_DOCUMENTS:MODIFICATION")
    .input(replaceStudentDocumentInputSchema)
    .output(studentDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      const document = await studentDocumentService.replaceStudentDocument(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_DOCUMENT_REPLACE",
        module: "ETUDIANTS_DOCUMENTS",
        entityType: "StudentDocument",
        entityId: document.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return document;
    }),

  delete: permissionProcedure("ETUDIANTS_DOCUMENTS:SUPPRESSION")
    .input(studentDocumentIdInputSchema)
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await studentDocumentService.deleteStudentDocument(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_DOCUMENT_DELETE",
        module: "ETUDIANTS_DOCUMENTS",
        entityType: "StudentDocument",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return { success: true };
    }),
});
