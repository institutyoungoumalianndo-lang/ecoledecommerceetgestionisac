import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Couleur au format hexadécimal attendue (ex. #000000).");

/**
 * Moteur de thèmes d'impression — source unique des couleurs de tous les documents imprimables
 * (bulletin de paie, reçus, futurs certificats/attestations/factures...). Réutilisé par le
 * même mécanisme que la personnalisation graphique de l'application (Module 2 §3.15), mais
 * décorrélé : les couleurs de l'interface applicative ne doivent jamais dicter celles des
 * documents officiels imprimés (lisibilité noir/blanc prioritaire sur les documents).
 */
export const paperFormatSchema = z.enum(["A4", "LETTRE"]);
export type PaperFormat = z.infer<typeof paperFormatSchema>;

export const pageOrientationSchema = z.enum(["PORTRAIT", "PAYSAGE"]);
export type PageOrientation = z.infer<typeof pageOrientationSchema>;

export const printThemeSettingsSchema = z.object({
  id: z.string().uuid(),
  presetLabel: z.string(),
  borderColor: hexColor,
  separatorColor: hexColor,
  titleColor: hexColor,
  headerColor: hexColor,
  tableColor: hexColor,
  primaryTextColor: hexColor,
  secondaryTextColor: hexColor,
  boxColor: hexColor,
  totalColor: hexColor,
  netAmountColor: hexColor,
  // Module 9 — moteur PDF centralisé (voir MODULE-09 §2)
  footerColor: hexColor,
  borderWidthPt: z.number().positive(),
  marginMm: z.number().positive(),
  paperFormat: paperFormatSchema,
  orientation: pageOrientationSchema,
});
export type PrintThemeSettingsDto = z.infer<typeof printThemeSettingsSchema>;

export const updatePrintThemeSettingsInputSchema = printThemeSettingsSchema.omit({ id: true }).partial();
export type UpdatePrintThemeSettingsInput = z.infer<typeof updatePrintThemeSettingsInputSchema>;

export type PrintThemeColors = Omit<
  PrintThemeSettingsDto,
  "id" | "presetLabel" | "borderWidthPt" | "marginMm" | "paperFormat" | "orientation"
>;

/** Thèmes prédéfinis (MODULE — moteur de thèmes d'impression) — l'utilisateur peut ensuite ajuster librement (devient "Personnalisé"). */
export const PRINT_THEME_PRESETS: { code: string; label: string; colors: PrintThemeColors }[] = [
  {
    code: "NOIR_ADMINISTRATIF",
    label: "Noir administratif",
    colors: {
      borderColor: "#000000",
      separatorColor: "#000000",
      titleColor: "#000000",
      headerColor: "#000000",
      tableColor: "#000000",
      primaryTextColor: "#000000",
      secondaryTextColor: "#4B5563",
      boxColor: "#000000",
      totalColor: "#000000",
      netAmountColor: "#000000",
      footerColor: "#4B5563",
    },
  },
  {
    code: "BLEU_INSTITUTIONNEL",
    label: "Bleu institutionnel",
    colors: {
      borderColor: "#0B1F44",
      separatorColor: "#0B1F44",
      titleColor: "#0B1F44",
      headerColor: "#0B1F44",
      tableColor: "#0B1F44",
      primaryTextColor: "#1E293B",
      secondaryTextColor: "#475569",
      boxColor: "#0B1F44",
      totalColor: "#0B1F44",
      netAmountColor: "#0B1F44",
      footerColor: "#475569",
    },
  },
];
