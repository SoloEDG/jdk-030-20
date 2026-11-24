import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const src = decodeURIComponent(new URL("./src", import.meta.url).pathname);

export default defineConfig({
  logLevel: "error",
  plugins: [vue()],
  resolve: { alias: { "@": src } },
  build: {
    outDir: "/tmp/smoke-dist",
    emptyOutDir: true,
    lib: {
      entry: decodeURIComponent(new URL("./scripts/smoke-entry.ts", import.meta.url).pathname),
      formats: ["iife"],
      name: "Smoke",
      fileName: () => "smoke.js",
    },
  },
});
