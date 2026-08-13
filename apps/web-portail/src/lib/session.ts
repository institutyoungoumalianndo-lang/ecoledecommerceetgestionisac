const STORAGE_KEY = "isac-portal-session-token";

export function getPortalSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setPortalSessionToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearPortalSessionToken(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
