import { z } from "zod";
import { passwordSchema } from "./password.js";

/**
 * Clé d'activation d'installation (2026-08-10, retour du porteur du projet, ADR-054) — un "stock" de
 * clés générées à l'avance par le Super Administrateur, chacune pré-associée à un rôle. Demandée au
 * tout premier lancement de l'application sur un poste neuf, avant l'écran de connexion normal :
 * une clé valide crée le compte du collaborateur avec le rôle déjà choisi, puis se consomme
 * définitivement (usage unique) — la connexion se fait ensuite normalement par identifiant/mot de
 * passe, comme n'importe quel autre compte (Module 1).
 */

export const activationKeyStatusSchema = z.enum(["UNUSED", "USED"]);
export type ActivationKeyStatus = z.infer<typeof activationKeyStatusSchema>;

export const activationKeyDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  status: activationKeyStatusSchema,
  roleId: z.string().uuid(),
  roleLabel: z.string(),
  createdAt: z.date(),
  usedAt: z.date().nullable(),
  usedByName: z.string().nullable(),
});
export type ActivationKeyDto = z.infer<typeof activationKeyDtoSchema>;

export const generateActivationKeysInputSchema = z.object({
  roleId: z.string().uuid(),
  count: z.number().int().min(1).max(50),
});
export type GenerateActivationKeysInput = z.infer<typeof generateActivationKeysInputSchema>;

export const redeemActivationKeyInputSchema = z.object({
  code: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().min(3),
  password: passwordSchema,
});
export type RedeemActivationKeyInput = z.infer<typeof redeemActivationKeyInputSchema>;
