import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Couleur au format hexadécimal attendue (ex. #000000).");

export const headerAlignmentSchema = z.enum(["LEFT", "CENTER", "RIGHT"]);
export type HeaderAlignment = z.infer<typeof headerAlignmentSchema>;

/**
 * En-tête institutionnel — singleton, source unique du bloc République/devise nationale/école/institut/
 * slogan affiché en tête de tous les documents officiels générés par le moteur PDF (MODULE-09 §1.1).
 * Rien n'est codé en dur : chaque ligne, sa couleur et sa mise en forme sont configurables.
 */
export const institutionalHeaderSettingsSchema = z.object({
  id: z.string().uuid(),
  republicLine: z.string(),
  republicColor: hexColor,
  mottoPart1: z.string(),
  mottoPart1Color: hexColor,
  mottoPart2: z.string(),
  mottoPart2Color: hexColor,
  mottoPart3: z.string(),
  mottoPart3Color: hexColor,
  schoolNameLine: z.string(),
  schoolNameColor: hexColor,
  schoolNameBold: z.boolean(),
  schoolNameFontSize: z.number().int().positive(),
  instituteNameLine: z.string(),
  instituteNameColor: hexColor,
  taglineLine: z.string(),
  taglineColor: hexColor,
  taglineItalic: z.boolean(),
  fontFamily: z.string(),
  lineSpacing: z.number().positive(),
  alignment: headerAlignmentSchema,
});
export type InstitutionalHeaderSettingsDto = z.infer<typeof institutionalHeaderSettingsSchema>;

export const updateInstitutionalHeaderSettingsInputSchema = institutionalHeaderSettingsSchema
  .omit({ id: true })
  .partial();
export type UpdateInstitutionalHeaderSettingsInput = z.infer<
  typeof updateInstitutionalHeaderSettingsInputSchema
>;
