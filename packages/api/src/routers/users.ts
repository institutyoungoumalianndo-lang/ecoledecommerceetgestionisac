import {
  createUserInputSchema,
  publicUserSchema,
  resetPasswordOutputSchema,
  updateUserInputSchema,
  userIdInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as userService from "../services/userService.js";
import { resetTwoFactorForUser } from "../services/twoFactorService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const usersRouter = router({
  list: permissionProcedure("UTILISATEURS:LECTURE")
    .output(z.array(publicUserSchema))
    .query(() => userService.listUsers()),

  create: permissionProcedure("UTILISATEURS:CREATION")
    .input(createUserInputSchema)
    .output(publicUserSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await userService.createUser(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "USER_CREATE",
        module: "IDENTITE",
        entityType: "User",
        entityId: user.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return user;
    }),

  update: permissionProcedure("UTILISATEURS:MODIFICATION")
    .input(updateUserInputSchema)
    .output(publicUserSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await userService.updateUser(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "USER_UPDATE",
        module: "IDENTITE",
        entityType: "User",
        entityId: user.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return user;
    }),

  deactivate: permissionProcedure("UTILISATEURS:ADMINISTRATION")
    .input(userIdInputSchema)
    .output(publicUserSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await userService.deactivateUser(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "USER_DEACTIVATE",
        module: "IDENTITE",
        entityType: "User",
        entityId: user.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return user;
    }),

  reactivate: permissionProcedure("UTILISATEURS:ADMINISTRATION")
    .input(userIdInputSchema)
    .output(publicUserSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await userService.reactivateUser(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "USER_REACTIVATE",
        module: "IDENTITE",
        entityType: "User",
        entityId: user.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return user;
    }),

  softDelete: permissionProcedure("UTILISATEURS:SUPPRESSION")
    .input(userIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      await userService.softDeleteUser(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "USER_DELETE",
        module: "IDENTITE",
        entityType: "User",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return { success: true };
    }),

  resetPassword: permissionProcedure("UTILISATEURS:MODIFICATION")
    .input(userIdInputSchema)
    .output(resetPasswordOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await userService.resetPassword(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "PASSWORD_RESET",
        module: "IDENTITE",
        entityType: "User",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return result;
    }),

  /** Débloque un utilisateur ayant perdu son appareil 2FA (MODULE-11 §1.2) — réservé aux administrateurs. */
  resetTwoFactor: permissionProcedure("UTILISATEURS:ADMINISTRATION")
    .input(userIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      await resetTwoFactorForUser(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "TWO_FACTOR_ADMIN_RESET",
        module: "IDENTITE",
        entityType: "User",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return { success: true };
    }),
});
