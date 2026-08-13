import {
  assignRolePermissionsInputSchema,
  assignUserRoleInputSchema,
  createRoleInputSchema,
  permissionSchema,
  roleIdInputSchema,
  roleSchema,
  updateRoleInputSchema,
} from "@isac-erp/shared";
import { z } from "zod";
import * as roleService from "../services/roleService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const rolesRouter = router({
  list: permissionProcedure("ROLES:LECTURE")
    .output(z.array(roleSchema))
    .query(() => roleService.listRoles()),

  listPermissions: permissionProcedure("PERMISSIONS:LECTURE")
    .output(z.array(permissionSchema))
    .query(() => roleService.listPermissions()),

  create: permissionProcedure("ROLES:CREATION")
    .input(createRoleInputSchema)
    .output(roleSchema)
    .mutation(async ({ input, ctx }) => {
      const role = await roleService.createRole(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ROLE_CREATE",
        module: "IDENTITE",
        entityType: "Role",
        entityId: role.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return role;
    }),

  update: permissionProcedure("ROLES:MODIFICATION")
    .input(updateRoleInputSchema)
    .output(roleSchema)
    .mutation(async ({ input, ctx }) => {
      const role = await roleService.updateRole(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ROLE_UPDATE",
        module: "IDENTITE",
        entityType: "Role",
        entityId: role.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return role;
    }),

  delete: permissionProcedure("ROLES:SUPPRESSION")
    .input(roleIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      await roleService.deleteRole(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "ROLE_DELETE",
        module: "IDENTITE",
        entityType: "Role",
        entityId: input.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return { success: true };
    }),

  assignPermissions: permissionProcedure("ROLES:ADMINISTRATION")
    .input(assignRolePermissionsInputSchema)
    .output(roleSchema)
    .mutation(async ({ input, ctx }) => {
      const role = await roleService.assignRolePermissions(input);
      await logAction({
        userId: ctx.session.userId,
        action: "PERMISSION_GRANT",
        module: "IDENTITE",
        entityType: "Role",
        entityId: role.id,
        result: "SUCCES",
        details: { permissionIds: input.permissionIds },
        ipAddress: ctx.ipAddress,
      });
      return role;
    }),

  assignUserRole: permissionProcedure("UTILISATEURS:MODIFICATION")
    .input(assignUserRoleInputSchema)
    .mutation(async ({ input, ctx }) => {
      await roleService.assignUserRole(input, ctx.session.userId);
      await logAction({
        userId: ctx.session.userId,
        action: "USER_UPDATE",
        module: "IDENTITE",
        entityType: "User",
        entityId: input.userId,
        result: "SUCCES",
        details: { roleId: input.roleId },
        ipAddress: ctx.ipAddress,
      });
      return { success: true };
    }),
});
