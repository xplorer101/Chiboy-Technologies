import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { buildPoolConfig } from "@/lib/db-config";

/**
 * Prisma 7 delegates to a driver adapter rather than bundling its own engine.
 *
 * Migrations run against `DIRECT_URL` (see prisma.config.ts) while the
 * application always uses the pooled `DATABASE_URL`.
 *
 * The client is cached on `globalThis` so that Next.js hot reloads in
 * development reuse a single connection pool instead of leaking a new one on
 * every code change.
 */

declare global {
  // eslint-disable-next-line no-var
  var __chiboyPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // The value itself is never included: it must not reach logs or clients.
    throw new Error("DATABASE_URL is not configured");
  }

  const adapter = new PrismaPg(buildPoolConfig(connectionString));
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalThis.__chiboyPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__chiboyPrisma = prisma;
}
