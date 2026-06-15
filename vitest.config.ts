import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "virtual:pwa-register": path.resolve(dirname, "apps/web/src/test/virtual-pwa-register.ts")
    }
  },
  test: {
    css: true,
    environment: "jsdom",
    globals: true,
    include: ["apps/web/src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["apps/web/src/test/setup.ts"]
  }
});
