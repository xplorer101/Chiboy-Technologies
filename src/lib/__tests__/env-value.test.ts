import { describe, expect, it } from "vitest";

import {
  normaliseEnvValue,
  normaliseOptionalEnvValue,
} from "@/lib/utils/env-value";

/**
 * The env-value normaliser.
 *
 * This is small on purpose and tested directly because the failure it prevents
 * is invisible: a quoted or newline-padded value looks correct in the dashboard
 * and in a log line, and only shows up as "the key is rejected" or "the address
 * is invalid" from a third party.
 */
describe("normaliseEnvValue", () => {
  it("returns undefined and null as an empty string", () => {
    expect(normaliseEnvValue(undefined)).toBe("");
    expect(normaliseEnvValue(null)).toBe("");
  });

  it("trims surrounding whitespace, including a trailing newline", () => {
    expect(normaliseEnvValue("  re_abc123  ")).toBe("re_abc123");
    expect(normaliseEnvValue("support@chiboytechnologies.com\n")).toBe(
      "support@chiboytechnologies.com",
    );
  });

  it("strips one pair of matching surrounding quotes", () => {
    expect(normaliseEnvValue('"re_abc123"')).toBe("re_abc123");
    expect(normaliseEnvValue("'re_abc123'")).toBe("re_abc123");
    // Quotes with padding inside them, as a copied `.env` line often has.
    expect(normaliseEnvValue('  "chiboytechnologies.com"  ')).toBe(
      "chiboytechnologies.com",
    );
  });

  it("leaves an apostrophe inside a value alone", () => {
    // The reason only a MATCHING pair is removed: a display name is allowed to
    // contain a quote, and stripping a lone one would corrupt it.
    expect(normaliseEnvValue("O'Brien <sales@chiboytechnologies.com>")).toBe(
      "O'Brien <sales@chiboytechnologies.com>",
    );
    expect(normaliseEnvValue('"O\'Brien"')).toBe("O'Brien");
  });

  it("does not strip unbalanced or non-matching quotes", () => {
    expect(normaliseEnvValue('"re_abc123')).toBe('"re_abc123');
    expect(normaliseEnvValue('"re_abc123\'')).toBe('"re_abc123\'');
    expect(normaliseEnvValue('"')).toBe('"');
  });

  it("leaves a normal value untouched", () => {
    expect(normaliseEnvValue("re_abc123")).toBe("re_abc123");
  });
});

describe("normaliseOptionalEnvValue", () => {
  /**
   * The distinction that matters to the schema: `.default()` fills a key that is
   * ABSENT, not one that is empty. Returning `undefined` here is what lets
   * `MAX_UPLOAD_MB` fall back to 4 instead of being coerced from "" to 0 and
   * failing the minimum.
   */
  it("preserves 'not set' as undefined", () => {
    expect(normaliseOptionalEnvValue(undefined)).toBeUndefined();
    expect(normaliseOptionalEnvValue(null)).toBeUndefined();
  });

  it("normalises a value that is present", () => {
    expect(normaliseOptionalEnvValue("  4  ")).toBe("4");
    expect(normaliseOptionalEnvValue('"private-uploads"')).toBe("private-uploads");
  });
});
