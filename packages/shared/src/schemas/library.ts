import { z } from "zod";

/** Voir MODULE-13 §1-2 — catalogue d'ouvrages/exemplaires et emprunts, indépendant de la comptabilité. */

export const bookCopyConditionSchema = z.enum(["BON", "MOYEN", "MAUVAIS"]);
export type BookCopyCondition = z.infer<typeof bookCopyConditionSchema>;

export const bookCopyStatusSchema = z.enum(["DISPONIBLE", "EMPRUNTE", "PERDU", "RETIRE"]);
export type BookCopyStatus = z.infer<typeof bookCopyStatusSchema>;

export const loanStatusSchema = z.enum(["EN_COURS", "RENDU", "PERDU"]);
export type LoanStatus = z.infer<typeof loanStatusSchema>;

/** Référentiel configurable de catégories d'ouvrages — aucune valeur codée en dur. */
export const bookCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isActive: z.boolean(),
});
export type BookCategoryDto = z.infer<typeof bookCategorySchema>;

export const createBookCategoryInputSchema = z.object({ name: z.string().min(1) });
export type CreateBookCategoryInput = z.infer<typeof createBookCategoryInputSchema>;

export const updateBookCategoryInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateBookCategoryInput = z.infer<typeof updateBookCategoryInputSchema>;

/** Fiche d'un titre — voir MODULE-13 §1.1. Indépendante du nombre d'exemplaires possédés. */
export const bookSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  author: z.string().nullable(),
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  description: z.string().nullable(),
  publisher: z.string().nullable(),
  publicationYear: z.number().int().nullable(),
  isbn: z.string().nullable(),
  copyCount: z.number().int(),
  availableCopyCount: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type BookDto = z.infer<typeof bookSchema>;

export const createBookInputSchema = z.object({
  title: z.string().min(1),
  author: z.string().nullish(),
  categoryId: z.string().uuid(),
  description: z.string().nullish(),
  publisher: z.string().nullish(),
  publicationYear: z.number().int().nullish(),
  isbn: z.string().nullish(),
});
export type CreateBookInput = z.infer<typeof createBookInputSchema>;

export const updateBookInputSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  author: z.string().nullish(),
  categoryId: z.string().uuid().optional(),
  description: z.string().nullish(),
  publisher: z.string().nullish(),
  publicationYear: z.number().int().nullish(),
  isbn: z.string().nullish(),
});
export type UpdateBookInput = z.infer<typeof updateBookInputSchema>;

export const bookIdInputSchema = z.object({ id: z.string().uuid() });

export const listBooksInputSchema = z.object({
  categoryId: z.string().uuid().optional(),
  search: z.string().optional(),
});
export type ListBooksInput = z.infer<typeof listBooksInputSchema>;

/** Un exemplaire physique précis d'un ouvrage — voir MODULE-13 §1.1. C'est l'exemplaire, jamais
 * l'ouvrage, qui est emprunté. Jamais supprimé physiquement (§1.3). */
export const bookCopySchema = z.object({
  id: z.string().uuid(),
  inventoryNumber: z.string(),
  bookId: z.string().uuid(),
  bookTitle: z.string(),
  condition: bookCopyConditionSchema,
  status: bookCopyStatusSchema,
  withdrawalReason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type BookCopyDto = z.infer<typeof bookCopySchema>;

export const createBookCopyInputSchema = z.object({
  bookId: z.string().uuid(),
  condition: bookCopyConditionSchema.optional(),
});
export type CreateBookCopyInput = z.infer<typeof createBookCopyInputSchema>;

export const bookCopyIdInputSchema = z.object({ id: z.string().uuid() });

/** Retrait/perte d'un exemplaire (MODULE-13 §1.3) — jamais une suppression physique : le statut passe
 * à PERDU ou RETIRE avec une justification obligatoire. */
export const withdrawBookCopyInputSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["PERDU", "RETIRE"]),
  reason: z.string().min(1, "Justification requise"),
});
export type WithdrawBookCopyInput = z.infer<typeof withdrawBookCopyInputSchema>;

/** Emprunt — voir MODULE-13 §1.2. Emprunteur étudiant/enseignant/employé, un seul renseigné à la fois.
 * "En retard" n'est jamais stocké : calculé à l'affichage depuis `dueDate` (client) pour ne jamais se
 * désynchroniser — voir `isOverdue` calculé côté client à partir de `dueDate`/`returnedAt`/`status`. */
export const loanSchema = z.object({
  id: z.string().uuid(),
  bookCopyId: z.string().uuid(),
  bookCopyInventoryNumber: z.string(),
  bookTitle: z.string(),
  borrowerStudentId: z.string().uuid().nullable(),
  borrowerTeacherId: z.string().uuid().nullable(),
  borrowerEmployeeId: z.string().uuid().nullable(),
  borrowerName: z.string().nullable(),
  loanDate: z.date(),
  dueDate: z.date(),
  returnedAt: z.date().nullable(),
  status: loanStatusSchema,
  createdAt: z.date(),
});
export type LoanDto = z.infer<typeof loanSchema>;

export const createLoanInputSchema = z
  .object({
    bookCopyId: z.string().uuid(),
    borrowerStudentId: z.string().uuid().nullish(),
    borrowerTeacherId: z.string().uuid().nullish(),
    borrowerEmployeeId: z.string().uuid().nullish(),
  })
  .refine(
    (input) => [input.borrowerStudentId, input.borrowerTeacherId, input.borrowerEmployeeId].filter(Boolean).length === 1,
    {
      message: "Un emprunteur (étudiant, enseignant ou employé) est requis — un seul à la fois.",
      path: ["borrowerStudentId"],
    }
  );
export type CreateLoanInput = z.infer<typeof createLoanInputSchema>;

export const returnLoanInputSchema = z.object({ id: z.string().uuid() });
export type ReturnLoanInput = z.infer<typeof returnLoanInputSchema>;

export const listLoansInputSchema = z.object({
  status: loanStatusSchema.optional(),
  overdueOnly: z.boolean().optional(),
});
export type ListLoansInput = z.infer<typeof listLoansInputSchema>;

/** Réglages de la bibliothèque — singleton (MODULE-13 §1.2) : durée d'emprunt par défaut et limite
 * d'emprunts simultanés, tous deux configurables. */
export const librarySettingsSchema = z.object({
  defaultLoanDurationDays: z.number().int().min(1).max(365),
  maxSimultaneousLoans: z.number().int().min(1).max(50),
});
export type LibrarySettingsDto = z.infer<typeof librarySettingsSchema>;

export const updateLibrarySettingsInputSchema = librarySettingsSchema.partial();
export type UpdateLibrarySettingsInput = z.infer<typeof updateLibrarySettingsInputSchema>;
