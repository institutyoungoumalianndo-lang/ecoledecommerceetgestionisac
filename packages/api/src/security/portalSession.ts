import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@isac-erp/db";

/**
 * Sessions du portail web — voir MODULE-15 §3. Même principe que `session.ts` (jeton haché, jamais un
 * cookie), mais table séparée (`PortalSession`) pour ne jamais mélanger les sessions de personnel et
 * les sessions externes (étudiant/tuteur/enseignant).
 */

const PORTAL_SESSION_TTL_MINUTES = 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPortalSession(credentialId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + PORTAL_SESSION_TTL_MINUTES * 60_000);

  await prisma.portalSession.create({
    data: { credentialId, tokenHash: hashToken(token), expiresAt },
  });

  return token;
}

export interface ActivePortalSession {
  sessionId: string;
  credentialId: string;
}

export async function validatePortalSession(token: string): Promise<ActivePortalSession | null> {
  const session = await prisma.portalSession.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session) return null;

  const now = new Date();
  if (session.expiresAt < now) return null;

  const expiresAt = new Date(now.getTime() + PORTAL_SESSION_TTL_MINUTES * 60_000);
  await prisma.portalSession.update({ where: { id: session.id }, data: { lastSeenAt: now, expiresAt } });

  return { sessionId: session.id, credentialId: session.credentialId };
}

export async function deletePortalSession(token: string): Promise<void> {
  await prisma.portalSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}
