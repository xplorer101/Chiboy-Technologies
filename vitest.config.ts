import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The unit tests target pure, framework-free logic: validators, MIME and
    // file rules, rate-limit maths, URL parsing. No DOM environment needed.
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      /**
       * `server-only` is a build-time assertion: it throws on import unless the
       * bundler has marked the importing module as server-side. Vitest is
       * neither, so a module that is correctly server-only — the rate limiter,
       * the upload detector — cannot be loaded by a test at all.
       *
       * It is stubbed to a no-op rather than removed from the source, because
       * the import in each module is the guarantee that a Client Component can
       * never pull it in. Dropping it to make a test run would trade a real
       * protection for test convenience.
       */
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
});
