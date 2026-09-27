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
    },
  },
});
