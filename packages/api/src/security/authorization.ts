import { SUPER_ADMIN_ROLE_CODE } from "@isac-erp/shared";

/**
 * Le Super Administrateur possède implicitement toutes les permissions
 * (voir MODULE-01-identite-acces.md §3.3) — pas besoin de les lui accorder
 * une à une, ce qui évite qu'un administrateur se verrouille l'accès par
 * erreur de configuration.
 */
export function hasPermission(
  roleCode: string,
  grantedPermissionCodes: ReadonlySet<string>,
  requiredPermission: string
): boolean {
  if (roleCode === SUPER_ADMIN_ROLE_CODE) return true;
  return grantedPermissionCodes.has(requiredPermission);
}
