"use client";

import type { PublicUser } from "@isac-erp/shared";
import { createContext, useContext } from "react";

/**
 * Contexte d'identité Super Administrateur, séparé de `layout.tsx` — Next.js interdit qu'un fichier
 * `layout.tsx` exporte autre chose que les exports de route reconnus (default, metadata...).
 */
export interface AdminAuthContextValue {
  user: PublicUser;
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function useAdminUser(): PublicUser {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminUser() doit être appelé sous le layout protégé /admin.");
  return ctx.user;
}
