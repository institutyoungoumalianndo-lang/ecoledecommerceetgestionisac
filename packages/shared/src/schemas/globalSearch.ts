import { z } from "zod";

/** Recherche globale (refonte UI/UX, phase finale, 2026-07-30) — une seule zone de recherche
 * couvrant plusieurs modules à la fois, chaque catégorie visible uniquement si l'utilisateur
 * possède déjà la permission de lecture du module correspondant. */
export const globalSearchInputSchema = z.object({ query: z.string().min(1).max(200) });
export type GlobalSearchInput = z.infer<typeof globalSearchInputSchema>;

export const globalSearchResultItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  sublabel: z.string().nullable(),
});
export type GlobalSearchResultItem = z.infer<typeof globalSearchResultItemSchema>;

const category = z.array(globalSearchResultItemSchema).nullable();

export const globalSearchResultSchema = z.object({
  students: category,
  teachers: category,
  classes: category,
  filieres: category,
  documents: category,
  payments: category,
});
export type GlobalSearchResult = z.infer<typeof globalSearchResultSchema>;
