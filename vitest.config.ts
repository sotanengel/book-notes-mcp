import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 80,
      },
      include: ["src/**/*.ts"],
      exclude: ["src/cli/index.ts", "**/*.d.ts"],
    },
  },
});
