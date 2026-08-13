import { generatedDocumentSchema, generatePaymentCardInputSchema } from "@isac-erp/shared";
import * as paymentCardService from "../services/documents/paymentCardService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

/** Carte de paiement (extension du 2026-07-30) — même modèle que la carte d'étudiant, sans cycle de vie propre. */
export const paymentCardsRouter = router({
  generate: permissionProcedure("DOCUMENTS:CREATION")
    .input(generatePaymentCardInputSchema)
    .output(generatedDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      const doc = await paymentCardService.generatePaymentCard(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "PAYMENT_CARD_GENERATE",
        module: "DOCUMENTS",
        entityType: "GeneratedDocument",
        entityId: doc.id,
        result: "SUCCES",
        details: { documentNumber: doc.documentNumber, studentId: input.studentId },
        ipAddress: ctx.ipAddress,
      });
      return doc;
    }),
});
