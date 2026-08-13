import { useEffect } from "react";
import { AppShell } from "./screens/shell/AppShell";
import { BootstrapScreen } from "./screens/auth/BootstrapScreen";
import { LoginScreen } from "./screens/auth/LoginScreen";
import { applyThemeColors } from "./lib/color";
import { trpc } from "./lib/trpc";
import { useAuthStore } from "./store/authStore";

export function App() {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const bootstrapStatus = trpc.auth.bootstrapStatus.useQuery(undefined, {
    enabled: !sessionToken,
    retry: 1,
  });

  // Thème appliqué en direct dès le démarrage (§3.15) — public, pas besoin
  // d'être connecté (l'écran de connexion en profite aussi).
  const themeQuery = trpc.branding.theme.get.useQuery();
  useEffect(() => {
    if (themeQuery.data) applyThemeColors(themeQuery.data);
  }, [themeQuery.data]);

  if (sessionToken) {
    return <AppShell />;
  }

  if (bootstrapStatus.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (bootstrapStatus.data && !bootstrapStatus.data.hasAdmin) {
    return <BootstrapScreen onDone={() => bootstrapStatus.refetch()} />;
  }

  return <LoginScreen />;
}
