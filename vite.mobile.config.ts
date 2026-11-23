import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Dedicated static SPA build config for Capacitor (Android).
 * Leaves TanStack Start SSR (`vite.config.ts` / `npm run build`) untouched.
 */
export default defineConfig({
  root: path.resolve(__dirname, "mobile"),
  publicDir: path.resolve(__dirname, "public"),
  envDir: __dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist-mobile"),
    emptyOutDir: true,
  },
});
