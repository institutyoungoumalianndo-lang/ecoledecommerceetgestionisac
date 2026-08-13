import { randomBytes } from "node:crypto";

/**
 * Défi 2FA en attente entre la vérification du mot de passe et celle du code TOTP (MODULE-11 §1.2).
 * En mémoire, jamais persisté : c'est une étape transitoire de connexion (5 min max), pas un objet
 * métier — même principe que le jeton de session mais sans droits applicatifs. Le serveur API est un
 * processus long-vécu par campus (ADR-007), donc un stockage en mémoire est fiable ici (pas de
 * redémarrage entre la vérification du mot de passe et celle du code, sauf en cas de coupure — dans ce
 * cas l'utilisateur recommence simplement la connexion).
 */
interface PendingChallenge {
  userId: string;
  expiresAt: number;
  attempts: number;
}

const CHALLENGE_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;

const pendingChallenges = new Map<string, PendingChallenge>();

export function createPendingChallenge(userId: string): string {
  const token = randomBytes(32).toString("hex");
  pendingChallenges.set(token, { userId, expiresAt: Date.now() + CHALLENGE_TTL_MS, attempts: 0 });
  return token;
}

/** Lit le défi sans le consommer — `null` si absent/expiré (et le purge dans ce cas). */
export function peekPendingChallenge(token: string): string | null {
  const entry = pendingChallenges.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    pendingChallenges.delete(token);
    return null;
  }
  return entry.userId;
}

/** Enregistre une tentative échouée — retourne `true` si le défi est désormais invalidé (trop de tentatives). */
export function registerFailedTwoFactorAttempt(token: string): boolean {
  const entry = pendingChallenges.get(token);
  if (!entry) return true;
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) {
    pendingChallenges.delete(token);
    return true;
  }
  return false;
}

export function consumePendingChallenge(token: string): void {
  pendingChallenges.delete(token);
}
