/**
 * Test stand-in for the `server-only` package.
 *
 * Aliased in `vitest.config.ts`. See the note there: the real module throws on
 * import outside a server bundle, which is exactly the protection worth keeping,
 * and exactly what stops a unit test from importing a correctly server-only
 * module. This file exists so both can be true.
 */
export {};
