import { prisma } from "@isac-erp/db";
import type {
  CreateUserInput,
  PublicUser,
  ResetPasswordOutput,
  UpdateUserInput,
} from "@isac-erp/shared";
import { generateTemporaryPassword, hashPassword, validatePasswordAgainstPolicy } from "../security/password.js";
import { revokeAllUserSessions } from "../security/session.js";
import { getSecuritySettings } from "./securitySettingsService.js";
import { toPublicUser, userWithRoleInclude } from "./userMapper.js";

export async function getUserById(id: string): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({ where: { id }, include: userWithRoleInclude });
  return user ? toPublicUser(user) : null;
}

export async function listUsers(): Promise<PublicUser[]> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: userWithRoleInclude,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return users.map(toPublicUser);
}

export async function createUser(
  input: CreateUserInput,
  actingUserId: string
): Promise<PublicUser> {
  const settings = await getSecuritySettings();
  const violations = validatePasswordAgainstPolicy(input.password, settings);
  if (violations.length > 0) {
    throw new Error(violations.join(" "));
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username.toLowerCase(),
      email: input.email ?? null,
      phone: input.phone ?? null,
      jobTitle: input.jobTitle ?? null,
      photoPath: input.photoPath ?? null,
      passwordHash,
      roles: { create: { roleId: input.roleId, assignedBy: actingUserId } },
    },
    include: userWithRoleInclude,
  });
  return toPublicUser(user);
}

export async function updateUser(input: UpdateUserInput, actingUserId: string): Promise<PublicUser> {
  const { id, roleId, ...fields } = input;

  if (roleId) {
    // Un seul rôle actif par utilisateur (voir MODULE-01 §3.2) : on remplace,
    // on n'additionne jamais.
    await prisma.userRole.deleteMany({ where: { userId: id } });
    await prisma.userRole.create({ data: { userId: id, roleId, assignedBy: actingUserId } });
  }

  const user = await prisma.user.update({
    where: { id },
    data: fields,
    include: userWithRoleInclude,
  });
  return toPublicUser(user);
}

export async function deactivateUser(id: string): Promise<PublicUser> {
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    include: userWithRoleInclude,
  });
  await revokeAllUserSessions(id);
  return toPublicUser(user);
}

export async function reactivateUser(id: string): Promise<PublicUser> {
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: true, failedLoginAttempts: 0, lockedUntil: null },
    include: userWithRoleInclude,
  });
  return toPublicUser(user);
}

/** Suppression logique — voir MODULE-01 §1.4.2 : jamais de suppression physique. */
export async function softDeleteUser(id: string): Promise<void> {
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  await revokeAllUserSessions(id);
}

export async function resetPassword(id: string): Promise<ResetPasswordOutput> {
  const settings = await getSecuritySettings();
  const temporaryPassword = generateTemporaryPassword(settings);
  const passwordHash = await hashPassword(temporaryPassword);
  await prisma.user.update({
    where: { id },
    data: { passwordHash, mustChangePassword: true },
  });
  await revokeAllUserSessions(id);
  return { temporaryPassword };
}
