import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The rule under test: an unwritable storage backend must degrade to a stored
 * enquiry, never to an unhandled throw.
 *
 * On Vercel only /tmp is writable, so `UPLOAD_DIR` under the project root
 * fails with EROFS for every attachment. Before this was handled, that throw
 * escaped the Server Action and reached the visitor as a 500 — a real customer
 * lost because of a supplementary file, on the platform the site is deployed
 * to. The failure mode is invisible locally, because a developer machine's
 * project root is writable.
 */

const mkdir = vi.fn();
const writeFile = vi.fn();
const unlink = vi.fn();

vi.mock("node:fs/promises", () => ({
  mkdir: (...args: unknown[]) => mkdir(...args),
  writeFile: (...args: unknown[]) => writeFile(...args),
  // `deleteStoredFile` reaches for this through a dynamic import, so it has to
  // be on the mock even though the module is statically imported elsewhere.
  unlink: (...args: unknown[]) => unlink(...args),
}));

/** A real PNG header, so the file passes magic-byte detection. */
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

function pngFile(name = "screen.png"): File {
  return new File([PNG], name, { type: "image/png" });
}

function fsError(code: string): Error {
  const error = new Error(`${code}: operation failed, read-only file system`) as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

async function loadStorage() {
  const mod = await import("@/lib/upload/storage");
  return mod.storeAttachments;
}

describe("storeAttachments with an unwritable backend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // A PNG is bigger than 0 bytes and has a real signature.
    writeFile.mockResolvedValue(undefined);
    unlink.mockResolvedValue(undefined);
    // Vitest does not load .env.local, and `getServerEnv` validates before
    // storage is touched. The value is never used to connect to anything here.
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/db";
  });

  it("reports a read-only filesystem as storageUnavailable, not a throw", async () => {
    mkdir.mockRejectedValue(fsError("EROFS"));
    const storeAttachments = await loadStorage();

    const outcome = await storeAttachments([pngFile()]);

    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error("expected a rejection");
    expect(outcome.storageUnavailable).toBe(true);
  });

  it("returns a message that does not leak a path or a stack", async () => {
    mkdir.mockRejectedValue(fsError("EROFS"));
    const storeAttachments = await loadStorage();

    const outcome = await storeAttachments([pngFile()]);
    if (outcome.ok) throw new Error("expected a rejection");

    expect(outcome.message).toMatch(/could not save/i);
    expect(outcome.message).not.toMatch(/\/|at |Error:|node_modules/);
  });

  it("survives a failure that only happens on the write, not the mkdir", async () => {
    mkdir.mockResolvedValue(undefined);
    writeFile.mockRejectedValue(fsError("EACCES"));
    const storeAttachments = await loadStorage();

    const outcome = await storeAttachments([pngFile()]);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error("expected a rejection");
    expect(outcome.storageUnavailable).toBe(true);
  });

  it("removes any file written before the failure, so none is orphaned", async () => {
    // Two files: the first writes, the second fails. The first is now on disk
    // with no row referencing it, because the request is created without
    // attachments.
    mkdir.mockResolvedValue(undefined);
    writeFile.mockResolvedValueOnce(undefined).mockRejectedValueOnce(fsError("ENOSPC"));
    const storeAttachments = await loadStorage();

    await storeAttachments([pngFile("a.png"), pngFile("b.png")]);

    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(unlink).toHaveBeenCalledTimes(1);
  });

  it("does not touch the filesystem at all when no file is attached", async () => {
    const storeAttachments = await loadStorage();

    const outcome = await storeAttachments([]);

    expect(outcome.ok).toBe(true);
    expect(mkdir).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("rejects an unacceptable file as a validation failure, not a storage one", async () => {
    // A .exe: refused on its bytes. The action must still throw this one away
    // rather than record a request, because the visitor needs to fix it.
    const storeAttachments = await loadStorage();

    const outcome = await storeAttachments([
      new File([new Uint8Array([0x4d, 0x5a, 0x90, 0x00])], "tool.exe"),
    ]);

    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error("expected a rejection");
    expect(outcome.storageUnavailable).toBeUndefined();
    expect(mkdir).not.toHaveBeenCalled();
  });
});
