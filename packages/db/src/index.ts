import { PrismaClient } from "@prisma/client";

/**
 * Client Prisma singleton, partagé par tout le processus backend local
 * (packages/api). Évite l'épuisement du pool de connexions PostgreSQL en
 * environnement de développement avec rechargement à chaud.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
