import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Handler tests must not be converted into RPC stubs by the app's Vite plugin.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  test: { include: ["src/lib/partner-access.test.ts", "src/lib/partner-generation.test.ts", "src/lib/partner-math.test.ts"] },
});