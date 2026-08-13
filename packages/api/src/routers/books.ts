import { z } from "zod";
import {
  bookCopySchema,
  bookIdInputSchema,
  bookSchema,
  createBookCopyInputSchema,
  createBookInputSchema,
  listBooksInputSchema,
  updateBookInputSchema,
  withdrawBookCopyInputSchema,
} from "@isac-erp/shared";
import * as bookService from "../services/bookService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const booksRouter = router({
  list: permissionProcedure("BIBLIOTHEQUE:LECTURE")
    .input(listBooksInputSchema)
    .output(z.array(bookSchema))
    .query(({ input }) => bookService.listBooks(input)),

  get: permissionProcedure("BIBLIOTHEQUE:LECTURE")
    .input(bookIdInputSchema)
    .output(bookSchema)
    .query(({ input }) => bookService.getBook(input.id)),

  copies: permissionProcedure("BIBLIOTHEQUE:LECTURE")
    .input(bookIdInputSchema)
    .output(z.array(bookCopySchema))
    .query(({ input }) => bookService.listBookCopies(input.id)),

  create: permissionProcedure("BIBLIOTHEQUE:CREATION")
    .input(createBookInputSchema)
    .output(bookSchema)
    .mutation(async ({ input, ctx }) => {
      const book = await bookService.createBook(input);
      await logAction({
        userId: ctx.session.userId,
        action: "BOOK_CREATE",
        module: "BIBLIOTHEQUE",
        entityType: "Book",
        entityId: book.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return book;
    }),

  update: permissionProcedure("BIBLIOTHEQUE:MODIFICATION")
    .input(updateBookInputSchema)
    .output(bookSchema)
    .mutation(async ({ input, ctx }) => {
      const book = await bookService.updateBook(input);
      await logAction({
        userId: ctx.session.userId,
        action: "BOOK_UPDATE",
        module: "BIBLIOTHEQUE",
        entityType: "Book",
        entityId: book.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return book;
    }),

  createCopy: permissionProcedure("BIBLIOTHEQUE:CREATION")
    .input(createBookCopyInputSchema)
    .output(bookCopySchema)
    .mutation(async ({ input, ctx }) => {
      const copy = await bookService.createBookCopy(input);
      await logAction({
        userId: ctx.session.userId,
        action: "BOOK_COPY_CREATE",
        module: "BIBLIOTHEQUE",
        entityType: "BookCopy",
        entityId: copy.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
        details: { inventoryNumber: copy.inventoryNumber },
      });
      return copy;
    }),

  withdrawCopy: permissionProcedure("BIBLIOTHEQUE:SUPPRESSION")
    .input(withdrawBookCopyInputSchema)
    .output(bookCopySchema)
    .mutation(async ({ input, ctx }) => {
      const copy = await bookService.withdrawBookCopy(input);
      await logAction({
        userId: ctx.session.userId,
        action: "BOOK_COPY_WITHDRAW",
        module: "BIBLIOTHEQUE",
        entityType: "BookCopy",
        entityId: copy.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
        details: { status: copy.status, reason: input.reason },
      });
      return copy;
    }),
});
