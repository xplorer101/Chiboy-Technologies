import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { tmpdir } from "node:os";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 no longer auto-loads .env files. Node's built-in loader is used so
 * that no `dotenv` dependency is required. `.env` is loaded first so that
 * `.env.local` (loaded second) takes precedence, matching Next.js behaviour.
 */
for (const file of [".env", ".env.local"]) {
  if (existsSync(file)) loadEnvFile(file);
}

/**
 * Trust Supabase's private CA for the Prisma CLI.
 *
 * Supabase's pooler is signed by "Supabase Root 2021 CA", which is not in the
 * OS trust store, so the CLI fails with P1001 unless it is told where the root
 * lives. `SSL_CERT_FILE` *replaces* the trust store rather than extending it,
 * so the system bundle and the Supabase root are concatenated into a single
 * temporary file. Doing it here — rather than requiring the developer to export
 * SSL_CERT_FILE — keeps `npm run db:deploy` working out of the box.
 *
 * The application runtime does not need this: it verifies TLS through
 * src/lib/db-config.ts, which passes the CA straight to the pg driver.
 */
function trustSupabaseCaForCli(): void {
  const rootCaPath = path.join(process.cwd(), "certs", "supabase-root-2021-ca.crt");
  if (!existsSync(rootCaPath)) return;
  if (process.env.SSL_CERT_FILE) return;

  const systemBundle = [
    "/etc/ssl/certs/ca-certificates.crt",
    "/etc/pki/tls/certs/ca-bundle.crt",
  ].find((candidate) => existsSync(candidate));

  const parts = [readFileSync(rootCaPath, "utf8")];
  if (systemBundle) parts.push(readFileSync(systemBundle, "utf8"));

  const merged = path.join(tmpdir(), "chiboy-ca-bundle.crt");
  mkdirSync(path.dirname(merged), { recursive: true });
  writeFileSync(merged, parts.join("\n"));
  process.env.SSL_CERT_FILE = merged;
}

trustSupabaseCaForCli();

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    // Migrations must run against a connection that can hold a session open for
    // the whole migration; see README "Database" for the pooler caveat.
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
