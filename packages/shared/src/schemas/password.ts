import { z } from "zod";

/**
 * Politique de mot de passe reprise de l'ancien projet (voir
 * docs/RAPPORT_ANALYSE_ISAC_ERP.md) : au moins 8 caractères, 1 majuscule,
 * 1 chiffre. Partagée front/back pour un seul point de vérité.
 */
export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre");
