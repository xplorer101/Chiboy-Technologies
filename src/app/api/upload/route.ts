import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { getBlobConfig } from "@/lib/env";
import { getClientIdentifier } from "@/lib/actions/shared";
import { rateLimit } from "@/lib/rate-limit";
import {
  IMAGE_CONTENT_TYPES,
  IMAGE_EXTENSION_BY_TYPE,
  IMAGE_MAX_BYTES,
  isAllowedImagePathname,
  uploadedImagePayloadSchema,
} from "@/lib/validation/images";

/**
 * Vercel Blob upload token exchange.
 *
 * WHY THIS ROUTE EXISTS AT ALL
 * ----------------------------
 * The image bytes never pass through here — the browser uploads them straight
 * to Blob storage. What does pass through is the client asking for permission
 * first: the Blob SDK posts an event here, this route decides whether the
 * upload is acceptable and, if so, hands back a short-lived token scoped to one
 * pathname, one content type and one size cap. That keeps `BLOB_READ_WRITE_TOKEN`
 * on the server, where it cannot be read from the page.
 *
 * WHY THE SIZE AND TYPE ARE SET IN THE TOKEN
 * ------------------------------------------
 * They are the only checks the visitor cannot edit: Blob enforces them when the
 * bytes actually arrive. The checks in the browser are a courtesy, and the
 * checks in the Server Action verify the URLs that come back — but a token that
 * carried no limit would make both of those the only thing standing between the
 * store and an arbitrary upload.
 *
 * WHY IT IS RATE LIMITED
 * ----------------------
 * This is an unauthenticated endpoint that mints write tokens. It stores no row
 * and takes no payment, so without a limit a script could fill the store one
 * five-megabyte image at a time. The limit is per connection and generous enough
 * that a real visitor uploading five images, twice, never notices it.
 */

/** Node runtime: the Blob SDK's token signing uses Node crypto. */
export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const blob = getBlobConfig();

  if (!blob) {
    // A misconfigured deployment rather than a bad request. Logged, because the
    // visitor only ever sees the generic message.
    console.error(
      "[upload] BLOB_READ_WRITE_TOKEN is not configured, so image uploads are disabled. Connect a Blob store to the project.",
    );
    return NextResponse.json(
      { error: "Image uploads are not available right now." },
      { status: 503 },
    );
  }

  const identifier = await getClientIdentifier();
  const limit = await rateLimit("upload", identifier);

  if (!limit.allowed) {
    console.error(
      `[upload] Rate limit exceeded (backend: ${limit.backend}); refusing a token request from ${identifier}.`,
    );
    return NextResponse.json(
      { error: "Too many uploads from this connection. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  let body: HandleUploadBody;

  try {
    body = (await request.json()) as HandleUploadBody;
  } catch (error) {
    console.error(
      "[upload] Could not parse the request body as JSON:",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json({ error: "Could not read the upload request." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      token: blob.token,
      request,
      body,
      // Called once per upload, before a token is issued. Throwing here refuses
      // the upload without ever handing out a write token.
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!isAllowedImagePathname(pathname)) {
          console.error(`[upload] Refused pathname outside the allowed image prefix: ${pathname}`);
          throw new Error("Unsupported upload path.");
        }

        let payload: unknown;
        try {
          payload = JSON.parse(clientPayload ?? "");
        } catch (error) {
          console.error(
            `[upload] Refused upload with an unparseable client payload for ${pathname}:`,
            error instanceof Error ? error.message : "unknown error",
          );
          throw new Error("Unsupported upload payload.");
        }

        const parsed = uploadedImagePayloadSchema.safeParse(payload);
        if (!parsed.success) {
          console.error(
            `[upload] Refused upload of an unsupported image type for ${pathname}:`,
            parsed.error.issues.map((issue) => issue.message).join(", "),
          );
          throw new Error("Unsupported image type.");
        }

        // The extension the pathname claims must match the type the client
        // declared, so an image cannot be filed under a name that lies about it.
        const extension = IMAGE_EXTENSION_BY_TYPE[parsed.data.type];
        if (!pathname.toLowerCase().endsWith(`.${extension}`)) {
          console.error(
            `[upload] Refused upload whose pathname extension does not match its declared type ${parsed.data.type}: ${pathname}`,
          );
          throw new Error("Upload path does not match the image type.");
        }

        return {
          allowedContentTypes: [...IMAGE_CONTENT_TYPES],
          maximumSizeInBytes: IMAGE_MAX_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "[upload] Failed to generate an upload token:",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json({ error: "That upload could not be started." }, { status: 400 });
  }
}
