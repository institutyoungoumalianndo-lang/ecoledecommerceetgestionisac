import { randomBytes } from "node:crypto";
import { prisma } from "@isac-erp/db";
import type { TwoFactorBackupCodesDto, TwoFactorSetupDto, TwoFactorStatusDto } from "@isac-erp/shared";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { hashPassword, verifyPassword } from "../security/password.js";

const ISSUER = "ISAC ERP";
const BACKUP_CODE_COUNT = 8;
const BACKUP_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateBackupCode(): string {
  const bytes = randomBytes(10);
  let code = "";
  for (const b of bytes) code += BACKUP_CODE_CHARS[b % BACKUP_CODE_CHARS.length];
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatusDto> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { totpEnabled: true } });
  return { isEnabled: user.totpEnabled };
}

/**
 * Démarre l'activation — génère un secret et l'enregistre, mais `totpEnabled` reste `false` tant que
 * `confirmTwoFactorSetup` n'a pas vérifié un premier code (évite qu'un utilisateur se verrouille en
 * scannant mal le QR code, voir MODULE-11 §1.2).
 */
export async function startTwoFactorSetup(userId: string): Promise<TwoFactorSetupDto> {
  const secret = authenticator.generateSecret();
  const user = await prisma.user.update({ where: { id: userId }, data: { totpSecret: secret, totpEnabled: false } });
  const otpauthUrl = authenticator.keyuri(user.username, ISSUER, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { secret, otpauthUrl, qrCodeDataUrl };
}

/** Vérifie le premier code, active la 2FA, (re)génère les codes de récupération — affichés une seule fois. */
export async function confirmTwoFactorSetup(userId: string, code: string): Promise<TwoFactorBackupCodesDto> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.totpSecret) {
    throw new Error("Aucune activation en attente — relancez l'activation de la double authentification.");
  }
  if (!authenticator.check(code, user.totpSecret)) {
    throw new Error("Code invalide.");
  }

  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
  await prisma.twoFactorBackupCode.deleteMany({ where: { userId } });

  const codes = Array.from({ length: BACKUP_CODE_COUNT }, () => generateBackupCode());
  for (const plainCode of codes) {
    const codeHash = await hashPassword(plainCode);
    await prisma.twoFactorBackupCode.create({ data: { userId, codeHash } });
  }

  return { codes };
}

export async function disableTwoFactor(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error("Mot de passe incorrect.");

  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: false, totpSecret: null } });
  await prisma.twoFactorBackupCode.deleteMany({ where: { userId } });
}

/** Réservé au Super Administrateur (MODULE-11 §1.2) — débloque un utilisateur ayant perdu son appareil. */
export async function resetTwoFactorForUser(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: false, totpSecret: null } });
  await prisma.twoFactorBackupCode.deleteMany({ where: { userId } });
}

/**
 * Vérifie un code au moment de la connexion — un code TOTP à 6 chiffres, ou en repli un code de
 * récupération à usage unique (jamais réutilisable une fois consommé).
 */
export async function verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.totpSecret) return false;

  if (authenticator.check(code, user.totpSecret)) return true;

  const backupCodes = await prisma.twoFactorBackupCode.findMany({ where: { userId, usedAt: null } });
  for (const backup of backupCodes) {
    if (await verifyPassword(code, backup.codeHash)) {
      await prisma.twoFactorBackupCode.update({ where: { id: backup.id }, data: { usedAt: new Date() } });
      return true;
    }
  }
  return false;
}
