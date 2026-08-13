import { DEFAULT_LOCAL_API_PORT } from "@isac-erp/shared";
import { useAuthStore } from "../store/authStore";

const apiOrigin = `http://localhost:${DEFAULT_LOCAL_API_PORT}`;

/**
 * Upload d'image via la route REST dédiée (voir ADR-012) — hors tRPC, qui
 * n'est pas fait pour du binaire. Retourne le chemin relatif servi par
 * l'API (ex. "/uploads/xxx.png"), à combiner avec `resolveUploadUrl` pour
 * l'affichage.
 */
export async function uploadImage(file: File): Promise<string> {
  const token = useAuthStore.getState().sessionToken;
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

export interface UploadedDocument {
  path: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}

/**
 * Upload d'un document administratif étudiant (Module 4) — images ou PDF,
 * non redimensionnés (contrairement à `uploadImage`), voir MODULE-04 §2.5.
 */
export async function uploadDocument(file: File): Promise<UploadedDocument> {
  const token = useAuthStore.getState().sessionToken;
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiOrigin}/uploads/documents`, {
    method: "POST",
    headers: token ? { "x-session-token": token } : undefined,
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Échec de l'envoi du fichier.");
  }

  return (await response.json()) as UploadedDocument;
}

/** Combine un chemin relatif ("/uploads/xxx.png") avec l'origine de l'API locale. */
export function resolveUploadUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  return `${apiOrigin}${relativePath}`;
}
