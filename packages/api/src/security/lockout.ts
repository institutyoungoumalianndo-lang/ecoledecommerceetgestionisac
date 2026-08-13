export interface FailedLoginUpdate {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  didLock: boolean;
}

/**
 * Calcule le nouvel état de verrouillage après un échec de connexion.
 * Fonction pure — testée indépendamment de la base (voir MODULE-01 §3.1).
 */
export function computeFailedLoginUpdate(
  currentFailedAttempts: number,
  maxFailedLoginAttempts: number,
  accountLockoutMinutes: number,
  now: Date = new Date()
): FailedLoginUpdate {
  const attempts = currentFailedAttempts + 1;
  const didLock = attempts >= maxFailedLoginAttempts;

  return {
    failedLoginAttempts: didLock ? 0 : attempts,
    lockedUntil: didLock ? new Date(now.getTime() + accountLockoutMinutes * 60_000) : null,
    didLock,
  };
}

/** Un compte verrouillé le reste tant que lockedUntil est dans le futur. */
export function isAccountLocked(lockedUntil: Date | null, now: Date = new Date()): boolean {
  return lockedUntil !== null && lockedUntil > now;
}
