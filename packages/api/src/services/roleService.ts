import { prisma } from "@isac-erp/db";
import type {
  AssignRolePermissionsInput,
  AssignUserRoleInput,
  CreateRoleInput,
  PermissionDto,
  RoleDto,
  UpdateRoleInput,
} from "@isac-erp/shared";

function toRoleDto(role: {
  id: string;
  code: string;
  label: string;
  isSystem: boolean;
  permissions: { permissionId: string }[];
}): RoleDto {
  return {
    id: role.id,
    code: role.code,
    label: role.label,
    isSystem: role.isSystem,
    permissionIds: role.permissions.map((p) => p.permissionId),
  };
}

export async function listRoles(): Promise<RoleDto[]> {
  const roles = await prisma.role.findMany({
    include: { permissions: { select: { permissionId: true } } },
    orderBy: { label: "asc" },
  });
  return roles.map(toRoleDto);
}

export async function listPermissions(): Promise<PermissionDto[]> {
  const permissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
  return permissions.map((p) => ({
    id: p.id,
    code: p.code,
    module: p.module,
    action: p.action,
    label: p.label,
  }));
}

export async function createRole(input: CreateRoleInput): Promise<RoleDto> {
  const role = await prisma.role.create({
    data: { code: input.code, label: input.label, isSystem: false },
    include: { permissions: { select: { permissionId: true } } },
  });
  return toRoleDto(role);
}

export async function updateRole(input: UpdateRoleInput): Promise<RoleDto> {
  const role = await prisma.role.update({
    where: { id: input.id },
    data: { label: input.label },
    include: { permissions: { select: { permissionId: true } } },
  });
  return toRoleDto(role);
}

export async function deleteRole(id: string): Promise<void> {
  const role = await prisma.role.findUniqueOrThrow({ where: { id } });
  if (role.isSystem) {
    throw new Error("Un rôle système ne peut pas être supprimé.");
  }
  const assignedCount = await prisma.userRole.count({ where: { roleId: id } });
  if (assignedCount > 0) {
    throw new Error("Ce rôle est encore attribué à au moins un utilisateur — réattribuez-les avant de le supprimer.");
  }
  await prisma.role.delete({ where: { id } });
}

export async function assignRolePermissions(input: AssignRolePermissionsInput): Promise<RoleDto> {
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: input.roleId } }),
    prisma.rolePermission.createMany({
      data: input.permissionIds.map((permissionId) => ({ roleId: input.roleId, permissionId })),
    }),
  ]);
  const role = await prisma.role.findUniqueOrThrow({
    where: { id: input.roleId },
    include: { permissions: { select: { permissionId: true } } },
  });
  return toRoleDto(role);
}

export async function assignUserRole(input: AssignUserRoleInput, actingUserId: string): Promise<void> {
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: input.userId } }),
    prisma.userRole.create({
      data: { userId: input.userId, roleId: input.roleId, assignedBy: actingUserId },
    }),
  ]);
}
