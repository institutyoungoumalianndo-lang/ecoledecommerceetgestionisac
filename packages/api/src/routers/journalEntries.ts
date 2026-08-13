import { TRPCError } from "@trpc/server";
import {
  cancelJournalEntryInputSchema,
  createJournalEntryInputSchema,
  journalEntryIdInputSchema,
  journalEntrySchema,
  listJournalEntriesInputSchema,
  listJournalEntriesResultSchema,
} from "@isac-erp/shared";
import * as journalEntryService from "../services/journalEntryService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const journalEntriesRouter = router({
  list: permissionProcedure("ECRITURES:LECTURE")
    .input(listJournalEntriesInputSchema)
    .output(listJournalEntriesResultSchema)
    .query(({ input }) => journalEntryService.listJournalEntries(input)),

  getById: permissionProcedure("ECRITURES:LECTURE")
    .input(journalEntryIdInputSchema)
    .output(journalEntrySchema)
    .query(({ input }) => journalEntryService.getJournalEntryById(input.id)),

  create: permissionProcedure("ECRITURES:CREATION")
    .input(createJournalEntryInputSchema)
    .output(journalEntrySchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const entry = await journalEntryService.createJournalEntry(input, ctx.session.userId);
        await logAction({
          userId: ctx.session.userId,
          action: "JOURNAL_ENTRY_CREATE",
          module: "ECRITURES",
          entityType: "JournalEntry",
          entityId: entry.id,
          result: "SUCCES",
          details: { entryNumber: entry.entryNumber, totalDebit: entry.totalDebit },
          ipAddress: ctx.ipAddress,
        });
        return entry;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Création de l'écriture impossible.",
        });
      }
    }),

  cancel: permissionProcedure("ECRITURES:SUPPRESSION")
    .input(cancelJournalEntryInputSchema)
    .output(journalEntrySchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { before, after } = await journalEntryService.cancelJournalEntry(input, ctx.session.userId);
        await logAction({
          userId: ctx.session.userId,
          action: "JOURNAL_ENTRY_CANCEL",
          module: "ECRITURES",
          entityType: "JournalEntry",
          entityId: after.id,
          result: "SUCCES",
          details: { before: { status: before.status }, after: { status: after.status }, reason: input.reason },
          ipAddress: ctx.ipAddress,
        });
        return after;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Annulation impossible.",
        });
      }
    }),
});
