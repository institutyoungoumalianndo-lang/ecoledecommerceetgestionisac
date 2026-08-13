import { DEFAULT_LOCAL_API_PORT } from "@isac-erp/shared";
import { getStaffSessionToken } from "./staffSession";

/** Même origine que `lib/trpc.ts` (la variable porte l'URL tRPC complète, ".../trpc"). */
const apiOrigin = (
  process.env.NEXT_PUBLIC_PORTAL_API_URL ??
  (typeof window === "undefined"
    ? `http://localhost:${DEFAULT_LOCAL_API_PORT}/trpc`
    : `${window.location.protocol}//${window.location.hostname}:${DEFAULT_LOCAL_API_PORT}/trpc`)
).replace(
  /\/trpc\/?$/,
  ""
);

/**
 * Upload d'image via la route REST dédiée (voir ADR-012), même principe que
 * `apps/desktop/src/renderer/src/lib/upload.ts` — hors tRPC, qui n'est pas fait pour du binaire.
 * Toujours le jeton personnel (`x-session-token`) : les écrans de gestion du portail sont réservés
 * au Super Administrateur, jamais un `PortalCredential`.
 */
export async function uploadImage(file: File): Promise<string> {
  const token = getStaffSessionToken();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiOrigin}/uploads`, {
    method: "POST",
    headers: token ? { "x-session-token": token } : undefined,
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Échec de l'envoi du fichier.");
  }

  const result = (await response.json()) as { path: string };
  return result.path;
}

/** Combine un chemin relatif ("/uploads/xxx.png") avec l'origine de l'API. */
export function resolveUploadUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  return `${apiOrigin}${relativePath}`;
}
