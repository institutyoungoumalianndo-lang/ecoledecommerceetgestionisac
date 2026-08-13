import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { validateSession } from "../security/session.js";
import { getSecuritySettings } from "../services/securitySettingsService.js";
import { saveDocumentFile, saveResizedImage } from "./storage.js";

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo, cohérent avec un poste de campus modeste

// .docx/.doc ajoutés le 2026-08-07 pour la bibliothèque numérique (MODULE-13 §5) — même route, même
// stockage brut (saveDocumentFile), seule la liste blanche MIME change.
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);
const MAX_DOCUMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo — diplômes/relevés scannés (MODULE-04 §2.5)

async function requireValidSession(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const token = request.headers["x-session-token"];
  const sessionToken = Array.isArray(token) ? token[0] : token;
  if (!sessionToken) {
    await reply.code(401).send({ error: "Session requise." });
    return false;
  }

  const settings = await getSecuritySettings();
  const session = await validateSession(sessionToken, settings.sessionInactivityTimeoutMin);
  if (!session) {
    await reply.code(401).send({ error: "Session invalide ou expirée." });
    return false;
  }
  return true;
}

/**
 * Routes REST dédiées à l'upload de fichiers. Hors tRPC (fait pour du JSON,
 * pas des fichiers binaires — ADR-012).
 *
 * Authentification : toute session valide suffit ici — l'upload ne fait que
 * stocker un fichier et renvoyer son chemin, il ne modifie aucun paramètre.
 * C'est la mutation tRPC qui rattache ensuite ce chemin (ex.
 * establishmentSettings.update, studentDocuments.create) qui applique le
 * vrai contrôle de permission.
 */
export async function registerUploadRoute(app: FastifyInstance) {
  // Images (logos, signatures, cachet, thème, photo étudiant — Module 2/4) : redimensionnées.
  app.post("/uploads", async (request, reply) => {
    if (!(await requireValidSession(request, reply))) return;

    const file = await request.file({ limits: { fileSize: MAX_IMAGE_FILE_SIZE_BYTES } });
    if (!file) {
      return reply.code(400).send({ error: "Aucun fichier reçu." });
    }
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return reply.code(415).send({ error: "Format non supporté (PNG, JPEG ou WebP uniquement)." });
    }

    const buffer = await file.toBuffer();
    const saved = await saveResizedImage(buffer, file.filename);
    return reply.send(saved);
  });

  // Documents administratifs étudiants (Module 4) : images ou PDF, non redimensionnés.
  app.post("/uploads/documents", async (request, reply) => {
    if (!(await requireValidSession(request, reply))) return;

    const file = await request.file({ limits: { fileSize: MAX_DOCUMENT_FILE_SIZE_BYTES } });
    if (!file) {
      return reply.code(400).send({ error: "Aucun fichier reçu." });
    }
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
      return reply.code(415).send({ error: "Format non supporté (PNG, JPEG, WebP, PDF ou Word uniquement)." });
    }

    const buffer = await file.toBuffer();
    const saved = await saveDocumentFile(buffer, file.filename);
    return reply.send({ ...saved, fileName: file.filename, mimeType: file.mimetype, fileSizeBytes: buffer.length });
  });
}
