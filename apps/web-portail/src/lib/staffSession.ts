/**
 * Jeton de session "personnel" (MODULE-15 §1 décision 1 — le Super Administrateur accède au portail
 * avec son compte `User` existant, jamais un `PortalCredential`). Stockage séparé de
 * `session.ts` (jeton portail) — même principe que les tables `UserSession`/`PortalSession` côté
 * serveur, jamais mêlées.
 */
const STORAGE_KEY = "isac-staff-session-token";

export function getStaffSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStaffSessionToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearStaffSessionToken(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
