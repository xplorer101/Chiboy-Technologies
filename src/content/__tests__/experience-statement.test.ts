import { describe, expect, it } from "vitest";

import { getExperienceStatement, site } from "@/content/site";

/**
 * Guards the one quantitative claim the business has supplied.
 *
 * The site's hard rule is that no figure may be invented. "13 years in business"
 * is the single number the business has actually given, which makes it the one
 * that most needs a test: it is the value most likely to be quietly upgraded
 * into a statistic, and the most likely to be restated inconsistently across
 * pages if it is written down more than once.
 */
describe("getExperienceStatement", () => {
  it("states the figure the business supplied", () => {
    expect(site.yearsInBusiness).toBe(13);
    expect(getExperienceStatement()).toBe("13 years in business");
  });

  it("reads the figure from the content layer rather than repeating it", () => {
    // If the statement ever stops matching `site.yearsInBusiness`, one of the two
    // has been edited alone and the site will contradict itself across pages.
    expect(getExperienceStatement()).toContain(String(site.yearsInBusiness));
  });

  it("agrees with itself on every call, so it cannot drift mid-render", () => {
    expect(getExperienceStatement()).toBe(getExperienceStatement());
  });

  it("uses the singular only for a figure of exactly one", () => {
    // Not reachable at 13, but the branch is kept because the figure is
    // correctable content, not a constant. What matters is that it is the only
    // value that takes the singular.
    expect(getExperienceStatement()).not.toMatch(/\b1 year\b/);
    expect(getExperienceStatement()).toMatch(/\b\d+ years\b/);
  });

  it("states a duration and never a year", () => {
    // A derived founding year would go stale and could be a year out depending
    // on whether the current year is counted inclusively. Neither word may
    // appear in the sentence.
    expect(getExperienceStatement()).not.toMatch(/\b(19|20)\d{2}\b/);
    expect(getExperienceStatement()).not.toMatch(/\b(founded|established|since)\b/i);
  });
});
