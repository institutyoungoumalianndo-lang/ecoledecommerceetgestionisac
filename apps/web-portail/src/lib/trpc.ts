import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { DEFAULT_LOCAL_API_PORT } from "@isac-erp/shared";
import type { AppRouter } from "@isac-erp/api/router";
import { getPortalSessionToken } from "./session";
import { getStaffSessionToken } from "./staffSession";

/**
 * URL du serveur du campus (MODULE-15 §2.3) — configurable via
 * NEXT_PUBLIC_PORTAL_API_URL pour un déploiement réel (serveur exposé sur
 * Internet, HTTPS). Repli sur localhost pour le développement local, comme
 * `apps/desktop/src/renderer/src/lib/trpc.ts`.
 */
const apiUrl =
  process.env.NEXT_PUBLIC_PORTAL_API_URL ??
  (typeof window === "undefined"
    ? `http://localhost:${DEFAULT_LOCAL_API_PORT}/trpc`
    : `${window.location.protocol}//${window.location.hostname}:${DEFAULT_LOCAL_API_PORT}/trpc`);

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: apiUrl,
      transformer: superjson,
      headers: () => {
        const headers: Record<string, string> = {};
        const portalToken = getPortalSessionToken();
        if (portalToken) headers["x-portal-session-token"] = portalToken;
        const staffToken = getStaffSessionToken();
        if (staffToken) headers["x-session-token"] = staffToken;
        return headers;
      },
    }),
  ],
});
