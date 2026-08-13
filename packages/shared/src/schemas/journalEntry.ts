import { z } from "zod";

export const journalEntryStatusSchema = z.enum(["VALIDEE", "ANNULEE"]);
export type JournalEntryStatus = z.infer<typeof journalEntryStatusSchema>;

export const journalEntryLineInputSchema = z.object({
  accountId: z.string().uuid(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  label: z.string().nullish(),
});
export type JournalEntryLineInput = z.infer<typeof journalEntryLineInputSchema>;

export const journalEntryLineSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  accountCode: z.string(),
  accountLabel: z.string(),
  debit: z.number(),
  credit: z.number(),
  label: z.string().nullable(),
});
export type JournalEntryLineDto = z.infer<typeof journalEntryLineSchema>;

export const journalEntrySchema = z.object({
  id: z.string().uuid(),
  entryNumber: z.string(),
  entryDate: z.coerce.date(),
  label: z.string(),
  sourceModule: z.string(),
  sourceType: z.string().nullable(),
  sourceId: z.string().nullable(),
  status: journalEntryStatusSchema,
  reversalOfId: z.string().uuid().nullable(),
  createdByName: z.string(),
  cancelledAt: z.coerce.date().nullable(),
  cancelledReason: z.string().nullable(),
  cancelledByName: z.string().nullable(),
  lines: z.array(journalEntryLineSchema),
  totalDebit: z.number(),
  totalCredit: z.number(),
});
export type JournalEntryDto = z.infer<typeof journalEntrySchema>;

export const createJournalEntryInputSchema = z.object({
  entryDate: z.coerce.date(),
  label: z.string().min(1),
  lines: z.array(journalEntryLineInputSchema).min(2),
});
export type CreateJournalEntryInput = z.infer<typeof createJournalEntryInputSchema>;

export const cancelJournalEntryInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1),
});
export type CancelJournalEntryInput = z.infer<typeof cancelJournalEntryInputSchema>;

export const journalEntryIdInputSchema = z.object({ id: z.string().uuid() });

export const listJournalEntriesInputSchema = z.object({
  search: z.string().trim().optional(),
  accountId: z.string().uuid().optional(),
  sourceModule: z.string().optional(),
  status: journalEntryStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(20),
  sortBy: z.enum(["entryDate", "entryNumber"]).default("entryDate"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});
export type ListJournalEntriesInput = z.infer<typeof listJournalEntriesInputSchema>;

export const listJournalEntriesResultSchema = z.object({
  items: z.array(journalEntrySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type ListJournalEntriesResult = z.infer<typeof listJournalEntriesResultSchema>;
