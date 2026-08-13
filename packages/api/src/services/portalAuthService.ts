import { prisma, type Prisma } from "@isac-erp/db";
import type { PortalChangePasswordInput, PortalLoginInput, PortalLoginOutput, PortalSessionInfo } from "@isac-erp/shared";
import { hashPassword, validatePasswordAgainstPolicy, verifyPassword } from "../security/password.js";
import { computeFailedLoginUpdate, isAccountLocked } from "../security/lockout.js";
import { createPortalSession, deletePortalSession } from "../security/portalSession.js";
import { getSecuritySettings } from "./securitySettingsService.js";
import { logAction } from "./auditService.js";

/**
 * Authentification du portail web (MODULE-15 §2-3) — identités externes (étudiant/tuteur/enseignant),
 * jamais mêlées à `authService.ts` (personnel). Réutilise les mêmes briques de sécurité (hash bcrypt,
 * verrouillage après échecs répétés, politique de mot de passe) que le personnel, sans dupliquer la
 * logique — seul le stockage (`PortalCredential`/`PortalSession`) est distinct.
 */

const credentialInclude = {
  student: true,
  guardian: true,
  teacher: true,
} satisfies Prisma.PortalCredentialInclude;

type CredentialWithPrincipal = Prisma.PortalCredentialGetPayload<{ include: typeof credentialInclude }>;

export function resolveDisplayName(credential: CredentialWithPrincipal): string {
  if (credential.student) return `${credential.student.firstName} ${credential.student.lastName}`.trim();
  if (credential.teacher) return `${credential.teacher.firstName} ${credential.teacher.lastName}`.trim();
  if (credential.guardian) return `${credential.guardian.firstName} ${credential.guardian.lastName}`.trim();
  return credential.username;
}

export function resolvePrincipalType(credential: CredentialWithPrincipal): "STUDENT" | "GUARDIAN" | "TEACHER" {
  if (credential.studentId) return "STUDENT";
  if (credential.teacherId) return "TEACHER";
  return "GUARDIAN";
}

const GENERIC_LOGIN_ERROR = "Identifiants incorrects.";

export async function portalLogin(input: PortalLoginInput, ipAddress?: string): Promise<PortalLoginOutput> {
  const settings = await getSecuritySettings();

  const credential = await prisma.portalCredential.findUnique({
    where: { username: input.username },
    include: credentialInclude,
  });

  if (!credential || !credential.isActive) {
    await logAction({
      action: "PORTAL_LOGIN_FAILURE",
      module: "PORTAIL_WEB",
      result: "ECHEC",
      usernameInput: input.username,
      details: { reason: "identifiants_invalides" },
      ipAddress,
    });
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  if (isAccountLocked(credential.lockedUntil)) {
    await logAction({
      action: "PORTAL_LOGIN_FAILURE",
      module: "PORTAIL_WEB",
      result: "ECHEC",
      usernameInput: input.username,
      details: { reason: "compte_verrouille" },
      ipAddress,
    });
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  const passwordOk = await verifyPassword(input.password, credential.passwordHash);
  if (!passwordOk) {
    const update = computeFailedLoginUpdate(credential.failedAttempts, settings.maxFailedLoginAttempts, settings.accountLockoutMinutes);
    await prisma.portalCredential.update({
      where: { id: credential.id },
      data: { failedAttempts: update.failedLoginAttempts, lockedUntil: update.didLock ? update.lockedUntil : credential.lockedUntil },
    });
    await logAction({
      action: "PORTAL_LOGIN_FAILURE",
      module: "PORTAIL_WEB",
      result: "ECHEC",
      usernameInput: input.username,
      details: { reason: "mot_de_passe_incorrect", verrouille: update.didLock },
      ipAddress,
    });
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  await prisma.portalCredential.update({ where: { id: credential.id }, data: { failedAttempts: 0, lockedUntil: null } });

  const sessionToken = await createPortalSession(credential.id);

  await logAction({
    action: "PORTAL_LOGIN_SUCCESS",
    module: "PORTAIL_WEB",
    result: "SUCCES",
    usernameInput: input.username,
    ipAddress,
  });

  return {
    sessionToken,
    principalType: resolvePrincipalType(credential),
    displayName: resolveDisplayName(credential),
    mustChangePassword: credential.mustChangePassword,
  };
}

export async function portalLogout(sessionToken: string): Promise<void> {
  await deletePortalSession(sessionToken);
}

export async function getPortalSessionInfo(credentialId: string): Promise<PortalSessionInfo> {
  const credential = await prisma.portalCredential.findUniqueOrThrow({ where: { id: credentialId }, include: credentialInclude });
  return {
    principalType: resolvePrincipalType(credential),
    displayName: resolveDisplayName(credential),
    mustChangePassword: credential.mustChangePassword,
  };
}

/** Changement de mot de passe obligatoire à la première connexion (MODULE-15 §2.2) — exploite enfin
 * `mustChangePassword`, déjà présent sur `User` mais jamais appliqué dans l'application desktop. */
export async function portalChangePassword(credentialId: string, input: PortalChangePasswordInput): Promise<void> {
  const credential = await prisma.portalCredential.findUniqueOrThrow({ where: { id: credentialId } });

  const currentOk = await verifyPassword(input.currentPassword, credential.passwordHash);
  if (!currentOk) {
    throw new Error("Mot de passe actuel incorrect.");
  }

  const settings = await getSecuritySettings();
  const violations = validatePasswordAgainstPolicy(input.newPassword, settings);
  if (violations.length > 0) {
    throw new Error(violations.join(" "));
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.portalCredential.update({
    where: { id: credentialId },
    data: { passwordHash, mustChangePassword: false },
  });
}
