import { z } from "zod";
import { bulletinAnnuelSchema, bulletinPeriodeSchema } from "./bulletin.js";
import { studentFeeSummarySchema } from "./feeSummary.js";
import { paymentStatusSchema } from "./studentEnrollment.js";

/**
 * Portail web — phase 2, lecture seule étudiant (MODULE-15 §1 décision 2/§4 phase 2). Réutilise les
 * DTO existants (bulletins, résumé de frais) tels quels ; seule la note (`Note`, sans DTO d'affichage
 * dédié côté personnel — `noteSchema` porte les valeurs brutes sans le nom de la matière) reçoit une
 * forme spécifique ici, enrichie pour l'affichage direct côté étudiant.
 */
export const portalStudentNoteSchema = z.object({
  id: z.string().uuid(),
  subjectName: z.string(),
  coefficient: z.number(),
  academicPeriodLabel: z.string(),
  noteOrale: z.number().nullable(),
  noteEcrite: z.number().nullable(),
  noteComposition: z.number().nullable(),
  noteFinale: z.number().nullable(),
  saisieLe: z.coerce.date(),
});
export type PortalStudentNote = z.infer<typeof portalStudentNoteSchema>;

export const portalStudentBulletinsSchema = z.object({
  periode: z.array(bulletinPeriodeSchema),
  annuel: z.array(bulletinAnnuelSchema),
});
export type PortalStudentBulletins = z.infer<typeof portalStudentBulletinsSchema>;

export const portalStudentFeeSummarySchema = studentFeeSummarySchema.extend({
  paymentStatus: paymentStatusSchema,
});
export type PortalStudentFeeSummary = z.infer<typeof portalStudentFeeSummarySchema>;

export const portalScheduleInputSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type PortalScheduleInput = z.infer<typeof portalScheduleInputSchema>;
