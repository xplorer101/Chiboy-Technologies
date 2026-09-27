import { describe, expect, it } from "vitest";
import { isDatabaseUnavailableError } from "@/lib/db-errors";

/**
 * Regression tests for database failure classification.
 *
 * The case that prompted this file: a production build failed with
 *
 *   Error: Connection terminated due to connection timeout
 *     [cause]: Error: Connection terminated unexpectedly
 *
 * The original detector only inspected `error.code`, which Prisma leaves
 * undefined when it wraps a driver error. A database hiccup therefore took the
 * whole homepage down instead of rendering the empty state. The wrapped shape
 * below is copied from that real failure.
 */
describe("isDatabaseUnavailableError", () => {
  it("detects the wrapped pooler timeout that previously broke the build", () => {
    const error = Object.assign(
      new Error("Connection terminated due to connection timeout"),
      {
        cause: new Error("Connection terminated unexpectedly"),
      },
    );

    expect(isDatabaseUnavailableError(error)).toBe(true);
  });

  it("detects an unmigrated schema", () => {
    // Postgres 42P01 undefined_table is the normal state on a fresh database.
    const error = Object.assign(
      new Error(
        'Invalid `prisma.portfolioProject.findMany()` invocation: relation "portfolio_projects" does not exist',
      ),
      { code: "42P01" },
    );

    expect(isDatabaseUnavailableError(error)).toBe(true);
  });

  it("detects Prisma's own unreachable-database codes", () => {
    for (const code of ["P1001", "P1002", "P1008", "P1017", "ECONNREFUSED", "ETIMEDOUT"]) {
      expect(isDatabaseUnavailableError(Object.assign(new Error("boom"), { code }))).toBe(
        true,
      );
    }
  });

  it("finds a code that only appears several layers down the cause chain", () => {
    const error = Object.assign(new Error("prisma said no"), {
      cause: Object.assign(new Error("adapter failed"), {
        cause: Object.assign(new Error("socket hang up"), { code: "ECONNRESET" }),
      }),
    });

    expect(isDatabaseUnavailableError(error)).toBe(true);
  });

  it("treats a genuine query bug as a real error, not an outage", () => {
    // A mistake in code must stay loud during development rather than being
    // silently swallowed into an empty state.
    const error = Object.assign(
      new Error("Unknown argument `nope`"),
      { code: "P2009" },
    );

    expect(isDatabaseUnavailableError(error)).toBe(false);
  });

  it("returns false for non-error values rather than throwing", () => {
    expect(isDatabaseUnavailableError(null)).toBe(false);
    expect(isDatabaseUnavailableError(undefined)).toBe(false);
    expect(isDatabaseUnavailableError("connection terminated")).toBe(false);
    expect(isDatabaseUnavailableError(42)).toBe(false);
  });

  it("does not loop forever on a self-referential cause", () => {
    const error: { message: string; cause?: unknown } = { message: "harmless" };
    error.cause = error;

    expect(isDatabaseUnavailableError(error)).toBe(false);
  });

  it("does not recurse without bound on a deep chain of unknown errors", () => {
    let error: { message: string; cause?: unknown } = { message: "harmless" };
    for (let i = 0; i < 50; i += 1) {
      error = { message: "harmless", cause: error };
    }

    expect(isDatabaseUnavailableError(error)).toBe(false);
  });
});
