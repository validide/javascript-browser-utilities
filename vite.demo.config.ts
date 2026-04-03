import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const workspaceRoot = fileURLToPath(new URL(".", import.meta.url));
const demoRoot = fileURLToPath(new URL("./docs/demo", import.meta.url));

export default defineConfig({
  root: demoRoot,
  resolve: {
    alias: {
      "@demo": demoRoot,
      "@workspace": workspaceRoot,
    },
  },
  server: {
    open: "/index.html",
  },
});
