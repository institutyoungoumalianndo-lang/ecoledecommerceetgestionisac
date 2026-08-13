import { z } from "zod";
import {
  documentCatalogEntrySchema,
  generateDocumentInputSchema,
  generatedDocumentSchema,
  listGeneratedDocumentsInputSchema,
} from "@isac-erp/shared";
import { TRPCError } from "@trpc/server";
import * as documentEngineService from "../services/documents/documentEngineService.js";
import * as generatedDocumentService from "../services/documents/generatedDocumentService.js";
import * as documentCatalogService from "../services/documents/documentCatalogService.js";
import { logAction } from "../services/auditService.js";
import { hasPermission } from "../security/authorization.js";
import { permissionProcedure, router } from "../trpc.js";

export const documentsRouter = router({
  catalog: permissionProcedure("DOCUMENTS:LECTURE")
    .output(z.array(documentCatalogEntrySchema))
    .query(({ ctx }) => documentCatalogService.getDocumentCatalog(ctx.session.roleCode, ctx.session.permissionCodes)),

  list: permissionProcedure("DOCUMENTS:LECTURE")
    .input(listGeneratedDocumentsInputSchema)
    .output(z.array(generatedDocumentSchema))
    .query(({ input }) => generatedDocumentService.listGeneratedDocuments(input)),

  get: permissionProcedure("DOCUMENTS:LECTURE")
    .input(z.object({ id: z.string().uuid() }))
    .output(generatedDocumentSchema)
    .query(({ input }) => generatedDocumentService.getGeneratedDocumentById(input.id)),

  generate: permissionProcedure("DOCUMENTS:CREATION")
    .input(generateDocumentInputSchema)
    .output(generatedDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      const extraPermission = documentCatalogService.DOCUMENT_TYPE_EXTRA_PERMISSION[input.documentType];
      if (extraPermission && !hasPermission(ctx.session.roleCode, ctx.session.permissionCodes, extraPermission)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Action non autorisée." });
      }
      const document = await documentEngineService.generateDocument(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "DOCUMENT_GENERATE",
        module: "DOCUMENTS",
        entityType: "GeneratedDocument",
        entityId: document.id,
        result: "SUCCES",
        details: { documentType: document.documentType, documentNumber: document.documentNumber },
        ipAddress: ctx.ipAddress,
      });
      return document;
    }),
});
