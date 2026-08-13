import { prisma, type Prisma } from "@isac-erp/db";
import type { SecuritySettingsDto, UpdateSecuritySettingsInput } from "@isac-erp/shared";

/**
 * Ligne singleton — créée par le seed (packages/db/prisma/seed.ts). Si elle
 * venait à manquer (installation non seedée), on la recrée avec les valeurs
 * par défaut plutôt que d'échouer.
 */
async function getOrCreateRow() {
  const existing = await prisma.securitySettings.findFirst();
  if (existing) return existing;
  return prisma.securitySettings.create({ data: {} });
}

function toDto(row: Prisma.SecuritySettingsGetPayload<Record<string, never>>): SecuritySettingsDto {
  return {
    maxFailedLoginAttempts: row.maxFailedLoginAttempts,
    accountLockoutMinutes: row.accountLockoutMinutes,
    sessionInactivityTimeoutMin: row.sessionInactivityTimeoutMin,
    passwordExpirationEnabled: row.passwordExpirationEnabled,
    passwordExpirationDays: row.passwordExpirationDays,
    passwordMinLength: row.passwordMinLength,
    passwordRequireUppercase: row.passwordRequireUppercase,
    passwordRequireNumber: row.passwordRequireNumber,
    passwordRequireSymbol: row.passwordRequireSymbol,
  };
}

export async function getSecuritySettings(): Promise<SecuritySettingsDto> {
  return toDto(await getOrCreateRow());
}

export async function updateSecuritySettings(
  input: UpdateSecuritySettingsInput
): Promise<SecuritySettingsDto> {
  const row = await getOrCreateRow();
  const updated = await prisma.securitySettings.update({
    where: { id: row.id },
    data: input,
  });
  return toDto(updated);
}
