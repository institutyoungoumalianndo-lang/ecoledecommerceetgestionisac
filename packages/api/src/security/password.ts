import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

const TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const TEMP_PASSWORD_SYMBOLS = "!@#$%*";

export interface PasswordPolicy {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
}

/**
 * Mot de passe temporaire lisible, conforme à la politique configurée (Module 11, 2026-08-06 —
 * remplace la règle fixe "Tmp1" + 10 caractères, qui ne garantissait pas un symbole si la politique
 * l'exige désormais, ni une longueur supérieure au minimum par défaut).
 */
export function generateTemporaryPassword(policy: PasswordPolicy): string {
  let prefix = "Tm";
  if (policy.passwordRequireUppercase) prefix += "A";
  if (policy.passwordRequireNumber) prefix += "9";
  if (policy.passwordRequireSymbol) prefix += TEMP_PASSWORD_SYMBOLS[randomBytes(1)[0]! % TEMP_PASSWORD_SYMBOLS.length];

  const targetLength = Math.max(policy.passwordMinLength + 2, prefix.length + 8);
  let password = prefix;
  const bytes = randomBytes(targetLength);
  while (password.length < targetLength) {
    password += TEMP_PASSWORD_CHARS[bytes[password.length % bytes.length]! % TEMP_PASSWORD_CHARS.length];
  }
  return password;
}

/**
 * Politique de mot de passe renforcée (Module 11 §1.2) — remplace la règle fixe précédemment portée
 * par `passwordSchema` (packages/shared), désormais seulement un baseline côté client ; cette
 * vérification serveur, dynamique selon `SecuritySettings`, est la seule autoritative. Retourne la
 * liste des règles non respectées (vide = conforme).
 */
export function validatePasswordAgainstPolicy(password: string, policy: PasswordPolicy): string[] {
  const errors: string[] = [];
  if (password.length < policy.passwordMinLength) {
    errors.push(`Le mot de passe doit contenir au moins ${policy.passwordMinLength} caractères`);
  }
  if (policy.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une majuscule");
  }
  if (policy.passwordRequireNumber && !/[0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre");
  }
  if (policy.passwordRequireSymbol && !/[^A-Za-z0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un caractère spécial");
  }
  return errors;
}
