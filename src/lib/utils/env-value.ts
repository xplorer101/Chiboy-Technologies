/**
 * Normalises a value that came from the environment.
 *
 * WHY THIS EXISTS
 * ---------------
 * A value pasted into the Vercel dashboard, or copied out of a shell, routinely
 * arrives with more than the value in it. The two that actually bite are a
 * trailing newline, and the surrounding quotes copied from a `.env` line —
 * `"re_abc123"` rather than `re_abc123`. Neither is visible in a single-line
 * password field, and both break anything that validates the *whole* string:
 *
 *  - an API key carrying quotes is sent to Resend verbatim and rejected with a
 *    401, which looks like "no request reached Resend" from the dashboard;
 *  - `OWNER_EMAIL` carrying quotes fails email validation, which used to throw
 *    out of `getServerEnv()` and take the confirmation email down with it.
 *
 * TRIMMING IS ALWAYS SAFE. STRIPPING QUOTES IS DELIBERATELY NARROW
 * --------------------------------------------------------------
 * Only ONE pair of *matching* surrounding quotes is removed, and only when the
 * first and last characters are the same quote character. That keeps an
 * apostrophe inside a legitimate value (`O'Brien`) untouched, and leaves an
 * unbalanced leading quote alone rather than mangling the value further.
 */
export function normaliseEnvValue(raw: string | undefined | null): string {
  if (raw == null) return "";

  let value = raw.trim();

  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' || first === "'") && last === first) {
      value = value.slice(1, -1).trim();
    }
  }

  return value;
}

/**
 * Like `normaliseEnvValue`, but preserves "not set".
 *
 * `undefined` and `""` are NOT interchangeable to a schema: `.default()` only
 * fills in a key that is absent, so collapsing `undefined` to `""` turns an
 * unset `MAX_UPLOAD_MB` from "use the default of 4" into "coerce '' to 0, which
 * fails the minimum". Any variable whose schema has a `.default()` must be read
 * through this function, not the other one.
 */
export function normaliseOptionalEnvValue(
  raw: string | undefined | null,
): string | undefined {
  if (raw == null) return undefined;
  return normaliseEnvValue(raw);
}
