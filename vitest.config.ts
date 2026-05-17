import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    css: true,
    environment: "jsdom",
    globals: true,
    include: ["apps/web/src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["apps/web/src/test/setup.ts"]
  }
});
