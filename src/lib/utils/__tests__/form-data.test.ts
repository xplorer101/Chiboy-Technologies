import { describe, expect, it } from "vitest";

import { buildFormData } from "@/lib/utils/form-data";

/**
 * Tests for the FormData builder.
 *
 * This function decides what the server actually receives, so the cases that
 * matter are the ones where a plausible-looking form would send the wrong thing:
 * values the validator normalised, fields that should not be posted at all, and
 * files that must arrive as files rather than as their names.
 */

describe("buildFormData", () => {
  it("carries the validated values, not the raw DOM values", () => {
    // The schema lower-cases the email and collapses whitespace in the name.
    // Reading the form element directly would post the original keystrokes.
    const data = buildFormData({
      values: { email: "ada@example.com", fullName: "Ada Lovelace" },
    });

    expect(data.get("email")).toBe("ada@example.com");
    expect(data.get("fullName")).toBe("Ada Lovelace");
  });

  it("drops null and undefined rather than sending the string 'null'", () => {
    const data = buildFormData({ values: { phone: null, nickname: undefined, name: "Ada" } });

    expect(data.has("phone")).toBe(false);
    expect(data.has("nickname")).toBe(false);
    expect(data.get("name")).toBe("Ada");
  });

  it("preserves an empty string, which means something different from absent", () => {
    // "No phone number given" and "the phone field was not in the form" are
    // different facts, and only the first is true here.
    const data = buildFormData({ values: { phone: "" } });

    expect(data.get("phone")).toBe("");
  });

  it("stringifies numbers and booleans", () => {
    const data = buildFormData({ values: { year: 2026, consent: true } });

    expect(data.get("year")).toBe("2026");
    expect(data.get("consent")).toBe("true");
  });

  it("skips values that are not stringifiable", () => {
    // An object in a form payload means a bug upstream, and coercing it would
    // post "[object Object]" as if it were the visitor's answer.
    const data = buildFormData({ values: { bad: { nested: true } as unknown, name: "Ada" } });

    expect(data.has("bad")).toBe(false);
    expect(data.get("name")).toBe("Ada");
  });

  it("uses set semantics, so a duplicated key cannot submit twice", () => {
    const data = buildFormData({ values: { a: "one" } });
    data.set("a", "two");

    expect(data.getAll("a")).toEqual(["two"]);
  });

  it("appends files under the name the action reads", () => {
    const file = new File(["contents"], "fault.png", { type: "image/png" });
    const list = makeFileList([file]);

    const data = buildFormData({ values: { name: "Ada" }, files: list });

    const attached = data.getAll("attachments");
    expect(attached).toHaveLength(1);
    expect((attached[0] as File).name).toBe("fault.png");
  });

  it("attaches nothing when the file input is empty or absent", () => {
    expect(buildFormData({ values: {}, files: null }).getAll("attachments")).toHaveLength(0);
    expect(buildFormData({ values: {}, files: makeFileList([]) }).getAll("attachments")).toHaveLength(0);
  });

  it("forwards the honeypot under the input's own name", () => {
    // The name comes from the element, so a rename of the field cannot leave the
    // check reading the wrong key.
    const data = buildFormData({
      values: { name: "Ada" },
      honeypot: { name: "website", value: "https://spam.example" },
    });

    expect(data.get("website")).toBe("https://spam.example");
  });

  it("ignores a honeypot that is not present", () => {
    expect(buildFormData({ values: { name: "Ada" } }).has("website")).toBe(false);
    expect(
      buildFormData({ values: { name: "Ada" }, honeypot: null }).has("website"),
    ).toBe(false);
  });
});

/**
 * A minimal `FileList`.
 *
 * `buildFormData` only iterates one, so a structural stand-in is enough — and
 * a real `FileList` cannot be constructed in every runtime without a `<input>`.
 */
function makeFileList(files: File[]): FileList {
  return {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: function* () {
      yield* files;
    },
  } as unknown as FileList;
}
