#!/usr/bin/env node
/**
 * Apply committed Prisma migrations by executing the migration SQL directly.
 *
 * WHY THIS EXISTS
 * ---------------
 * `prisma migrate dev` needs a shadow database, and `prisma migrate deploy`
 * takes a Postgres advisory lock. Neither works against Supabase's connection
 * pooler:
 *
 *   - The pooler cannot create a shadow database.
 *   - `pg_advisory_lock()` never returns on the pooler; Prisma times out with
 *     P1002 and leaves the migration recorded but unfinished.
 *
 * That is why `DIRECT_URL` is pointed at the pooler. A genuinely direct
 * connection (`db.<ref>.supabase.co`) avoids both problems but resolves to an
 * IPv6-only address, which is unreachable from IPv4-only networks.
 *
 * So: the migration files in `prisma/migrations` remain the source of truth and
 * are committed to git as normal. This script applies them in order, then hands
 * bookkeeping back to Prisma via `migrate resolve --applied`, which computes the
 * checksum itself.
 *
 * If you later have a genuinely direct connection available (IPv6-capable host,
 * or a provider such as Neon), use `npm run db:deploy` instead and delete this.
 *
 * Usage:
 *   node scripts/apply-migrations.mjs          # apply pending migrations
 *   node scripts/apply-migrations.mjs --reset  # drop the public schema first
 */

import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "prisma", "migrations");
const CA_PATH = path.join(ROOT, "certs", "supabase-root-2021-ca.crt");
const RESET = process.argv.includes("--reset");

/** Minimal env loader so this script has no dotenv dependency. */
function loadEnv() {
  for (const file of [".env", ".env.local"]) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    for (const rawLine of readFileSync(full, "utf8").split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // First file wins for a given key, so .env.local (loaded second) wins.
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function listMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(path.join(MIGRATIONS_DIR, name, "migration.sql")))
    .sort();
}

/** Prisma's bookkeeping table, matching the 7.10 definition exactly. */
const CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id VARCHAR(36) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      finished_at TIMESTAMPTZ,
      migration_name VARCHAR(255) NOT NULL,
      logs TEXT,
      rolled_back_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      applied_steps_count INTEGER NOT NULL DEFAULT 0
  )`;

async function main() {
  loadEnv();

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DIRECT_URL or DATABASE_URL must be set");
  }

  const url = new URL(connectionString);
  const { default: pg } = await import("pg");

  const client = new pg.Client({
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ssl: url.hostname.endsWith("supabase.co") || url.hostname.endsWith("supabase.com")
      ? { ca: readFileSync(CA_PATH, "utf8"), rejectUnauthorized: true }
      : undefined,
    connectionTimeoutMillis: 15_000,
  });

  await client.connect();

  try {
    if (RESET) {
      console.log("Resetting public schema...");
      await client.query("DROP SCHEMA public CASCADE");
      await client.query("CREATE SCHEMA public");
      await client.query("GRANT ALL ON SCHEMA public TO public");
    }

    await client.query(CREATE_MIGRATIONS_TABLE);

    const { rows } = await client.query(
      `SELECT migration_name, finished_at FROM "_prisma_migrations"
       WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
    );
    const applied = new Set(rows.map((r) => r.migration_name));

    const pending = listMigrations().filter((name) => !applied.has(name));

    if (pending.length === 0) {
      console.log("Database is up to date. Nothing to apply.");
      return;
    }

    for (const name of pending) {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");

      console.log(`Applying ${name}...`);
      // Each migration is applied in its own transaction, so a failure cannot
      // leave a half-applied migration behind — the failure mode that produced
      // the interrupted `init` migration in the first place.
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO "_prisma_migrations"
             (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
           VALUES ($1, $2, $3, NOW(), NOW(), 1)`,
          [randomUUID(), checksum, name],
        );
        await client.query("COMMIT");
        console.log(`  applied ${name}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Failed to apply ${name}: ${error.message}`);
      }
    }

    console.log(`Done. ${pending.length} migration(s) applied.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
