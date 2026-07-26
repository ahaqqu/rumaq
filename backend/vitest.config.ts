import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    server: {
      deps: {
        inline: ["cloudflare:workers"],
      },
    },
  },
  coverage: {
    thresholds: {
      statements: 90,
      branches: 80,
      functions: 85,
      lines: 90,
    },
  },
});
