import { z } from "zod";

/**
 * Image attachment rules for the service request form.
 *
 * PURE AND SHARED, like `forms.ts`. Three places need these rules and they must
 * not be allowed to disagree:
 *
 *  - the browser, to reject a selection before anything is uploaded;
 *  - the upload route, to decide whether a pathname may receive a token;
 *  - the Server Action, to check the URLs that come back.
 *
 * The client's copy is the only one a visitor sees an error from, so it is the
 * copy that has to read well — but it is also the copy that can be bypassed, so
 * the server checks the same rules again rather than trusting it.
 *
 * WHY THE FILE BYTES ARE NOT VALIDATED HERE
 * -----------------------------------------
 * This module runs in the browser, where a `File`'s `type` is whatever the
 * client says it is. The real content check is Vercel Blob's own
 * `allowedContentTypes`, plus the extension check on the stored URL — neither
 * of which the visitor controls. Nothing here should be mistaken for a security
 * boundary; it is a courtesy that keeps a bad selection from ever leaving the
 * page.
 */

/** How many images one request may carry. */
export const IMAGE_MAX_FILES = 5;

/** Per-image ceiling, in bytes. Vercel Blob enforces this from the token. */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** The same ceiling in megabytes, for messages and the file picker hint. */
export const IMAGE_MAX_MB = 5;

/** The only image types accepted. */
export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

/** The value for an `<input type="file" accept="...">` attribute. */
export const IMAGE_ACCEPT = IMAGE_CONTENT_TYPES.join(",");

/** Where every uploaded image is stored, so the prefix check has one source. */
export const IMAGE_BLOB_PREFIX = "service-requests/";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

/** Extensions derived from the accepted types, used to build the blob path. */
export const IMAGE_EXTENSION_BY_TYPE: Record<ImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isImageContentType(value: string): value is ImageContentType {
  return (IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

/**
 * The pathname an uploaded image is stored under.
 *
 * Generated on the client, because the browser uploads the bytes directly to
 * Blob and the server never sees them. The random part makes a collision
 * impossible without asking Blob for a random suffix, which would strip the
 * extension we rely on when reading the URL back.
 */
export function imageBlobPathname(type: ImageContentType, unique: string): string {
  return `${IMAGE_BLOB_PREFIX}${unique}.${IMAGE_EXTENSION_BY_TYPE[type]}`;
}

/**
 * A client-side image selection: name, declared type and size.
 *
 * Metas only. A `File` is never put into a schema, because Zod would then be a
 * second place holding a live browser blob for no benefit — the component owns
 * the `File` objects and passes their metadata through here for checking.
 */
export const imageSelectionSchema = z
  .array(
    z.object({
      name: z.string().min(1),
      type: z
        .string()
        .refine(isImageContentType, {
          message: "Only JPG, PNG and WEBP images are accepted.",
        }),
      size: z
        .number()
        .int()
        .positive({ message: "That image is empty." })
        .max(IMAGE_MAX_BYTES, {
          message: `Each image must be ${IMAGE_MAX_MB} MB or smaller.`,
        }),
    }),
  )
  .max(IMAGE_MAX_FILES, {
    message: `Please choose no more than ${IMAGE_MAX_FILES} images.`,
  });

/**
 * The payload the browser attaches to an upload request.
 *
 * Sent alongside the pathname and checked in the route, so the type the client
 * claims is validated on the server before a token is issued — not merely
 * trusted because the browser said so.
 */
export const uploadedImagePayloadSchema = z.object({
  type: z
    .string()
    .refine(isImageContentType, { message: "Unsupported image type." }),
});

/**
 * A stored image URL, ready to be written to the database.
 *
 * Three checks, all about what the Server Action will accept from a form field
 * a visitor can edit:
 *
 *  - HTTPS, because a public blob is always served over it;
 *  - a Vercel Blob host, so a crafted submission cannot put an arbitrary URL
 *    into the record and the notification email;
 *  - an image extension, because a script filed as a `.pdf` or a `.html` is not
 *    what the field is for.
 *
 * `imageUrlsSchema` then caps the count, so "at most five" is enforced on the
 * server as well as in the browser.
 */
export const imageUrlSchema = z
  .string()
  .trim()
  .url({ message: "Each image must have a valid URL." })
  .refine((value) => value.startsWith("https://"), {
    message: "Image URLs must use HTTPS.",
  })
  .refine((value) => hostOf(value).endsWith("blob.vercel-storage.com"), {
    message: "Image URLs must point at our storage.",
  })
  .refine((value) => IMAGE_EXTENSIONS.some((ext) => pathnameOf(value).endsWith(`.${ext}`)), {
    message: "Only JPG, PNG and WEBP images are accepted.",
  });

export const imageUrlsSchema = z
  .array(imageUrlSchema)
  .max(IMAGE_MAX_FILES, {
    message: `Please attach no more than ${IMAGE_MAX_FILES} images.`,
  });

/** Whether a pathname is one this app is willing to issue an upload token for. */
export function isAllowedImagePathname(pathname: string): boolean {
  if (!pathname.startsWith(IMAGE_BLOB_PREFIX)) return false;
  const lower = pathname.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`));
}

/** Lower-cased hostname, or an empty string for anything unparseable. */
function hostOf(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Lower-cased path, or an empty string for anything unparseable. */
function pathnameOf(value: string): string {
  try {
    return new URL(value).pathname.toLowerCase();
  } catch {
    return "";
  }
}
