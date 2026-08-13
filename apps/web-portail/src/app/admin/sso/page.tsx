"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trpcClient } from "../../../lib/trpc";
import { setStaffSessionToken } from "../../../lib/staffSession";

/**
 * Ouverture directe du portail Super Administrateur depuis l'application desktop (2026-08-10, retour
 * du porteur du projet) — échange le jeton à usage unique de l'URL contre une vraie session `User`,
 * sans repasser par le formulaire de connexion. Voir authService.exchangePortalSsoToken.
 */
export default function AdminSsoPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setError("Lien d'ouverture du portail invalide.");
      return;
    }

    trpcClient.auth.exchangePortalSsoToken
      .mutate({ token })
      .then((result) => {
        setStaffSessionToken(result.sessionToken);
        router.replace("/admin");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Lien d'ouverture du portail invalide ou expiré.");
      });
  }, [router]);

  return (
    <div className="relative flex min-h-screen items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        {error ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            <a href="/admin/connexion" className="text-xs text-window-foreground/70 underline">
              Aller à la connexion
            </a>
          </>
        ) : (
          <p className="text-sm text-window-foreground/70">Connexion au portail…</p>
        )}
      </div>
    </div>
  );
}
