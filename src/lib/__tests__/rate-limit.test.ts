import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetMemoryCounters, minutesUntilReset, rateLimit } from "@/lib/rate-limit";

/**
 * Tests for the rate limiter's in-process backend.
 *
 * The in-memory path is the one that runs in local development and in any
 * deployment without Redis configured, so it is the one that has to be right
 * without a network. The Redis path is exercised through a stubbed `fetch`.
 *
 * What is deliberately NOT tested: that Upstash is reachable. That is a property
 * of someone else's service, and a test asserting it would fail for reasons that
 * have nothing to do with this code.
 */

const originalFetch = globalThis.fetch;

beforeEach(() => {
  __resetMemoryCounters();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("rateLimit", () => {
  it("allows the first submission", async () => {
    const result = await rateLimit("contact", "1.2.3.4");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.backend).toBe("memory");
  });

  it("blocks once the budget is spent", async () => {
    // Five is the contact form's limit, so the sixth is the first refusal.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await rateLimit("contact", "1.2.3.4")).allowed).toBe(true);
    }

    const blocked = await rateLimit("contact", "1.2.3.4");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("keeps separate budgets per client", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await rateLimit("contact", "1.2.3.4");
    }

    // A shared bucket would let one visitor block the office behind them.
    expect((await rateLimit("contact", "5.6.7.8")).allowed).toBe(true);
  });

  it("keeps separate budgets per form", async () => {
    // Otherwise a spammer on the contact form spends the request budget too.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await rateLimit("contact", "1.2.3.4");
    }

    expect((await rateLimit("service-request", "1.2.3.4")).allowed).toBe(true);
  });

  it("reports a reset time inside the window", async () => {
    const before = Date.now();
    const result = await rateLimit("contact", "1.2.3.4");

    expect(result.resetAt).toBeGreaterThan(before);
    expect(result.resetAt).toBeLessThanOrEqual(before + 10 * 60 * 1000 + 1);
  });
});

describe("failing open", () => {
  it("falls back to local counting when Redis errors", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNRESET")) as typeof fetch;

    const result = await rateLimit("contact", "1.2.3.4");

    // Not a hard failure: a Redis outage must not become a site that cannot
    // take a message from someone whose computer is on fire.
    expect(result.allowed).toBe(true);
    expect(result.backend).toBe("memory");

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("falls back to local counting when Redis returns a non-JSON body", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("<html>502</html>", { status: 200 })) as typeof fetch;

    const result = await rateLimit("contact", "1.2.3.4");
    expect(result.backend).toBe("memory");

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("still limits when Redis is down, rather than allowing everything", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNRESET")) as typeof fetch;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await rateLimit("contact", "1.2.3.4");
    }

    // Per-instance counting still blunts a script, and it costs nothing.
    expect((await rateLimit("contact", "1.2.3.4")).allowed).toBe(false);

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });
});

describe("the Redis path", () => {
  it("allows while under the limit", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "secret-token";
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ result: 2 }, { result: 598 }]), { status: 200 }),
    ) as typeof fetch;

    const result = await rateLimit("contact", "1.2.3.4");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
    expect(result.backend).toBe("redis");
  });

  it("blocks once Redis reports the limit reached", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "secret-token";
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ result: 9 }, { result: 60 }]), { status: 200 }),
    ) as typeof fetch;

    expect((await rateLimit("contact", "1.2.3.4")).allowed).toBe(false);

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("sends INCR and a conditional EXPIRE in one pipelined request", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "secret-token";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ result: 1 }, { result: 600 }]), { status: 200 }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await rateLimit("service-request", "1.2.3.4");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.upstash.io");
    expect(init.headers).toMatchObject({ Authorization: "Bearer secret-token" });

    // `NX` on the expiry is the detail that matters: re-issuing EXPIRE on every
    // request would let a blocked client hold its own key alive indefinitely by
    // continuing to send requests.
    const commands = JSON.parse(init.body as string) as string[][];
    expect(commands[0]?.[0]).toBe("INCR");
    expect(commands[1]?.slice(0, 2)).toEqual(["EXPIRE", expect.stringContaining("rl:")]);
    expect(commands[1]?.[3]).toBe("NX");

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("namespaces the key by form and client", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "secret-token";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ result: 1 }, { result: 600 }]), { status: 200 }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await rateLimit("service-request", "9.9.9.9");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const commands = JSON.parse(init.body as string) as string[][];

    expect(commands[0]?.[1]).toBe("rl:service-request:9.9.9.9");

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });
});

describe("minutesUntilReset", () => {
  it("rounds up, so a blocked visitor is never told to wait zero minutes", async () => {
    expect(minutesUntilReset(Date.now() + 30_000)).toBe(1);
    expect(minutesUntilReset(Date.now() + 90_000)).toBe(2);
  });

  it("has a floor of one even once the window has passed", async () => {
    expect(minutesUntilReset(Date.now() - 60_000)).toBe(1);
  });
});

describe("degradation warning", () => {
  /**
   * The fallback is silent by design in the sense that it never throws and never
   * blocks a submission — but a limit that is weaker than the configured one has
   * to be visible to whoever is responsible for it, or nobody finds out. These
   * tests pin the two things that make the warning useful: it fires, and it fires
   * once rather than on every submission.
   */
  it("warns when Redis is not configured at all", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await rateLimit("contact", "9.9.9.9");

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/UPSTASH_REDIS_REST_URL/);
  });

  it("says the limit is weaker, and why serverless makes that true", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await rateLimit("contact", "9.9.9.9");

    expect(warn.mock.calls[0]?.[0]).toMatch(/serverless/i);
  });

  it("warns only once per process, not once per submission", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    for (let i = 0; i < 5; i += 1) {
      await rateLimit("contact", `9.9.9.${i}`);
    }

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("distinguishes an unconfigured limiter from an unreachable one", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await rateLimit("contact", "9.9.9.9");

    expect(warn.mock.calls[0]?.[0]).toMatch(/unreachable/i);

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("stays quiet when Redis answers, so a healthy deployment is not noisy", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: 1 }, { result: 60 }],
    }) as unknown as typeof fetch;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await rateLimit("contact", "9.9.9.9");

    expect(warn).not.toHaveBeenCalled();

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });
});
