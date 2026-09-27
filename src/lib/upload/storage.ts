import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getServerEnv } from "@/lib/env";
import { detectFileType, type DetectedFileType } from "@/lib/upload/detect";

/**
 * Local disk storage for service-request attachments.
 *
 * WHERE THE FILES GO
 * ------------------
 * `private-uploads/`, which is gitignored and is NOT inside `public/`. Next.js
 * serves `public/` statically and nothing else, so a file written here is not
 * reachable by URL at all. That is the whole security argument for the
 * directory's location: an attachment is a customer's file, and the only way to
 * read one should be through application code that checks who is asking.
 *
 * This is the single biggest deployment caveat in the project, and it is
 * recorded in the README's go-live checklist: **a serverless filesystem is
 * ephemeral.** On Vercel, `private-uploads/` is per-instance and is discarded
 * when the instance is recycled, so attachments submitted today may be gone by
 * tomorrow. That is acceptable while the site is being built and is NOT
 * acceptable in production. The interface here is deliberately narrow —
 * `storeAttachment` and `deleteStoredFile` — so swapping the local disk for S3
 * or Vercel Blob means reimplementing one file, not touching the action or the
 * form.
 *
 * THE FILENAME IS NEVER THE VISITOR'S
 * -----------------------------------
 * The stored name is a fresh UUID plus the extension derived from the detected
 * signature. The visitor's filename is kept only as a database label, never as a
 * path component. That closes three holes at once:
 *
 *  - **Path traversal.** `../../../etc/passwd` is not a path because the name is
 *    not used as a path at all. No sanitising can be got wrong when the input is
 *    discarded rather than cleaned.
 *  - **Double extensions.** `invoice.pdf.exe` cannot survive, because the
 *    extension comes from the content.
 *  - **Collisions and overwrites.** A UUID cannot already exist, so one visitor
 *    cannot overwrite another's attachment by guessing a name.
 *
 * The original name is stored trimmed to a sane length, and it is only ever
 * displayed — never used to build a filesystem path or a response header.
 */

/** How many files one request may carry. */
export const MAX_ATTACHMENTS = 3;

/** A stored attachment, as persisted against the request. */
export type StoredAttachment = {
  /** Server-generated path relative to the upload root. The database key. */
  storageKey: string;
  /** The visitor's filename, for display only. */
  originalName: string;
  /** Detected on the server. Never the client's claim. */
  mimeType: string;
  sizeBytes: number;
};

/**
 * Renders a filesystem error for the log.
 *
 * The `code` is the useful part — `EROFS` (read-only filesystem) and `EACCES`
 * say "this host cannot store files", while `ENOSPC` says "the disk is full" —
 * and neither is a secret. The path is not logged, since `UPLOAD_DIR` is
 * deployment detail rather than something an operator needs from this line.
 */
function describeFsError(error: Error): string {
  const code = (error as NodeJS.ErrnoException).code;
  return `${code ?? "unknown"}: ${error.message}`;
}

/** Why an upload was refused. Every case maps to one safe visitor message. */export type UploadRejection = {
  ok: false;
  /** Safe to show a visitor. Never includes a path, a byte offset, or a stack. */
  message: string;
  /**
   * True when the files were acceptable but the storage backend refused them —
   * a read-only filesystem, a full disk, a permissions failure. Distinct from a
   * rejected file, because the caller should keep the enquiry rather than throw
   * it away, and should tell the visitor to resend the attachment.
   */
  storageUnavailable?: boolean;
};

export type UploadOutcome =
  | { ok: true; files: StoredAttachment[] }
  | UploadRejection;

const MAX_NAME_LENGTH = 200;

/**
 * Control characters, removed from a visitor's filename before it is stored
 * or displayed. Written as escapes rather than literals so the source file
 * stays plain ASCII and readable in a diff.
 */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

/**
 * Reduces a visitor's filename to something safe to store and display.
 *
 * Control characters are stripped rather than merely rejected, because Windows
 * happily produces filenames with stray newlines and a visitor who did nothing
 * wrong should not lose their attachment over it. The result is truncated to
 * keep the database column bounded.
 */
function sanitiseDisplayName(name: string): string {
  const cleaned = name.replace(CONTROL_CHARACTERS, "").trim();
  if (cleaned.length === 0) return "attachment";
  return cleaned.length > MAX_NAME_LENGTH ? `${cleaned.slice(0, MAX_NAME_LENGTH - 1)}…` : cleaned;
}

/**
 * Validates and stores every attachment on a request.
 *
 * All-or-nothing on purpose. Storing two of three files and then failing leaves
 * a request row pointing at attachments that were never written, which is a
 * worse state to recover from than a clean rejection.
 *
 * Returns every rejection rather than the first, so a visitor who attached four
 * oversized files is told about all of them at once.
 */
export async function storeAttachments(files: readonly File[]): Promise<UploadOutcome> {
  if (files.length === 0) return { ok: true, files: [] };

  if (files.length > MAX_ATTACHMENTS) {
    return {
      ok: false,
      message: `Please attach no more than ${MAX_ATTACHMENTS} files.`,
    };
  }

  const env = getServerEnv();
  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024;
  const uploadRoot = resolveUploadRoot();

  const rejections: string[] = [];
  /** Content held in memory until every file has passed, so nothing is written
   *  for a submission that is ultimately rejected. */
  const accepted: Array<{ bytes: Uint8Array; name: string; type: DetectedFileType }> = [];

  for (const file of files) {
    if (file.size === 0) {
      rejections.push(`"${sanitiseDisplayName(file.name)}" is empty.`);
      continue;
    }

    if (file.size > maxBytes) {
      rejections.push(
        `"${sanitiseDisplayName(file.name)}" is larger than ${env.MAX_UPLOAD_MB} MB.`,
      );
      continue;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectFileType(bytes);

    if (!detected) {
      // The file is named in the message, but its content is not inspected or
      // described: saying "that looks like an executable" would tell an attacker
      // precisely which of their uploads was detected.
      rejections.push(
        `"${sanitiseDisplayName(file.name)}" is not a supported file type. Allowed types: images, PDF, ZIP and plain text.`,
      );
      continue;
    }

    // Defence in depth: the signature can be forged, so the size is re-checked
    // against the bytes actually read rather than the size the client claimed.
    if (bytes.byteLength > maxBytes) {
      rejections.push(
        `"${sanitiseDisplayName(file.name)}" is larger than ${env.MAX_UPLOAD_MB} MB.`,
      );
      continue;
    }

    accepted.push({ bytes, name: file.name, type: detected });
  }

  if (rejections.length > 0) {
    return { ok: false, message: rejections.join(" ") };
  }

  // Dated subdirectory, so a large volume of daily uploads stays navigable and
  // an entire day's attachments can be removed by deleting one directory.
  const dayFolder = new Date().toISOString().slice(0, 10);
  const requestDir = path.join(uploadRoot, dayFolder);

  const stored: StoredAttachment[] = [];

  try {
    await mkdir(requestDir, { recursive: true });

    for (const file of accepted) {
      // The only two things from the request that reach the path: a server-generated
      // UUID and an extension derived from the file's own bytes.
      const filename = `${randomUUID()}.${file.type.extension}`;
      // `turbopackIgnore` for the same reason as `resolveUploadRoot`: the target
      // is not statically known, and tracing would pull the whole project — and
      // potentially the upload directory's own contents — into the deployment.
      await writeFile(
        path.join(/* turbopackIgnore: true */ requestDir, filename),
        file.bytes,
        // "wx" fails rather than overwriting. The UUID makes a collision
        // implausible, but making it a hard error means it can never silently
        // replace an existing attachment.
        { flag: "wx" },
      );

      stored.push({
        // Always a POSIX separator: the value is stored in the database and
        // compared on read, and a Windows backslash would not match.
        storageKey: path.posix.join(dayFolder, filename),
        originalName: sanitiseDisplayName(file.name),
        mimeType: file.type.mime,
        sizeBytes: file.bytes.byteLength,
      });
    }
  } catch (error) {
    // A storage backend that cannot be written to is an infrastructure
    // failure, not a problem with the visitor's file. On Vercel this is the
    // expected path: only /tmp is writable, so `UPLOAD_DIR` under the
    // project root fails with EROFS. It has to be caught here, because an
    // uncaught throw out of a Server Action reaches the visitor as a 500 and
    // loses a real enquiry over a supplementary attachment.
    //
    // Any file already written is removed, so a half-written set is never
    // referenced by a row that gets created without it.
    await Promise.all(stored.map((file) => deleteStoredFile(file.storageKey)));

    console.error(
      "[upload] Could not write to the upload directory:",
      error instanceof Error ? describeFsError(error) : "unknown error",
    );

    return {
      ok: false,
      // Distinguishes "we cannot store files at all right now" from "your file
      // is not acceptable". The action keeps the enquiry either way, but tells
      // the visitor to resend the attachment.
      storageUnavailable: true,
      message:
        "We could not save the file you attached. Your request has still been recorded — please send the attachment again when we reply.",
    };
  }

  return { ok: true, files: stored };
}

/**
 * The absolute upload root.
 *
 * `UPLOAD_DIR` is configurable, so the bundler cannot see which directory this
 * resolves to. Left unannotated, Turbopack reads the `path.resolve` as a
 * filesystem access with an unknown target and responds by tracing the entire
 * project into the deployment output — which would mean shipping every source
 * file, and potentially the contents of the upload directory itself, to wherever
 * the site is hosted.
 *
 * The `turbopackIgnore` comment is that bundler's documented opt-out. It is used
 * here rather than a statically-scoped `path.join(process.cwd(), "private-uploads")`
 * because the directory genuinely is configurable, and hard-coding it would
 * break the one thing this constant is for.
 *
 * Once the upload path moves to object storage — which it must before go-live,
 * see the README — this function and the whole file disappear.
 */
function resolveUploadRoot(): string {
  const { UPLOAD_DIR } = getServerEnv();
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), UPLOAD_DIR);
}

/**
 * Removes stored files, used to roll back a request whose database write failed
 * after the files landed on disk.
 *
 * A no-op for a key that does not resolve inside the upload root, so a
 * corrupted or tampered database value cannot turn a cleanup into a delete of
 * something else on the filesystem.
 */
export async function deleteStoredFile(storageKey: string): Promise<void> {
  const uploadRoot = resolveUploadRoot();
  const target = path.resolve(uploadRoot, storageKey);

  // The check is on the resolved path, not the string: `a/../../b` resolves
  // outside the root and is caught here, whatever it looked like.
  if (!target.startsWith(`${uploadRoot}${path.sep}`)) return;

  const { unlink } = await import("node:fs/promises");
  await unlink(target).catch(() => undefined);
}
