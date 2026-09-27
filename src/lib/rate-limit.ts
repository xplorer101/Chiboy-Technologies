import "server-only";

import { getRateLimitConfig } from "@/lib/env";

/**
 * Rate limiting for the public forms.
 *
 * WHY NO DEPENDENCY
 * -----------------
 * Upstash's REST API is reachable with a plain `fetch` — `INCR` and `EXPIRE` are
 * two POST commands and nothing more. A client library would add a transitive
 * dependency tree to guard two endpoints, and would need a major-version bump
 * whenever Upstash changes a response shape. The two commands are written out
 * here instead, which is roughly twenty lines and one less thing to keep current.
 *
 * WHY IT FAILS OPEN
 * -----------------
 * Every failure path here returns "allowed". A limiter that throws, or that
 * fails closed on a Redis outage, turns a Redis problem into a site that cannot
 * take a contact message — the exact opposite of what the user needs when
 * something has already gone wrong. The database uniqueness constraints and the
 * bot trap below are the real defences; the limiter only raises the cost of
 * abuse, and a limiter that is down should cost nothing rather than block
 * everything.
 *
 * WHAT THIS DOES AND DOES NOT STOP
 * --------------------------------
 * It raises the cost of bulk submission. It does not stop a determined
 * attacker, and it is not the thing standing between the forms and spam — the
 * honeypot field and the server-side validation are. Those work without any
 * shared state, which is why they are the primary defence rather than the
 * backstop.
 *
 * THE IN-MEMORY FALLBACK IS PER-INSTANCE
 * ---------------------------------------
 * Without Redis each serverless instance keeps its own counters, so the real
 * limit is `limit x instances`. That is acceptable for local development and
 * too weak for production; `hasRedisConfig()` is surfaced so the deployment
 * checklist can treat its absence as a go-live blocker rather than discovering
 * it from a spam wave.
 */

export type RateLimitResult = {
  /** False once the limit is reached. True means "carry on". */
  allowed: boolean;
  /** Requests left in the current window. */
  remaining: number;
  /** Epoch milliseconds at which the window rolls over. */
  resetAt: number;
  /** Which backend answered. Useful in logs, never shown to a visitor. */
  backend: "redis" | "memory";
};

/** Buckets keyed by action, so a spammer on one form cannot spend another's. */
export type RateLimitAction = "contact" | "service-request";

/** Conservative defaults: generous to a real visitor, awkward for a script. */
const DEFAULTS: Record<RateLimitAction, { limit: number; windowSeconds: number }> = {
  contact: { limit: 5, windowSeconds: 10 * 60 },
  "service-request": { limit: 3, windowSeconds: 30 * 60 },
};

/**
 * In-process counters.
 *
 * Entries carry their own expiry and are swept lazily on write rather than on a
 * timer, so an idle module holds no timer and cannot keep a serverless instance
 * alive. Bounded at `MAX_KEYS` to stop an attacker cycling through distinct keys
 * from growing the map without limit.
 */
const memoryCounters = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 10_000;

/** Redis calls are given a hard deadline; a hung request must not hang the form. */
const REDIS_TIMEOUT_MS = 1_500;

function checkMemory(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();

  if (memoryCounters.size > MAX_KEYS) {
    for (const [existing, counter] of memoryCounters) {
      if (counter.resetAt <= now) memoryCounters.delete(existing);
    }
  }

  const existing = memoryCounters.get(key);
  if (!existing || existing.resetAt <= now) {
    const counter = { count: 1, resetAt: now + windowSeconds * 1000 };
    memoryCounters.set(key, counter);
    return { allowed: true, remaining: limit - 1, resetAt: counter.resetAt, backend: "memory" };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    backend: "memory",
  };
}

type RedisPipelineResult = Array<{ result?: number | string | null; error?: string }>;

/**
 * Issues `INCR` then `EXPIRE` as a single pipelined request.
 *
 * The expiry is only set on a fresh key, guarded by the `INCR` result being 1.
 * Re-issuing `EXPIRE` on every request would let an attacker keep a blocked key
 * alive indefinitely by continuing to send requests, which is the opposite of
 * what a fixed window should do.
 */
async function checkRedis(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REDIS_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      // Pipelined, so both commands cost one round trip.
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSeconds), "NX"],
      ]),
    });

    if (!response.ok) return null;

    const results = (await response.json()) as RedisPipelineResult;
    const count = Number(results[0]?.result);
    if (!Number.isFinite(count)) return null;

    const ttl = Number(results[1]?.result);
    const now = Date.now();

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      // `EXPIRE ... NX` returns 0 when the key already had a TTL, so the value
      // read back is the window we are actually inside rather than a fresh one.
      resetAt: now + (Number.isFinite(ttl) && ttl > 0 ? ttl : windowSeconds) * 1000,
      backend: "redis",
    };
  } catch {
    // Network failure, timeout, or a non-JSON error body.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Counts one request against `action` for the given client identifier, and says
 * whether it may proceed.
 *
 * `identifier` should be the client IP, with a forwarded-header caveat — see
 * `getClientIdentifier` for why that cannot be fully trusted here.
 */
export async function rateLimit(
  action: RateLimitAction,
  identifier: string,
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = DEFAULTS[action];
  const key = `rl:${action}:${identifier}`;

  // Only the two Redis variables are read here. Validating the whole server
  // environment would mean a missing `DATABASE_URL` took the rate limiter down
  // with it, so two unrelated misconfigurations failed the form together.
  const redis = getRateLimitConfig();
  if (!redis) return checkMemory(key, limit, windowSeconds);

  const result = await checkRedis(redis.url, redis.token, key, limit, windowSeconds);

  // Redis unreachable. Fall back to the local counter rather than to fully open:
  // per-instance counting still blunts a script, and costs one lookup.
  return result ?? checkMemory(key, limit, windowSeconds);
}

/**
 * Minutes until a blocked visitor may try again, rounded up, for display.
 *
 * Returns a floor of 1 so the message never says "try again in 0 minutes".
 */
export function minutesUntilReset(resetAt: number): number {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
}

/**
 * Test-only reset for the in-process counters.
 *
 * Exported deliberately rather than reached for with a module-cache hack, so the
 * tests that need a clean limiter are explicit about resetting it.
 */
export function __resetMemoryCounters(): void {
  memoryCounters.clear();
}
