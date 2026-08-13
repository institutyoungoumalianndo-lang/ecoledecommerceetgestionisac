import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { DEFAULT_LOCAL_API_PORT } from "@isac-erp/shared";
import Fastify from "fastify";
import { createContext } from "./context.js";
import { appRouter } from "./router.js";
import { registerUploadRoute } from "./uploads/route.js";
import { UPLOADS_DIR } from "./uploads/storage.js";
import { startCommunicationScheduler } from "./services/communicationScheduler.js";
import { startAlertEngine } from "./services/alertEngineService.js";
import { startBackupScheduler } from "./services/backupService.js";
import { registerSensitiveRouteRateLimit } from "./security/rateLimit.js";

/**
 * Backend local ISAC ERP.
 *
 * Conformément à ADR-007 (docs/DECISIONS.md), ce serveur est destiné à
 * tourner sur une machine du réseau local du campus (poste dédié ou petit
 * serveur), et à être atteint par les postes clients Electron via le LAN.
 * Aucune dépendance Internet, aucune communication vers un autre campus.
 */
async function main() {
  const app = Fastify({
    logger: {
      transport: { target: "pino-pretty", options: { colorize: true } },
    },
  });

  await app.register(cors, { origin: true });

  registerSensitiveRouteRateLimit(app);

  await app.register(multipart);

  // Sert les fichiers importés (logos, signatures, cachet, thème — Module 2).
  await app.register(fastifyStatic, { root: UPLOADS_DIR, prefix: "/uploads/" });

  await registerUploadRoute(app);

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: { router: appRouter, createContext },
  });

  app.get("/", async () => ({ name: "ISAC ERP API", status: "running" }));

  const port = Number(process.env.PORT ?? DEFAULT_LOCAL_API_PORT);
  // 0.0.0.0 : accessible depuis les autres postes du réseau local du campus, pas seulement en local.
  await app.listen({ port, host: "0.0.0.0" });

  // Module 12 (Centre de Communication) : campagnes planifiées/récurrentes, voir MODULE-12 §6.1.
  startCommunicationScheduler();
  // Module 10 (Tableau de bord & Rapports décisionnels) : moteur d'alertes configurables, voir MODULE-10 §1.3.
  startAlertEngine();
  // Module 11 (Sauvegarde, Sécurité avancée, Audit) : sauvegarde planifiée de la base, voir MODULE-11 §1.1.
  startBackupScheduler();
}

main().catch((error) => {
  console.error("Échec du démarrage du serveur API ISAC ERP :", error);
  process.exit(1);
});
