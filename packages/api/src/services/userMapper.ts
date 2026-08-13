import type { Prisma } from "@isac-erp/db";
import type { PublicUser } from "@isac-erp/shared";

export const userWithRoleInclude = {
  roles: { include: { role: true } },
} satisfies Prisma.UserInclude;

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userWithRoleInclude }>;

/**
 * Convertit une ligne User (avec ses relations user_roles) en vue publique
 * API. Ne jamais laisser passwordHash atteindre le client — ce mapper est le
 * seul endroit autorisé à construire un PublicUser.
 */
export function toPublicUser(user: UserWithRoles): PublicUser {
  const firstRole = user.roles[0]?.role ?? null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    phone: user.phone,
    jobTitle: user.jobTitle,
    photoPath: user.photoPath,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    role: firstRole ? { id: firstRole.id, code: firstRole.code, label: firstRole.label } : null,
  };
}
