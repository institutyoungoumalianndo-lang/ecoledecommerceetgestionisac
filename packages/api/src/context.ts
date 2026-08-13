import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { prisma } from "@isac-erp/db";
import { validateSession } from "./security/session.js";
import { validatePortalSession } from "./security/portalSession.js";
import { getSecuritySettings } from "./services/securitySettingsService.js";

export interface SessionContext {
  sessionId: string;
  userId: string;
  roleCode: string;
  permissionCodes: Set<string>;
}

/** Voir MODULE-15 §3 — session du portail web, jamais mêlée au RBAC de personnel. */
export interface PortalSessionContext {
  sessionId: string;
  credentialId: string;
}

export interface Context {
  session: SessionContext | null;
  sessionToken: string | null;
  portalSession: PortalSessionContext | null;
  ipAddress?: string;
  userAgent?: string;
}

async function resolveStaffSession(
  sessionToken: string | null
): Promise<SessionContext | null> {
  if (!sessionToken) return null;

  const settings = await getSecuritySettings();
  const active = await validateSession(sessionToken, settings.sessionInactivityTimeoutMin);
  if (!active) return null;

  const userRole = await prisma.userRole.findFirst({
    where: { userId: active.userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!userRole) return null;

  return {
    sessionId: active.sessionId,
    userId: active.userId,
    roleCode: userRole.role.code,
    permissionCodes: new Set(userRole.role.permissions.map((rp) => rp.permission.code)),
  };
}

async function resolvePortalSession(portalSessionToken: string | null): Promise<PortalSessionContext | null> {
  if (!portalSessionToken) return null;
  const active = await validatePortalSession(portalSessionToken);
  if (!active) return null;
  return { sessionId: active.sessionId, credentialId: active.credentialId };
}

/**
 * Contexte tRPC : résout la session de personnel à partir de l'en-tête `x-session-token`, et la
 * session du portail web à partir de `x-portal-session-token` (MODULE-15 §3, jamais mêlées) — à
 * chaque requête. Le contrôle d'accès qui en découle (voir trpc.ts) est la seule source de vérité —
 * jamais l'UI seule (principe non négociable n°1).
 */
export async function createContext({ req }: CreateFastifyContextOptions): Promise<Context> {
  const ipAddress = req.ip;
  const userAgentHeader = req.headers["user-agent"];
  const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;

  const tokenHeader = req.headers["x-session-token"];
  const sessionToken = (Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader) ?? null;

  const portalTokenHeader = req.headers["x-portal-session-token"];
  const portalSessionToken = (Array.isArray(portalTokenHeader) ? portalTokenHeader[0] : portalTokenHeader) ?? null;

  const [session, portalSession] = await Promise.all([
    resolveStaffSession(sessionToken),
    resolvePortalSession(portalSessionToken),
  ]);

  return { session, sessionToken, portalSession, ipAddress, userAgent };
}
