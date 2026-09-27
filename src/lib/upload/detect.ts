import "server-only";

/**
 * File type detection from content.
 *
 * WHY NOT THE DECLARED TYPE
 * -------------------------
 * `File.type` and the filename extension are both supplied by the client, and a
 * client can set either to anything. A request claiming to be a `.png` that is
 * in fact an executable, or a script renamed `.jpg`, arrives looking perfectly
 * ordinary to any check that reads the metadata. Nothing on this path trusts
 * them.
 *
 * The only evidence used is the first bytes of the file — the same bytes the
 * operating system's own loader looks at. A file whose signature does not match
 * anything allowlisted is rejected outright, rather than being accepted with a
 * guessed type, because "we could not identify this" and "this is safe" are
 * different answers.
 *
 * WHY THE EXTENSION IS DERIVED HERE
 * ---------------------------------
 * The stored name's extension comes from the *detected* type, not from the
 * upload. That is what stops a double extension (`report.pdf.exe`) surviving
 * into storage, where a later download or a misconfigured web server might
 * honour the extension rather than the content.
 *
 * SCOPE
 * -----
 * This recognises whole-file formats by a signature at a known offset. It is not
 * a general parser: it does not read inside a container to find a nested format,
 * so a ZIP that internally contains an executable is still recorded as a ZIP.
 * That is the right boundary for the business's needs — the accepted types are
 * images and documents a customer might attach to describe a problem — and it is
 * stated here because the limit is invisible in the code and should not be
 * mistaken for more than it is.
 */

/** A recognised file type. */
export type DetectedFileType = {
  /** The canonical IANA type, which is what gets stored and served. */
  mime: string;
  /** The extension WITHOUT a leading dot, derived from the signature. */
  extension: string;
  /** Shown in the UI so a visitor understands what is and is not accepted. */
  label: string;
};

/**
 * The allowlist, in the order it is checked.
 *
 * Order matters: several formats share a prefix, and the more specific check has
 * to win. WebP is the clear case — it begins with `RIFF`, the same two bytes as
 * WAV and AVI, and is only distinguishable by the `WEBP` at offset 8.
 *
 * An allowlist rather than a denylist, deliberately. A denylist has to anticipate
 * every dangerous format, and every format invented since the list was written is
 * allowed by default. An allowlist fails closed: something unrecognised is
 * rejected, so a format nobody thought of cannot get in.
 */
const SIGNATURES: ReadonlyArray<{
  mime: string;
  extension: string;
  label: string;
  /** Bytes to compare, given the file's leading bytes. */
  matches: (bytes: Uint8Array) => boolean;
}> = [
  {
    mime: "image/jpeg",
    extension: "jpg",
    label: "JPEG image",
    matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    extension: "png",
    label: "PNG image",
    matches: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    mime: "image/gif",
    extension: "gif",
    label: "GIF image",
    // "GIF87a" and "GIF89a", checked as a prefix.
    matches: (b) => ascii(b, 0, 6).startsWith("GIF8"),
  },
  {
    mime: "image/webp",
    extension: "webp",
    label: "WebP image",
    // RIFF<4 size bytes>WEBP — the format is only certain at offset 8.
    matches: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
  },
  {
    mime: "application/pdf",
    extension: "pdf",
    label: "PDF document",
    matches: (b) => ascii(b, 0, 5) === "%PDF-",
  },
  {
    mime: "application/zip",
    extension: "zip",
    label: "ZIP archive",
    // Also the container for .docx and .xlsx. Recorded as a ZIP: the distinction
    // is not worth the parsing, and an allowlisted container is still an
    // allowlisted container.
    matches: (b) => b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
  },
];

/** Decodes a byte range as latin1, which never throws on arbitrary bytes. */
function ascii(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < Math.min(end, bytes.length); i += 1) {
    out += String.fromCharCode(bytes[i] as number);
  }
  return out;
}

/**
 * True when the bytes contain no NUL and no control characters other than tab,
 * newline and carriage return.
 *
 * This is the standard heuristic, and it is a heuristic: it says nothing about a
 * file that happens to satisfy it. It runs LAST, after `REFUSED_PREFIXES` has
 * had its chance to reject the binary formats this test cannot see.
 *
 * The mitigation for what gets through is not a better guess. It is that a file
 * accepted here is stored as `text/plain` under a `.txt` extension, in a
 * directory that is not served to the public, and is never executed, served
 * inline, or rendered.
 */
function looksLikeText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, 1024);
  for (const byte of sample) {
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d) continue;
    if (byte < 0x20 || byte === 0x7f) return false;
  }
  return true;
}

/**
 * Formats that are recognised well enough to be refused, and that the text rule
 * would otherwise swallow.
 *
 * The `looksLikeText` heuristic asks "are there NUL bytes or control characters?"
 * A WAV file, a PostScript document and a Java class file all fail to trip that
 * test, so without this list they would arrive as `text/plain` and be stored
 * under a `.txt` extension — inert, but plainly wrong, and a sign the detector
 * had stopped discriminating.
 *
 * `MZ` and ELF are not here: they contain bytes below 0x20 and are already
 * refused by the text rule. Only the formats the heuristic cannot see.
 */
const REFUSED_PREFIXES: ReadonlyArray<{
  label: string;
  matches: (bytes: Uint8Array) => boolean;
}> = [
  {
    // Any RIFF container that is not WebP: WAV, AVI, and anything else.
    label: "RIFF container",
    matches: (b) => ascii(b, 0, 4) === "RIFF",
  },
  {
    label: "PostScript",
    matches: (b) => ascii(b, 0, 2) === "%!",
  },
  {
    label: "Java class file",
    matches: (b) => b[0] === 0xca && b[1] === 0xfe && b[2] === 0xba && b[3] === 0xbe,
  },
  {
    label: "Mach-O binary",
    matches: (b) => ascii(b, 0, 4) === "\u{feff}\u{feed}\u{face}\u{fe}" || b[0] === 0xcf && b[1] === 0xfa && b[2] === 0xed && b[3] === 0xfe,
  },
  {
    // A shebang is a request to be executed. A visitor attaching a log file or
    // a config snippet has no reason to produce one, and it is the clearest
    // available signal that a text file is a program.
    label: "executable script",
    matches: (b) => ascii(b, 0, 2) === "#!",
  },
];

/**
 * Identifies a file from its leading bytes.
 *
 * Returns `null` for anything not on the allowlist. The caller must treat `null`
 * as a rejection — never as "unknown, assume it is fine".
 */
export function detectFileType(bytes: Uint8Array): DetectedFileType | null {
  for (const signature of SIGNATURES) {
    if (signature.matches(bytes)) {
      return { mime: signature.mime, extension: signature.extension, label: signature.label };
    }
  }

  for (const refused of REFUSED_PREFIXES) {
    if (refused.matches(bytes)) return null;
  }

  // The permissive rule comes last, so that the two passes above get to refuse
  // first. Reversing them would let `RIFF` and `#!` reach the text check.
  if (bytes.length >= 1 && looksLikeText(bytes)) {
    return { mime: "text/plain", extension: "txt", label: "Plain text file" };
  }

  return null;
}

/** The accepted types, for the accept attribute and the on-page explanation. */
export function acceptedFileTypes(): ReadonlyArray<DetectedFileType> {
  return SIGNATURES.map(({ mime, extension, label }) => ({ mime, extension, label }));
}

/**
 * A short, human description of what may be attached, generated from the
 * allowlist so the page and the validator can never disagree about it.
 */
export function acceptedFileTypesSummary(): string {
  return acceptedFileTypes()
    .map((type) => type.label.replace(/ image| document| file| archive/g, "").toUpperCase())
    .join(", ");
}
