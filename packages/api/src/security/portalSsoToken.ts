import { randomBytes } from "node:crypto";

/**
 * Jeton d'ouverture directe du portail Super Administrateur depuis l'application desktop (2026-08-10,
 * retour du porteur du projet). En mémoire, jamais persisté, à usage unique et très courte durée de
 * vie (le temps d'un aller-retour navigateur) — même principe que security/twoFactorChallenge.ts,
 * pas un jeton de session à part entière. Ne concerne que le compte `User` Super Administrateur déjà
 * authentifié dans l'application desktop, jamais un `PortalCredential` (MODULE-15 §1 décision 1). Le
 * serveur API est un processus long-vécu par campus (ADR-007), donc un stockage en mémoire est fiable.
 */
const SSO_TOKEN_TTL_MS = 60_000;

interface PendingSsoToken {
  userId: string;
  expiresAt: number;
}

const pendingSsoTokens = new Map<string, PendingSsoToken>();

export function mintPortalSsoToken(userId: string): string {
  const token = randomBytes(32).toString("hex");
  pendingSsoTokens.set(token, { userId, expiresAt: Date.now() + SSO_TOKEN_TTL_MS });
  return token;
}

/** Valide et consomme le jeton (usage unique) — `null` si absent/expiré. */
export function redeemPortalSsoToken(token: string): string | null {
  const entry = pendingSsoTokens.get(token);
  pendingSsoTokens.delete(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) return null;
  return entry.userId;
}
