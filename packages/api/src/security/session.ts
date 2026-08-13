import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@isac-erp/db";

/**
 * Sessions stockées côté serveur (ADR-009, docs/DECISIONS.md) : seul le hash
 * du jeton est persisté, jamais le jeton en clair. Permet la déconnexion
 * automatique par inactivité et la révocation à distance, contrairement à un
 * JWT auto-porteur classique.
 */

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface CreateSessionOptions {
  userId: string;
  inactivityTimeoutMinutes: number;
  ipAddress?: string;
  userAgent?: string;
}

export async function createSession(options: CreateSessionOptions): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + options.inactivityTimeoutMinutes * 60_000);

  await prisma.userSession.create({
    data: {
      userId: options.userId,
      tokenHash: hashToken(token),
      lastActivityAt: now,
      expiresAt,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    },
  });

  return token;
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
}

/**
 * Valide un jeton de session : doit exister, ne pas être révoqué, ne pas
 * avoir expiré par inactivité. Rafraîchit `lastActivityAt` et repousse
 * `expiresAt` à chaque appel réussi (glissement de la fenêtre d'inactivité).
 */
export async function validateSession(
  token: string,
  inactivityTimeoutMinutes: number
): Promise<ActiveSession | null> {
  const session = await prisma.userSession.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session || session.revokedAt) return null;

  const now = new Date();
  if (session.expiresAt < now) return null;

  const expiresAt = new Date(now.getTime() + inactivityTimeoutMinutes * 60_000);
  await prisma.userSession.update({
    where: { id: session.id },
    data: { lastActivityAt: now, expiresAt },
  });

  return { sessionId: session.id, userId: session.userId };
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
