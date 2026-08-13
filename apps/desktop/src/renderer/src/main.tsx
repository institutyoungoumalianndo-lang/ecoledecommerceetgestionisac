import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { ServerSetupScreen } from "./screens/auth/ServerSetupScreen";
import { createTRPCClient, trpc } from "./lib/trpc";
import "./styles/globals.css";

/**
 * Gate sur l'adresse du serveur (ADR-007) avant même de créer le client tRPC — impossible de
 * construire une URL sans elle. `null` = pas encore lue, `undefined` = lue et absente (poste neuf).
 * Toute erreur ici (pont `window.isacErp` indisponible, etc.) doit rester visible à l'écran plutôt
 * que de laisser une page vide sans indice — piège rencontré lors du premier test réel de
 * l'exécutable (2026-08-10).
 */
function Root() {
  const [queryClient] = useState(() => new QueryClient());
  const [serverUrl, setServerUrl] = useState<string | null | undefined>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!window.isacErp?.config) {
        throw new Error("Pont technique (isacErp.config) indisponible dans cette fenêtre.");
      }
      window.isacErp.config
        .getServerUrl()
        .then((url) => setServerUrl(url ?? undefined))
        .catch((error: unknown) => setInitError(error instanceof Error ? error.message : String(error)));
    } catch (error) {
      setInitError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  if (initError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-muted p-8 text-center">
        <p className="text-sm font-semibold text-destructive">Erreur au démarrage</p>
        <p className="max-w-md text-sm text-muted-foreground">{initError}</p>
      </div>
    );
  }

  if (serverUrl === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-8">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!serverUrl) {
    return <ServerSetupScreen onSaved={() => window.location.reload()} />;
  }

  return <Provider key={serverUrl} serverUrl={serverUrl} queryClient={queryClient} />;
}

function Provider({ serverUrl, queryClient }: { serverUrl: string; queryClient: QueryClient }) {
  const [trpcClient] = useState(() => createTRPCClient(serverUrl));

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

/**
 * Filet de sécurité hors React (2026-08-10) — si le bundle échoue à s'exécuter avant même que
 * `Root` ait une chance de s'afficher (erreur de chargement de module, etc.), affiche un message
 * lisible directement dans le DOM plutôt qu'une page vide sans aucun indice.
 */
function showFatalError(message: string) {
  const container = document.getElementById("root");
  if (!container) return;
  container.innerHTML = `
    <div style="display:flex;min-height:100vh;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px;text-align:center;font-family:sans-serif;">
      <p style="font-weight:600;color:#b91c1c;">Erreur au démarrage</p>
      <p style="max-width:32rem;font-size:14px;color:#555;">${message}</p>
    </div>`;
}

window.addEventListener("error", (event) => showFatalError(event.message));
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  showFatalError(reason instanceof Error ? reason.message : String(reason));
});

const container = document.getElementById("root");
if (!container) throw new Error("Élément racine #root introuvable");

try {
  createRoot(container).render(
    <StrictMode>
      <Root />
    </StrictMode>
  );
} catch (error) {
  showFatalError(error instanceof Error ? error.message : String(error));
}
