import { z } from "zod";
import {
  cancelStudentCardInputSchema,
  generateStudentCardInputSchema,
  generateStudentCardsBatchInputSchema,
  generateStudentCardsBatchResultSchema,
  listStudentCardsInputSchema,
  reissueStudentCardInputSchema,
  reprintStudentCardInputSchema,
  studentCardSchema,
} from "@isac-erp/shared";
import * as studentCardService from "../services/documents/studentCardService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

/** Cycle de vie de la carte d'étudiant (MODULE-09.1) — distinct des documents génériques du Module 9. */
export const studentCardsRouter = router({
  list: permissionProcedure("DOCUMENTS:LECTURE")
    .input(listStudentCardsInputSchema)
    .output(z.array(studentCardSchema))
    .query(({ input }) => studentCardService.listStudentCards(input)),

  get: permissionProcedure("DOCUMENTS:LECTURE")
    .input(z.object({ id: z.string().uuid() }))
    .output(studentCardSchema)
    .query(({ input }) => studentCardService.getStudentCardById(input.id)),

  generate: permissionProcedure("DOCUMENTS:CREATION")
    .input(generateStudentCardInputSchema)
    .output(studentCardSchema)
    .mutation(async ({ input, ctx }) => {
      const card = await studentCardService.generateStudentCard(input.studentId, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_CARD_GENERATE",
        module: "DOCUMENTS",
        entityType: "StudentCard",
        entityId: card.id,
        result: "SUCCES",
        details: { cardNumber: card.cardNumber, studentId: input.studentId },
        ipAddress: ctx.ipAddress,
      });
      return card;
    }),

  reissue: permissionProcedure("DOCUMENTS:ADMINISTRATION")
    .input(reissueStudentCardInputSchema)
    .output(studentCardSchema)
    .mutation(async ({ input, ctx }) => {
      const card = await studentCardService.reissueStudentCard(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_CARD_REISSUE",
        module: "DOCUMENTS",
        entityType: "StudentCard",
        entityId: card.id,
        result: "SUCCES",
        details: { cardNumber: card.cardNumber, studentId: input.studentId, reason: input.reason },
        ipAddress: ctx.ipAddress,
      });
      return card;
    }),

  cancel: permissionProcedure("DOCUMENTS:ADMINISTRATION")
    .input(cancelStudentCardInputSchema)
    .output(studentCardSchema)
    .mutation(async ({ input, ctx }) => {
      const card = await studentCardService.cancelStudentCard(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_CARD_CANCEL",
        module: "DOCUMENTS",
        entityType: "StudentCard",
        entityId: card.id,
        result: "SUCCES",
        details: { cardNumber: card.cardNumber, reason: input.reason },
        ipAddress: ctx.ipAddress,
      });
      return card;
    }),

  reprint: permissionProcedure("DOCUMENTS:LECTURE")
    .input(reprintStudentCardInputSchema)
    .output(studentCardSchema)
    .mutation(async ({ input, ctx }) => {
      const card = await studentCardService.reprintStudentCard(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_CARD_REPRINT",
        module: "DOCUMENTS",
        entityType: "StudentCard",
        entityId: card.id,
        result: "SUCCES",
        details: { cardNumber: card.cardNumber, reason: input.reason },
        ipAddress: ctx.ipAddress,
      });
      return card;
    }),

  generateBatch: permissionProcedure("DOCUMENTS:CREATION")
    .input(generateStudentCardsBatchInputSchema)
    .output(generateStudentCardsBatchResultSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await studentCardService.generateStudentCardsBatch(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "STUDENT_CARD_GENERATE_BATCH",
        module: "DOCUMENTS",
        result: "SUCCES",
        details: { generatedCount: result.generatedCount, failedCount: result.failed.length, ...input },
        ipAddress: ctx.ipAddress,
      });
      return result;
    }),
});
