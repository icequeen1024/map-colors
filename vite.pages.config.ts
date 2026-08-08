import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const basePath = process.env.PAGES_BASE_PATH?.trim() ?? "";

if (basePath && (!basePath.startsWith("/") || basePath.endsWith("/"))) {
  throw new Error("PAGES_BASE_PATH must start with / and must not end with /.");
}

export default defineConfig({
  base: basePath ? `${basePath}/` : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  define: {
    "process.env.NEXT_PUBLIC_BASE_PATH": JSON.stringify(basePath),
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
});
