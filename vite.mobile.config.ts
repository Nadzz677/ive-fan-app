import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = import.meta.dirname;

/**
 * Dedicated static SPA build config for Capacitor (Android).
 * Leaves TanStack Start SSR (`vite.config.ts` / `npm run build`) untouched.
 */
export default defineConfig({
  root: path.resolve(rootDir, "mobile"),
  publicDir: path.resolve(rootDir, "public"),
  envDir: rootDir,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  build: {
    outDir: path.resolve(rootDir, "dist-mobile"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
  },
});
