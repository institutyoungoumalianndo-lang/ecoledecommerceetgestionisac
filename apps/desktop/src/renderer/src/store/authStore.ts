import type { PublicUser } from "@isac-erp/shared";
import { create } from "zustand";

const SUPER_ADMIN_ROLE_CODE = "SUPER_ADMIN";

interface AuthState {
  sessionToken: string | null;
  user: PublicUser | null;
  permissionCodes: string[];
  setSession: (sessionToken: string, user: PublicUser, permissionCodes: string[]) => void;
  clearSession: () => void;
}

/**
 * Jeton de session gardé uniquement en mémoire (jamais écrit sur disque) :
 * un redémarrage de l'application redemande une connexion. Choix simple et
 * sûr pour cette version — une option "rester connecté" persistée de façon
 * sécurisée pourra être ajoutée plus tard si le besoin est confirmé.
 */
export const useAuthStore = create<AuthState>((set) => ({
  sessionToken: null,
  user: null,
  permissionCodes: [],
  setSession: (sessionToken, user, permissionCodes) => set({ sessionToken, user, permissionCodes }),
  clearSession: () => set({ sessionToken: null, user: null, permissionCodes: [] }),
}));

/**
 * Miroir client de la vérification serveur (voir packages/api/src/security/authorization.ts)
 * — sert uniquement à adapter l'affichage (masquer un bouton), jamais la
 * seule protection : le serveur revérifie systématiquement (principe n°1).
 * Fonction pure (pas un hook) : utilisable pour filtrer une liste sans
 * enfreindre les règles des hooks React.
 */
export function hasPermission(
  roleCode: string | undefined,
  permissionCodes: string[],
  permission: string
): boolean {
  if (roleCode === SUPER_ADMIN_ROLE_CODE) return true;
  return permissionCodes.includes(permission);
}

export function useHasPermission(permission: string): boolean {
  const roleCode = useAuthStore((s) => s.user?.role?.code);
  const permissionCodes = useAuthStore((s) => s.permissionCodes);
  return hasPermission(roleCode, permissionCodes, permission);
}
