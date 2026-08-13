import { z } from "zod";
import { PERMISSION_ACTIONS } from "../constants/permissions";

export const permissionActionSchema = z.enum(PERMISSION_ACTIONS);

export const permissionSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  module: z.string(),
  action: permissionActionSchema,
  label: z.string(),
});
export type PermissionDto = z.infer<typeof permissionSchema>;

export const roleSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  isSystem: z.boolean(),
  permissionIds: z.array(z.string().uuid()),
});
export type RoleDto = z.infer<typeof roleSchema>;

export const createRoleInputSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Code en majuscules, chiffres et underscores uniquement"),
  label: z.string().min(1),
});
export type CreateRoleInput = z.infer<typeof createRoleInputSchema>;

export const updateRoleInputSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1),
});
export type UpdateRoleInput = z.infer<typeof updateRoleInputSchema>;

export const roleIdInputSchema = z.object({ id: z.string().uuid() });

export const assignRolePermissionsInputSchema = z.object({
  roleId: z.string().uuid(),
  permissionIds: z.array(z.string().uuid()),
});
export type AssignRolePermissionsInput = z.infer<typeof assignRolePermissionsInputSchema>;

export const assignUserRoleInputSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});
export type AssignUserRoleInput = z.infer<typeof assignUserRoleInputSchema>;
