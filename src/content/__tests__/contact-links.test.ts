import { afterEach, describe, expect, it } from "vitest";
import {
  getEmailLink,
  getMapsLink,
  getPhoneLink,
  getServiceArea,
  getStructuredContact,
  getWhatsAppLink,
  toOpeningHoursSpec,
} from "@/content/site";

/**
 * Contact link and structured-data helpers.
 *
 * The link builders take values from the environment, so they are the one place
 * where a badly configured value could turn into a `javascript:` link or a link
 * that goes nowhere. Each is asserted here against hostile as well as realistic
 * input.
 */

const ENV_KEYS = [
  "NEXT_PUBLIC_PHONE_NUMBER",
  "NEXT_PUBLIC_WHATSAPP_NUMBER",
  "NEXT_PUBLIC_BUSINESS_EMAIL",
  "NEXT_PUBLIC_BUSINESS_LOCATION",
  "NEXT_PUBLIC_BUSINESS_HOURS",
  "NEXT_PUBLIC_SERVICE_AREA",
] as const;

/** Sets env vars for one test and restores the originals afterwards. */
function withEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  const saved = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    saved.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  return () => {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

afterEach(() => {
  // Defensive: nothing should leak between tests even if a restore is missed.
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("getPhoneLink", () => {
  it("builds a tel: link from an international number", () => {
    const restore = withEnv({ NEXT_PUBLIC_PHONE_NUMBER: "+2348102854969" });
    expect(getPhoneLink()).toBe("tel:+2348102854969");
    restore();
  });

  it("tolerates spacing and punctuation in the configured value", () => {
    const restore = withEnv({ NEXT_PUBLIC_PHONE_NUMBER: "+234 810 285 4969" });
    expect(getPhoneLink()).toBe("tel:+2348102854969");
    restore();
  });

  it("refuses a value that cannot reduce to a dial string", () => {
    // Anything that is not a digit or a leading "+" is stripped, so a hostile
    // value cannot append parameters or a second scheme to the link.
    for (const value of [
      "javascript:alert(1)",
      "tel:+2348102854969?x=1",
      "not a number",
      "+234",
      "",
    ]) {
      const restore = withEnv({ NEXT_PUBLIC_PHONE_NUMBER: value });
      expect(getPhoneLink(), value).toBeNull();
      restore();
    }
  });

  it("returns null while the value is still a placeholder", () => {
    const restore = withEnv({
      NEXT_PUBLIC_PHONE_NUMBER: "[PLACEHOLDER: business phone number]",
    });
    expect(getPhoneLink()).toBeNull();
    restore();
  });
});

describe("getEmailLink", () => {
  it("builds a mailto: link", () => {
    const restore = withEnv({
      NEXT_PUBLIC_BUSINESS_EMAIL: "chiboytechnologies@gmail.com",
    });
    expect(getEmailLink()).toBe("mailto:chiboytechnologies@gmail.com");
    restore();
  });

  it("refuses values that are not a plausible address", () => {
    for (const value of [
      "javascript:alert(1)",
      "not-an-email",
      "two@at@example.com",
      "missing-domain@",
      "@example.com",
      "",
    ]) {
      const restore = withEnv({ NEXT_PUBLIC_BUSINESS_EMAIL: value });
      expect(getEmailLink(), value).toBeNull();
      restore();
    }
  });
});

describe("getWhatsAppLink", () => {
  it("strips everything but digits for the wa.me path", () => {
    const restore = withEnv({ NEXT_PUBLIC_WHATSAPP_NUMBER: "+234 810 285 4969" });
    expect(getWhatsAppLink()).toBe("https://wa.me/2348102854969");
    restore();
  });

  it("url-encodes the prefilled message", () => {
    const restore = withEnv({ NEXT_PUBLIC_WHATSAPP_NUMBER: "+2348102854969" });
    const link = getWhatsAppLink("Hello & goodbye");

    expect(link).toContain("https://wa.me/2348102854969?text=");
    // The ampersand must be encoded, or the message would be truncated and the
    // remainder interpreted as a separate parameter.
    expect(link).toContain("Hello%20%26%20goodbye");
    expect(link).not.toContain("Hello & ");
    restore();
  });

  it("returns null for a placeholder or implausibly short number", () => {
    let restore = withEnv({ NEXT_PUBLIC_WHATSAPP_NUMBER: "[PLACEHOLDER: number]" });
    expect(getWhatsAppLink()).toBeNull();
    restore();

    restore = withEnv({ NEXT_PUBLIC_WHATSAPP_NUMBER: "12345" });
    expect(getWhatsAppLink()).toBeNull();
    restore();
  });
});

describe("getMapsLink", () => {
  it("searches for the configured address, encoded", () => {
    const restore = withEnv({
      NEXT_PUBLIC_BUSINESS_LOCATION: "Suite 12, City Shoppers Plaza, Kuje, FCT Abuja",
    });

    const link = getMapsLink();
    expect(link).toContain("google.com/maps/search/");
    expect(link).toContain("Suite%2012%2C%20City%20Shoppers%20Plaza");
    restore();
  });

  it("returns null while the address is a placeholder", () => {
    const restore = withEnv({
      NEXT_PUBLIC_BUSINESS_LOCATION: "[PLACEHOLDER: business address]",
    });
    expect(getMapsLink()).toBeNull();
    restore();
  });
});

describe("toOpeningHoursSpec", () => {
  it("converts the supplied hours to ISO 8601", () => {
    expect(toOpeningHoursSpec("Monday to Friday, 8:00am - 6:00pm")).toBe(
      "Mo-Fr 08:00-18:00",
    );
  });

  it("handles 24-hour times", () => {
    expect(toOpeningHoursSpec("Monday to Friday, 08:00 - 18:00")).toBe(
      "Mo-Fr 08:00-18:00",
    );
  });

  it("normalises 12-hour edge cases", () => {
    expect(toOpeningHoursSpec("Monday to Friday, 12:00pm - 11:30pm")).toBe(
      "Mo-Fr 12:00-23:30",
    );
    expect(toOpeningHoursSpec("Monday to Friday, 12:30am - 1:00pm")).toBe(
      "Mo-Fr 00:30-13:00",
    );
  });

  it("accepts abbreviated days and a hyphen range", () => {
    expect(toOpeningHoursSpec("Mon-Fri, 9:00am - 5:00pm")).toBe("Mo-Fr 09:00-17:00");
  });

  it("accepts a comma-separated day list", () => {
    expect(toOpeningHoursSpec("Saturday, Sunday, 10:00am - 2:00pm")).toBe(
      "Sa,Su 10:00-14:00",
    );
  });

  it("omits the field rather than guessing at anything it cannot parse", () => {
    // Each of these would put wrong opening hours in front of a customer, so
    // they must produce null and the field is left out of the structured data.
    for (const value of [
      "",
      "Monday to Friday", // no times
      "8:00am - 6:00pm", // no days
      "Monday to Friday, 8:00am", // open-ended
      "Monday to Sunday, 24:00 - 06:00", // impossible hour
      "Someday to Friday, 8:00am - 6:00pm", // unknown day
      "[PLACEHOLDER: business hours]",
      "By appointment", // free text
    ]) {
      expect(toOpeningHoursSpec(value), value).toBeNull();
    }
  });

  it("refuses an ambiguous 12-hour time with no am or pm", () => {
    // "8:00 - 6:00" read as 24-hour would be 08:00-06:00, i.e. a range that ends
    // before it starts. Guessing would be wrong half the time.
    expect(toOpeningHoursSpec("Monday to Friday, 8:00 - 6:00")).toBeNull();
  });

  it("rejects a range that mixes 12-hour and 24-hour ends", () => {
    // Both readings are individually valid, so there is no single correct
    // answer and the field must be dropped.
    expect(toOpeningHoursSpec("Monday to Friday, 8:00am - 18:00")).toBeNull();
  });
});

describe("getServiceArea", () => {
  it("returns a configured area", () => {
    const restore = withEnv({ NEXT_PUBLIC_SERVICE_AREA: "FCT Abuja" });
    expect(getServiceArea()).toBe("FCT Abuja");
    restore();
  });

  it("returns null when unset, blank, or still a placeholder", () => {
    for (const value of [undefined, "", "   ", "[PLACEHOLDER: service area]"]) {
      const restore = withEnv({ NEXT_PUBLIC_SERVICE_AREA: value });
      expect(getServiceArea(), String(value)).toBeNull();
      restore();
    }
  });

  it("is never inferred from the office address", () => {
    // The address is known but the coverage area is not, so the structured data
    // must carry no areaServed claim at all rather than repeating the address.
    const restore = withEnv({
      NEXT_PUBLIC_BUSINESS_LOCATION: "Suite 12, City Shoppers Plaza, Kuje, FCT Abuja",
    });
    const structured = getStructuredContact();

    expect(structured.address).toBeDefined();
    expect(structured).not.toHaveProperty("areaServed");
    restore();
  });
});

describe("getStructuredContact", () => {
  it("emits only supplied values and omits the rest", () => {
    const restore = withEnv({
      NEXT_PUBLIC_PHONE_NUMBER: "+2348102854969",
      NEXT_PUBLIC_BUSINESS_EMAIL: "chiboytechnologies@gmail.com",
      NEXT_PUBLIC_BUSINESS_LOCATION: "Suite 12, City Shoppers Plaza, Kuje, FCT Abuja",
      NEXT_PUBLIC_BUSINESS_HOURS: "Monday to Friday, 8:00am - 6:00pm",
      NEXT_PUBLIC_SERVICE_AREA: "FCT Abuja",
    });

    expect(getStructuredContact()).toEqual({
      telephone: "+2348102854969",
      email: "mailto:chiboytechnologies@gmail.com",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Suite 12, City Shoppers Plaza, Kuje, FCT Abuja",
        addressCountry: "NG",
      },
      openingHours: "Mo-Fr 08:00-18:00",
      areaServed: "FCT Abuja",
    });
    restore();
  });

  it("emits nothing at all when every value is a placeholder", () => {
    // This is the property that matters most: no key means no field, so a
    // placeholder string can never reach a search engine.
    const restore = withEnv({
      NEXT_PUBLIC_PHONE_NUMBER: "[PLACEHOLDER: phone]",
      NEXT_PUBLIC_BUSINESS_EMAIL: "[PLACEHOLDER: email]",
      NEXT_PUBLIC_BUSINESS_LOCATION: "[PLACEHOLDER: address]",
      NEXT_PUBLIC_BUSINESS_HOURS: "[PLACEHOLDER: hours]",
    });

    expect(getStructuredContact()).toEqual({});
    restore();
  });

  it("keeps the address verbatim rather than splitting it into parts", () => {
    // Free text cannot be reliably split into street/city/region, and a wrong
    // locality in structured data is worse than a coarse one.
    const restore = withEnv({
      NEXT_PUBLIC_BUSINESS_LOCATION: "Suite 12, City Shoppers Plaza, Kuje, FCT Abuja",
    });

    const { address } = getStructuredContact();
    expect(address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "Suite 12, City Shoppers Plaza, Kuje, FCT Abuja",
      addressCountry: "NG",
    });
    // No invented components.
    expect(address).not.toHaveProperty("addressLocality");
    expect(address).not.toHaveProperty("addressRegion");
    expect(address).not.toHaveProperty("postalCode");
    restore();
  });
});
