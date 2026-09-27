import { describe, expect, it } from "vitest";
import { buildPoolConfig } from "@/lib/db-config";
import { isPlaceholder } from "@/lib/env";

describe("isPlaceholder", () => {
  it("treats bracketed values as placeholders", () => {
    expect(isPlaceholder("[PLACEHOLDER: business phone]")).toBe(true);
    expect(isPlaceholder("[your-domain]")).toBe(true);
  });

  it("treats empty and whitespace-only values as placeholders", () => {
    expect(isPlaceholder("")).toBe(true);
    expect(isPlaceholder("   ")).toBe(true);
  });

  it("treats real values as genuine", () => {
    expect(isPlaceholder("+44 20 7123 4567")).toBe(false);
    expect(isPlaceholder("info@example.com")).toBe(false);
  });

  it("does not mistake a real value containing brackets for a placeholder", () => {
    // Guards against a regex that is too permissive.
    expect(isPlaceholder("Warehouse [Unit 4]")).toBe(false);
  });
});

describe("buildPoolConfig", () => {
  it("parses a standard PostgreSQL connection string", () => {
    const config = buildPoolConfig(
      "postgresql://user:secret@db.example.com:5432/mydb",
    );

    expect(config.host).toBe("db.example.com");
    expect(config.port).toBe(5432);
    expect(config.user).toBe("user");
    expect(config.password).toBe("secret");
    expect(config.database).toBe("mydb");
  });

  it("defaults the port to 5432 when omitted", () => {
    const config = buildPoolConfig("postgres://user:secret@db.example.com/mydb");
    expect(config.port).toBe(5432);
  });

  it("percent-decodes credentials containing reserved characters", () => {
    const config = buildPoolConfig(
      "postgres://us%40er:p%40ss%3Aword@db.example.com:5432/mydb",
    );

    expect(config.user).toBe("us@er");
    expect(config.password).toBe("p@ss:word");
  });

  it("supplies the Supabase CA for Supabase hosts", () => {
    const config = buildPoolConfig(
      "postgres://postgres.ref:secret@aws-0-eu-west-2.pooler.supabase.com:6543/postgres",
    );

    expect(config.ssl).toBeDefined();
    expect(config.ssl).toMatchObject({ rejectUnauthorized: true });
    // The CA must be a real PEM block, not an empty or missing file.
    expect(String(config.ssl?.ca)).toContain("BEGIN CERTIFICATE");
  });

  it("leaves TLS to the system trust store for non-Supabase hosts", () => {
    const config = buildPoolConfig("postgres://user:secret@db.example.com:5432/mydb");
    expect(config.ssl).toBeUndefined();
  });

  it("uses a small pool so serverless instances cannot exhaust connections", () => {
    const config = buildPoolConfig("postgres://user:secret@db.example.com:5432/mydb");
    expect(config.max).toBeLessThanOrEqual(10);
  });

  it("rejects a malformed connection string without leaking it", () => {
    expect(() => buildPoolConfig("not-a-url")).toThrow(/not a valid connection URL/i);
  });

  it("rejects a URL with no database name", () => {
    expect(() => buildPoolConfig("postgres://user:secret@db.example.com:5432")).toThrow(
      /database name/i,
    );
  });

  it("never includes the password in a thrown error message", () => {
    const secret = "hunter2-super-secret";
    let message = "";
    try {
      buildPoolConfig(`postgres://user:${secret}@db.example.com:5432`);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).not.toContain(secret);
  });
});
