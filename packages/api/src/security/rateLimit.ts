import type { FastifyInstance } from "fastify";

/**
 * Limitation de débit en mémoire, ciblée sur les routes sensibles (connexion personnel/portail, envoi
 * de messages) — MODULE-15 §4 phase 5, durcissement sécurité (partie additive, sans risque pour le
 * développement local : ni CORS restreint ni HTTPS forcé, voir la note de la phase 5). Fenêtre
 * glissante en mémoire par IP, volontairement simple : le serveur tourne en processus unique
 * (ADR-007), pas de store partagé requis.
 */

interface RateLimitRule {
  /** Sous-chaîne recherchée dans l'URL de la requête tRPC (nom de la procédure ciblée). */
  match: string;
  windowMs: number;
  max: number;
}

const RULES: RateLimitRule[] = [
  { match: "auth.login", windowMs: 60_000, max: 10 },
  { match: "portalAuth.login", windowMs: 60_000, max: 10 },
  { match: "communicationMessages.sendQuick", windowMs: 60_000, max: 20 },
];

const hits = new Map<string, number[]>();

function isAllowed(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= max) {
    hits.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  hits.set(key, timestamps);
  return true;
}

/**
 * Attache directement le hook sur l'instance racine (jamais via `app.register(...)`) : un hook ajouté
 * à l'intérieur d'un plugin encapsulé ne s'applique qu'aux routes de ce même plugin en Fastify, pas
 * aux routes soeurs comme le catch-all `/trpc/*` enregistré séparément — il ne s'appliquerait donc
 * jamais si on l'enregistrait comme un plugin classique.
 */
export function registerSensitiveRouteRateLimit(app: FastifyInstance): void {
  app.addHook("onRequest", async (request, reply) => {
    const rule = RULES.find((r) => request.url.includes(r.match));
    if (!rule) return;
    const key = `${request.ip}:${rule.match}`;
    if (!isAllowed(key, rule.windowMs, rule.max)) {
      await reply.code(429).send({ error: "Trop de tentatives — réessayez dans une minute." });
    }
  });
}
