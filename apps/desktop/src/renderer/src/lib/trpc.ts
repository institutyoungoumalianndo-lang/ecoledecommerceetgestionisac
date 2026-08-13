import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@isac-erp/api/router";
import { useAuthStore } from "../store/authStore";

export const trpc = createTRPCReact<AppRouter>();

/**
 * Adresse du serveur LAN du campus (ADR-007), saisie une fois par poste au premier lancement — voir
 * `ServerSetupScreen`. Avant ce jour, cette valeur était codée en dur sur `localhost`, ce qui rendait
 * impossible tout déploiement sur les postes des collaborateurs (retour du porteur du projet,
 * 2026-08-10). Accepte aussi bien `192.168.1.10:4310` que `http://192.168.1.10:4310`.
 */
export function normalizeServerOrigin(rawAddress: string): string {
  const trimmed = rawAddress.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

export function buildTrpcUrl(rawAddress: string): string {
  return `${normalizeServerOrigin(rawAddress)}/trpc`;
}

export function createTRPCClient(serverAddress: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: buildTrpcUrl(serverAddress),
        transformer: superjson,
        headers: () => {
          const token = useAuthStore.getState().sessionToken;
          return token ? { "x-session-token": token } : {};
        },
      }),
    ],
  });
}
