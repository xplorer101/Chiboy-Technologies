/**
 * Classifies database failures as "unavailable" versus "genuinely wrong".
 *
 * WHY THIS IS ITS OWN MODULE
 * --------------------------
 * `src/lib/portfolio.ts` imports `server-only` and the Prisma client, so it
 * cannot be imported from a plain unit test. The classification itself is pure
 * logic, and it is the part that has to be exactly right: getting it wrong
 * turns a routine database outage into a 500 error page for every visitor,
 * instead of a designed empty state.
 *
 * So it lives here — no framework, no database, no side effects — and can be
 * tested directly.
 */

/**
 * Postgres and Prisma error codes meaning "the database is not usable right
 * now", as opposed to a query that is genuinely wrong.
 */
const UNAVAILABLE_CODES: ReadonlySet<string> = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server timed out
  "P1008", // Operation timed out
  "P1017", // Server has closed the connection
  "42P01", // undefined_table — schema not migrated yet
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EPIPE",
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
]);

/**
 * Message fallbacks. The driver adapters wrap the underlying failure, so the
 * meaningful code often sits on `cause` rather than on the error Prisma
 * rethrows — checking only the top-level code silently misses real outages.
 */
const UNAVAILABLE_PATTERNS: readonly RegExp[] = [
  /connection terminated/i,
  /can't reach database server/i,
  /server has closed the connection/i,
  /connection (?:timeout|timed out|closed|refused|reset)/i,
  /econnrefused|econnreset|enotfound|etimedout/i,
  /relation ".+" does not exist/i,
  /database .+ does not exist/i,
  /timeout acquiring a postgres advisory lock/i,
];

/** Enough to unwrap Prisma → adapter → driver without risking a cycle. */
const MAX_CAUSE_DEPTH = 6;

/**
 * Walks the `cause` chain and inspects every code and message it finds.
 *
 * Returns true for infrastructure failures (database down, pooler timing out,
 * schema not migrated yet) so callers can degrade gracefully, and false for
 * programming errors that should still surface loudly during development.
 */
export function isDatabaseUnavailableError(error: unknown): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current; depth += 1) {
    const candidate = current as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
    };

    const code = typeof candidate.code === "string" ? candidate.code : undefined;
    const message = typeof candidate.message === "string" ? candidate.message : "";

    if (code && UNAVAILABLE_CODES.has(code)) return true;
    if (UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(message))) return true;

    current = candidate.cause;
  }

  return false;
}
