import { z } from "zod";

/** Voir MODULE-14 §1-2 — registre des biens/matériel de l'établissement, indépendant de la comptabilité. */

export const assetConditionSchema = z.enum(["BON", "MOYEN", "MAUVAIS"]);
export type AssetCondition = z.infer<typeof assetConditionSchema>;

export const assetStatusSchema = z.enum(["EN_SERVICE", "EN_PANNE", "EN_REPARATION", "REFORME", "PERDU_VOLE"]);
export type AssetStatus = z.infer<typeof assetStatusSchema>;

export const assetMaintenanceStatusSchema = z.enum(["PLANIFIEE", "TERMINEE"]);
export type AssetMaintenanceStatus = z.infer<typeof assetMaintenanceStatusSchema>;

/** Référentiel de lieux dédié à l'inventaire (bâtiment/étage/désignation) — distinct de `Room` (Module 5.2). */
export const assetLocationSchema = z.object({
  id: z.string().uuid(),
  building: z.string(),
  floor: z.string().nullable(),
  label: z.string(),
  isActive: z.boolean(),
});
export type AssetLocationDto = z.infer<typeof assetLocationSchema>;

export const createAssetLocationInputSchema = z.object({
  building: z.string().min(1),
  floor: z.string().nullish(),
  label: z.string().min(1),
});
export type CreateAssetLocationInput = z.infer<typeof createAssetLocationInputSchema>;

export const updateAssetLocationInputSchema = z.object({
  id: z.string().uuid(),
  building: z.string().min(1).optional(),
  floor: z.string().nullish(),
  label: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateAssetLocationInput = z.infer<typeof updateAssetLocationInputSchema>;

export const assetLocationIdInputSchema = z.object({ id: z.string().uuid() });

/** Référentiel configurable de catégories de biens — aucune valeur codée en dur. */
export const assetCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isActive: z.boolean(),
});
export type AssetCategoryDto = z.infer<typeof assetCategorySchema>;

export const createAssetCategoryInputSchema = z.object({ name: z.string().min(1) });
export type CreateAssetCategoryInput = z.infer<typeof createAssetCategoryInputSchema>;

export const updateAssetCategoryInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateAssetCategoryInput = z.infer<typeof updateAssetCategoryInputSchema>;

export const assetCategoryIdInputSchema = z.object({ id: z.string().uuid() });

/** Fiche de bien — voir MODULE-14 §1.1. Noms résolus (catégorie/lieu/responsable) pour affichage direct. */
export const assetSchema = z.object({
  id: z.string().uuid(),
  inventoryNumber: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  photoPath: z.string().nullable(),
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  locationId: z.string().uuid().nullable(),
  locationLabel: z.string().nullable(),
  responsibleEmployeeId: z.string().uuid().nullable(),
  responsibleTeacherId: z.string().uuid().nullable(),
  responsibleName: z.string().nullable(),
  condition: assetConditionSchema,
  status: assetStatusSchema,
  acquisitionValue: z.number().nullable(),
  acquisitionDate: z.date().nullable(),
  reformJustification: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type AssetDto = z.infer<typeof assetSchema>;

export const createAssetInputSchema = z.object({
  label: z.string().min(1),
  description: z.string().nullish(),
  photoPath: z.string().nullish(),
  categoryId: z.string().uuid(),
  locationId: z.string().uuid().nullish(),
  responsibleEmployeeId: z.string().uuid().nullish(),
  responsibleTeacherId: z.string().uuid().nullish(),
  condition: assetConditionSchema.optional(),
  acquisitionValue: z.number().nonnegative().nullish(),
  acquisitionDate: z.date().nullish(),
});
export type CreateAssetInput = z.infer<typeof createAssetInputSchema>;

export const updateAssetInputSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).optional(),
  description: z.string().nullish(),
  photoPath: z.string().nullish(),
  categoryId: z.string().uuid().optional(),
  locationId: z.string().uuid().nullish(),
  responsibleEmployeeId: z.string().uuid().nullish(),
  responsibleTeacherId: z.string().uuid().nullish(),
  condition: assetConditionSchema.optional(),
  acquisitionValue: z.number().nonnegative().nullish(),
  acquisitionDate: z.date().nullish(),
});
export type UpdateAssetInput = z.infer<typeof updateAssetInputSchema>;

export const assetIdInputSchema = z.object({ id: z.string().uuid() });

export const listAssetsInputSchema = z.object({
  categoryId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: assetStatusSchema.optional(),
  search: z.string().optional(),
});
export type ListAssetsInput = z.infer<typeof listAssetsInputSchema>;

/**
 * Réforme/mise au rebut (MODULE-14 §1.4) — jamais une suppression physique : le statut passe à
 * REFORME ou PERDU_VOLE avec une justification obligatoire, tracée dans l'historique de mouvements.
 */
export const reformAssetInputSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["REFORME", "PERDU_VOLE"]),
  justification: z.string().min(1, "Justification requise"),
});
export type ReformAssetInput = z.infer<typeof reformAssetInputSchema>;

/** Historique des changements de localisation/responsable/état/statut — voir MODULE-14 §1.2. */
export const assetMovementSchema = z.object({
  id: z.string().uuid(),
  field: z.string(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  note: z.string().nullable(),
  changedByName: z.string().nullable(),
  createdAt: z.date(),
});
export type AssetMovementDto = z.infer<typeof assetMovementSchema>;

/** Historique de maintenance/réparations, avec coûts — voir MODULE-14 §1.3. Indépendant de la comptabilité. */
export const assetMaintenanceSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  cost: z.number().nullable(),
  performedBy: z.string().nullable(),
  status: assetMaintenanceStatusSchema,
  scheduledAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  createdByName: z.string().nullable(),
  createdAt: z.date(),
});
export type AssetMaintenanceDto = z.infer<typeof assetMaintenanceSchema>;

export const createAssetMaintenanceInputSchema = z.object({
  assetId: z.string().uuid(),
  description: z.string().min(1),
  cost: z.number().nonnegative().nullish(),
  performedBy: z.string().nullish(),
  status: assetMaintenanceStatusSchema.optional(),
  scheduledAt: z.date().nullish(),
  completedAt: z.date().nullish(),
});
export type CreateAssetMaintenanceInput = z.infer<typeof createAssetMaintenanceInputSchema>;

export const updateAssetMaintenanceInputSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).optional(),
  cost: z.number().nonnegative().nullish(),
  performedBy: z.string().nullish(),
  status: assetMaintenanceStatusSchema.optional(),
  scheduledAt: z.date().nullish(),
  completedAt: z.date().nullish(),
});
export type UpdateAssetMaintenanceInput = z.infer<typeof updateAssetMaintenanceInputSchema>;

export const assetMaintenanceIdInputSchema = z.object({ id: z.string().uuid() });
