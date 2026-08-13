import { z } from "zod";
import { establishmentSettingsSchema, campusSettingsSchema } from "./establishment";
import {
  documentSignatorySchema,
  officialStampSchema,
  themeSettingsSchema,
  documentTemplateSchema,
} from "./branding";
import {
  filiereSchema,
  levelSchema,
  academicYearSchema,
  academicPeriodSchema,
} from "./academicStructure";
import { currencySettingsSchema, regionalSettingsSchema } from "./localization";

/**
 * Export/import du **paramétrage uniquement** (Module 2 §3.17) — distinct
 * d'une sauvegarde complète de base de données (Module 11). Ne contient pas
 * les classes (rattachées aux années, redondant à réimporter séparément) ni
 * les fichiers binaires eux-mêmes (seuls les chemins sont exportés).
 */
export const settingsExportSchema = z.object({
  exportedAt: z.coerce.date(),
  appVersion: z.string(),
  establishment: establishmentSettingsSchema,
  campus: campusSettingsSchema,
  signatories: z.array(documentSignatorySchema),
  officialStamp: officialStampSchema,
  academicYears: z.array(academicYearSchema),
  academicPeriods: z.array(academicPeriodSchema),
  filieres: z.array(filiereSchema),
  levels: z.array(levelSchema),
  currency: currencySettingsSchema,
  regional: regionalSettingsSchema,
  theme: themeSettingsSchema,
  documentTemplates: z.array(documentTemplateSchema),
});
export type SettingsExport = z.infer<typeof settingsExportSchema>;

export const importSettingsInputSchema = z.object({
  data: settingsExportSchema,
});
export type ImportSettingsInput = z.infer<typeof importSettingsInputSchema>;
