import { z } from "zod";
import {
  createDigitalDocumentCategoryInputSchema,
  digitalDocumentCategorySchema,
  updateDigitalDocumentCategoryInputSchema,
} from "@isac-erp/shared";
import * as digitalDocumentCategoryService from "../services/digitalDocumentCategoryService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const digitalDocumentCategoriesRouter = router({
  list: permissionProcedure("BIBLIOTHEQUE_NUMERIQUE:LECTURE")
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .output(z.array(digitalDocumentCategorySchema))
    .query(({ input }) => digitalDocumentCategoryService.listDigitalDocumentCategories(input?.activeOnly)),

  create: permissionProcedure("BIBLIOTHEQUE_NUMERIQUE:ADMINISTRATION")
    .input(createDigitalDocumentCategoryInputSchema)
    .output(digitalDocumentCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await digitalDocumentCategoryService.createDigitalDocumentCategory(input);
      await logAction({
        userId: ctx.session.userId,
        action: "DIGITAL_DOCUMENT_CATEGORY_CREATE",
        module: "BIBLIOTHEQUE_NUMERIQUE",
        entityType: "DigitalDocumentCategory",
        entityId: category.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return category;
    }),

  update: permissionProcedure("BIBLIOTHEQUE_NUMERIQUE:ADMINISTRATION")
    .input(updateDigitalDocumentCategoryInputSchema)
    .output(digitalDocumentCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await digitalDocumentCategoryService.updateDigitalDocumentCategory(input);
      await logAction({
        userId: ctx.session.userId,
        action: "DIGITAL_DOCUMENT_CATEGORY_UPDATE",
        module: "BIBLIOTHEQUE_NUMERIQUE",
        entityType: "DigitalDocumentCategory",
        entityId: category.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return category;
    }),
});
