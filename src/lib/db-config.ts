import { readFileSync } from "node:fs";
import path from "node:path";
import type { PoolConfig } from "pg";

/**
 * Central place where a `DATABASE_URL` is turned into a `pg` pool config.
 *
 * Two things this handles that a bare connection string cannot:
 *
 * 1. TLS trust. Supabase's connection pooler is served by a Supabase-issued
 *    private CA ("Supabase Root 2021 CA"), not a public CA, so the chain
 *    fails verification against the operating system trust store. The root
 *    certificate is vendored in `certs/` and passed explicitly, which keeps
 *    full verification — including hostname checking — rather than falling
 *    back to `sslmode=no-verify`. A direct `db.<ref>.supabase.co` connection
 *    uses a publicly trusted certificate and needs no override.
 *
 * 2. Serverless pooling. Vercel scales by creating many short-lived
 *    instances; each one must hold only a small number of database
 *    connections or the provider's connection limit is exhausted.
 */

const SUPABASE_CA_PATH = path.join(process.cwd(), "certs", "supabase-root-2021-ca.crt");

/** Cached so the file is read once per process, not once per query. */
let supabaseCa: string | undefined;

function getSupabaseCa(): string {
  if (supabaseCa === undefined) {
    supabaseCa = readFileSync(SUPABASE_CA_PATH, "utf8");
  }
  return supabaseCa;
}

function isSupabaseHost(hostname: string): boolean {
  return hostname.endsWith(".supabase.co") || hostname.endsWith(".supabase.com");
}

export function buildPoolConfig(connectionString: string): PoolConfig {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    // The message deliberately omits the connection string itself.
    throw new Error("DATABASE_URL is not a valid connection URL");
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) {
    throw new Error("DATABASE_URL must include a database name");
  }

  const hostname = url.hostname;
  const config: PoolConfig = {
    host: hostname,
    port: url.port ? Number(url.port) : 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    // Serverless-friendly pool sizing. See the note above.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Do not keep a Node process alive purely to hold an idle pool.
    allowExitOnIdle: true,
  };

  if (isSupabaseHost(hostname)) {
    config.ssl = { ca: getSupabaseCa(), rejectUnauthorized: true };
  }

  return config;
}
