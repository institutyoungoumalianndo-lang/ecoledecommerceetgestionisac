"use client";

import type { PublicUser } from "@isac-erp/shared";
import { SUPER_ADMIN_ROLE_CODE } from "@isac-erp/shared";
import { Button } from "@isac-erp/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { trpcClient } from "../../../lib/trpc";
import { clearStaffSessionToken, getStaffSessionToken } from "../../../lib/staffSession";
import { AdminAuthContext } from "../../../lib/adminAuth";

const NAV_ITEMS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/etudiants", label: "Étudiants" },
  { href: "/admin/enseignants", label: "Enseignants" },
  { href: "/admin/paiements", label: "Paiements" },
  { href: "/admin/inventaire", label: "Inventaire" },
  { href: "/admin/bibliotheque", label: "Bibliothèque" },
  { href: "/admin/communication", label: "Communication" },
  { href: "/admin/comptabilite", label: "Comptabilité" },
];

/**
 * Garde d'accès commune à tous les écrans de gestion Super Administrateur (MODULE-15 §4 phase
 * "accès complet") — un seul appel `auth.me` par navigation, jamais dupliqué par écran. `/admin/
 * connexion` reste en dehors de ce groupe de routes (`(protected)`), donc jamais concerné par cette
 * garde — pas de boucle de redirection possible.
 */
export default function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!getStaffSessionToken()) {
      router.replace("/admin/connexion");
      return;
    }
    trpcClient.auth.me
      .query()
      .then((result) => {
        if (!result || result.role?.code !== SUPER_ADMIN_ROLE_CODE) {
          clearStaffSessionToken();
          router.replace("/admin/connexion");
          return;
        }
        setUser(result);
      })
      .catch(() => {
        clearStaffSessionToken();
        router.replace("/admin/connexion");
      });
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await trpcClient.auth.logout.mutate();
    } catch {
      // Le jeton est de toute façon effacé côté client — une erreur réseau ici ne doit pas bloquer.
    } finally {
      clearStaffSessionToken();
      router.replace("/admin/connexion");
    }
  }

  if (!user) return null;

  return (
    <AdminAuthContext.Provider value={{ user }}>
      <div className="flex min-h-screen flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-window px-6 py-3 text-window-foreground">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold">Portail — Super Administrateur</span>
            <nav className="flex gap-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm ${
                    pathname === item.href ? "font-medium text-window-foreground" : "text-window-foreground/70 hover:text-window-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-window-foreground/70">
              {user.firstName} {user.lastName}
            </span>
            <Button variant="outline" onClick={() => void handleLogout()} disabled={loggingOut}>
              {loggingOut ? "Déconnexion…" : "Se déconnecter"}
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </AdminAuthContext.Provider>
  );
}
