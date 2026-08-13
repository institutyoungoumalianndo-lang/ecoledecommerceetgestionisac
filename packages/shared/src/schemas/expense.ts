import { z } from "zod";

export const expenseStatusSchema = z.enum(["BROUILLON", "EN_ATTENTE_APPROBATION", "APPROUVEE", "REJETEE", "ANNULEE"]);
export type ExpenseStatus = z.infer<typeof expenseStatusSchema>;

export const expenseDocumentTypeSchema = z.enum(["FACTURE", "DEVIS", "RECU", "CONTRAT", "AUTRE"]);
export type ExpenseDocumentType = z.infer<typeof expenseDocumentTypeSchema>;

export const expenseDocumentSchema = z.object({
  id: z.string().uuid(),
  expenseId: z.string().uuid(),
  documentType: expenseDocumentTypeSchema,
  filePath: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number().int(),
  createdAt: z.coerce.date(),
});
export type ExpenseDocumentDto = z.infer<typeof expenseDocumentSchema>;

export const addExpenseDocumentInputSchema = z.object({
  expenseId: z.string().uuid(),
  documentType: expenseDocumentTypeSchema,
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
});
export type AddExpenseDocumentInput = z.infer<typeof addExpenseDocumentInputSchema>;

export const expenseSchema = z.object({
  id: z.string().uuid(),
  expenseNumber: z.string(),
  date: z.coerce.date(),
  label: z.string(),
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  supplierId: z.string().uuid().nullable(),
  supplierName: z.string().nullable(),
  amount: z.number(),
  paymentMethodId: z.string().uuid(),
  paymentMethodLabel: z.string(),
  // Extension du 2026-07-30 (retour du porteur du projet) — caisse/session d'où la dépense a été payée,
  // facultatif (une dépense n'est pas toujours payée depuis une caisse), nécessaire pour les rapports de
  // caisse par caisse physique.
  cashRegisterSessionId: z.string().uuid().nullable(),
  cashRegisterName: z.string().nullable(),
  responsibleUserId: z.string().uuid(),
  responsibleUserName: z.string(),
  observations: z.string().nullable(),
  status: expenseStatusSchema,
  approvedByName: z.string().nullable(),
  approvedAt: z.coerce.date().nullable(),
  rejectedReason: z.string().nullable(),
  journalEntryId: z.string().uuid().nullable(),
  createdByName: z.string(),
  createdAt: z.coerce.date(),
  documents: z.array(expenseDocumentSchema),
});
export type ExpenseDto = z.infer<typeof expenseSchema>;

export const createExpenseInputSchema = z.object({
  date: z.coerce.date(),
  label: z.string().min(1),
  categoryId: z.string().uuid(),
  supplierId: z.string().uuid().nullish(),
  amount: z.number().positive(),
  paymentMethodId: z.string().uuid(),
  cashRegisterSessionId: z.string().uuid().nullish(),
  responsibleUserId: z.string().uuid(),
  observations: z.string().nullish(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;

export const updateExpenseInputSchema = createExpenseInputSchema.partial().extend({ id: z.string().uuid() });
export type UpdateExpenseInput = z.infer<typeof updateExpenseInputSchema>;

export const expenseIdInputSchema = z.object({ id: z.string().uuid() });

export const rejectExpenseInputSchema = z.object({ id: z.string().uuid(), reason: z.string().min(1) });
export type RejectExpenseInput = z.infer<typeof rejectExpenseInputSchema>;

export const cancelExpenseInputSchema = z.object({ id: z.string().uuid(), reason: z.string().min(1) });
export type CancelExpenseInput = z.infer<typeof cancelExpenseInputSchema>;

export const listExpensesInputSchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  cashRegisterSessionId: z.string().uuid().optional(),
  status: expenseStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(20),
  sortBy: z.enum(["date", "amount", "expenseNumber"]).default("date"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});
export type ListExpensesInput = z.infer<typeof listExpensesInputSchema>;

export const listExpensesResultSchema = z.object({
  items: z.array(expenseSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type ListExpensesResult = z.infer<typeof listExpensesResultSchema>;
