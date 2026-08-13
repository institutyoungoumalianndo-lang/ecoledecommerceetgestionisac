import { z } from "zod";

/**
 * Groupe pédagogique — raccourci de saisie pour les cours mutualisés/tronc commun (voir
 * MODULE-05.2 §1.6). Préremplit les classes d'une séance, ne les contraint jamais après création.
 */
export const pedagogicalGroupSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  isActive: z.boolean(),
  classIds: z.array(z.string().uuid()),
  classNames: z.array(z.string()),
});
export type PedagogicalGroupDto = z.infer<typeof pedagogicalGroupSchema>;

export const createPedagogicalGroupInputSchema = z.object({
  label: z.string().min(1),
  classIds: z.array(z.string().uuid()).min(1, "Au moins une classe est requise."),
});
export type CreatePedagogicalGroupInput = z.infer<typeof createPedagogicalGroupInputSchema>;

export const updatePedagogicalGroupInputSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).optional(),
  classIds: z.array(z.string().uuid()).min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePedagogicalGroupInput = z.infer<typeof updatePedagogicalGroupInputSchema>;

export const pedagogicalGroupIdInputSchema = z.object({ id: z.string().uuid() });

export const listPedagogicalGroupsInputSchema = z.object({ activeOnly: z.boolean().optional() });
export type ListPedagogicalGroupsInput = z.infer<typeof listPedagogicalGroupsInputSchema>;
