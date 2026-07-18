import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    exclude: [
      ...configDefaults.exclude,
      "tools/video/prepare/**",
      "tools/video/shots/**",
    ],
    setupFiles: ["./src/test/setup.ts"],
  },
});
