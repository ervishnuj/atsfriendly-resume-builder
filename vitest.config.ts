import { defineConfig, configDefaults } from "vitest/config";
import { fileURLToPath } from "node:url";

// Full test run: app tests use the app's Vite config; partner handler tests run
// without the server-function transform so real handlers are exercised.
export default defineConfig({
  test: {
    projects: [
      {
        extends: "./vite.config.ts",
        test: { name: "app", exclude: [...configDefaults.exclude, "src/lib/partner-access.test.ts"] },
      },
      {
        resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
        test: { name: "partner-access", include: ["src/lib/partner-access.test.ts"] },
      },
    ],
  },
});
