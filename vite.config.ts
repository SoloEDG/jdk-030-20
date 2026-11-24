import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// The project lives under a non-ASCII directory name; `new URL(...).pathname`
// leaves it percent-encoded, so decode it before handing the alias to Vite.
const srcRoot = decodeURIComponent(new URL("./src", import.meta.url).pathname);

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { "@": srcRoot } },
});
