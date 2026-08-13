import { z } from "zod";
import { passwordSchema } from "./password";

export const roleSummarySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
});
export type RoleSummary = z.infer<typeof roleSummarySchema>;

/** Vue utilisateur exposée par l'API — ne contient jamais passwordHash. */
export const publicUserSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  jobTitle: z.string().nullable(),
  photoPath: z.string().nullable(),
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
  createdAt: z.coerce.date(),
  role: roleSummarySchema.nullable(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const createUserInputSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  jobTitle: z.string().nullish(),
  photoPath: z.string().nullish(),
  roleId: z.string().uuid(),
  password: passwordSchema,
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().nullish(),
  phone: z.string().nullish(),
  jobTitle: z.string().nullish(),
  photoPath: z.string().nullish(),
  roleId: z.string().uuid().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const resetPasswordInputSchema = z.object({
  userId: z.string().uuid(),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

export const resetPasswordOutputSchema = z.object({
  temporaryPassword: z.string(),
});
export type ResetPasswordOutput = z.infer<typeof resetPasswordOutputSchema>;

export const userIdInputSchema = z.object({ id: z.string().uuid() });
