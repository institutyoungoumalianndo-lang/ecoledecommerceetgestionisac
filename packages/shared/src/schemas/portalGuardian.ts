import { z } from "zod";
import { guardianRelationshipSchema } from "./guardian.js";

/**
 * Portail web — phase 3, lecture seule tuteur/parent (MODULE-15 §1 décision 2/§4 phase 3). Un tuteur
 * peut avoir plusieurs enfants rattachés (`StudentGuardian`) ; chaque écran de lecture (emploi du
 * temps/notes/bulletins/paiement) prend l'identifiant de l'enfant choisi en entrée, toujours vérifié
 * côté serveur contre les enfants réels du tuteur (jamais une confiance aveugle au client).
 */
export const portalGuardianChildSchema = z.object({
  id: z.string().uuid(),
  matricule: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  photoPath: z.string().nullable(),
  className: z.string().nullable(),
  relationship: guardianRelationshipSchema,
});
export type PortalGuardianChild = z.infer<typeof portalGuardianChildSchema>;

export const portalGuardianChildIdInputSchema = z.object({ studentId: z.string().uuid() });
export type PortalGuardianChildIdInput = z.infer<typeof portalGuardianChildIdInputSchema>;

export const portalGuardianChildScheduleInputSchema = portalGuardianChildIdInputSchema.extend({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type PortalGuardianChildScheduleInput = z.infer<typeof portalGuardianChildScheduleInputSchema>;
