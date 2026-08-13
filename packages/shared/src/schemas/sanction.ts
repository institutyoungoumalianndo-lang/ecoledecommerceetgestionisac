import { z } from "zod";

export const sanctionTypeSchema = z.enum(["AVERTISSEMENT", "BLAME", "RETENUE", "EXCLUSION_TEMPORAIRE", "EXCLUSION_DEFINITIVE", "AUTRE"]);
export type SanctionType = z.infer<typeof sanctionTypeSchema>;

/** Sanction disciplinaire d'un étudiant (2026-08-03, retour du porteur du projet) — l'avis PDF officiel
 * (DocumentType.SANCTION) est généré séparément via le moteur centralisé (Module 9), qui porte sa
 * propre numérotation ; ce DTO ne duplique donc aucun numéro de dossier. */
export const sanctionSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  type: sanctionTypeSchema,
  motif: z.string(),
  description: z.string().nullable(),
  dureeJours: z.number().int().nullable(),
  date: z.coerce.date(),
  annule: z.boolean(),
  annuleReason: z.string().nullable(),
  annuleLe: z.coerce.date().nullable(),
  issuedByName: z.string(),
  createdAt: z.coerce.date(),
});
export type SanctionDto = z.infer<typeof sanctionSchema>;

export const listSanctionsByStudentInputSchema = z.object({ studentId: z.string().uuid() });
export type ListSanctionsByStudentInput = z.infer<typeof listSanctionsByStudentInputSchema>;

export const createSanctionInputSchema = z.object({
  studentId: z.string().uuid(),
  type: sanctionTypeSchema,
  motif: z.string().min(1, "Le motif est requis."),
  description: z.string().nullish(),
  dureeJours: z.number().int().positive().nullish(),
  date: z.coerce.date(),
});
export type CreateSanctionInput = z.infer<typeof createSanctionInputSchema>;

export const annulerSanctionInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1, "Le motif d'annulation est requis."),
});
export type AnnulerSanctionInput = z.infer<typeof annulerSanctionInputSchema>;
