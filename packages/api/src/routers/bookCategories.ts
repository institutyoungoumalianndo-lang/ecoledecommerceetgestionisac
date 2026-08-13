import { z } from "zod";
import {
  bookCategorySchema,
  createBookCategoryInputSchema,
  updateBookCategoryInputSchema,
} from "@isac-erp/shared";
import * as bookCategoryService from "../services/bookCategoryService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const bookCategoriesRouter = router({
  list: permissionProcedure("BIBLIOTHEQUE:LECTURE")
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .output(z.array(bookCategorySchema))
    .query(({ input }) => bookCategoryService.listBookCategories(input?.activeOnly)),

  create: permissionProcedure("BIBLIOTHEQUE:ADMINISTRATION")
    .input(createBookCategoryInputSchema)
    .output(bookCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await bookCategoryService.createBookCategory(input);
      await logAction({
        userId: ctx.session.userId,
        action: "BOOK_CATEGORY_CREATE",
        module: "BIBLIOTHEQUE",
        entityType: "BookCategory",
        entityId: category.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return category;
    }),

  update: permissionProcedure("BIBLIOTHEQUE:ADMINISTRATION")
    .input(updateBookCategoryInputSchema)
    .output(bookCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const category = await bookCategoryService.updateBookCategory(input);
      await logAction({
        userId: ctx.session.userId,
        action: "BOOK_CATEGORY_UPDATE",
        module: "BIBLIOTHEQUE",
        entityType: "BookCategory",
        entityId: category.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return category;
    }),
});
