import { z } from "zod";

/**
 * Schéma partagé front/back du bilan de santé de l'installation locale.
 * Utilisé par packages/api pour répondre, et par apps/desktop pour valider
 * la réponse reçue — une seule source de vérité pour ce contrat.
 */
export const healthCheckSchema = z.object({
  status: z.enum(["ok", "error"]),
  database: z.boolean(),
  timestamp: z.string(),
});

export type HealthCheck = z.infer<typeof healthCheckSchema>;
