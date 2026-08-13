import { z } from "zod";
import {
  createDigitalDocumentInputSchema,
  digitalDocumentIdInputSchema,
  digitalDocumentSchema,
  digitalDocumentShareSchema,
  listDigitalDocumentsInputSchema,
  shareDigitalDocumentInputSchema,
  shareDigitalDocumentOutputSchema,
} from "@isac-erp/shared";
import * as digitalDocumentService from "../services/digitalDocumentService.js";
import * as digitalDocumentShareService from "../services/digitalDocumentShareService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const digitalDocumentsRouter = router({
  list: permissionProcedure("BIBLIOTHEQUE_NUMERIQUE:LECTURE")
    .input(listDigitalDocumentsInputSchema)
    .output(z.array(digitalDocumentSchema))
    .query(({ input }) => digitalDocumentService.listDigitalDocuments(input)),

  shares: permissionProcedure("BIBLIOTHEQUE_NUMERIQUE:LECTURE")
    .input(digitalDocumentIdInputSchema)
    .output(z.array(digitalDocumentShareSchema))
    .query(({ input }) => digitalDocumentShareService.listDigitalDocumentShares(input.id)),

  create: permissionProcedure("BIBLIOTHEQUE_NUMERIQUE:CREATION")
    .input(createDigitalDocumentInputSchema)
    .output(digitalDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      const document = await digitalDocumentService.createDigitalDocument(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "DIGITAL_DOCUMENT_CREATE",
        module: "BIBLIOTHEQUE_NUMERIQUE",
        entityType: "DigitalDocument",
        entityId: document.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
        details: { title: document.title },
      });
      return document;
    }),

  delete: permissionProcedure("BIBLIOTHEQUE_NUMERIQUE:SUPPRESSION")
    .input(digitalDocumentIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      await digitalDocumentService.deleteDigitalDocument(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "DIGITAL_DOCUMENT_DELETE",
        module: "BIBLIOTHEQUE_NUMERIQUE",
        entityType: "DigitalDocument",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
    }),

  share: permissionProcedure("BIBLIOTHEQUE_NUMERIQUE:CREATION")
    .input(shareDigitalDocumentInputSchema)
    .output(shareDigitalDocumentOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await digitalDocumentShareService.shareDigitalDocument(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "DIGITAL_DOCUMENT_SHARE",
        module: "BIBLIOTHEQUE_NUMERIQUE",
        entityType: "DigitalDocument",
        entityId: input.documentId,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
        details: { channel: input.channel },
      });
      return result;
    }),
});
