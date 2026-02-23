/**
 * Vite config for the frontend app.
 * Root is frontend/ so index.html and public/ live here; backend is referenced via alias.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  root: undefined,
  publicDir: "public",
  build: {
    outDir: path.resolve(__dirname, "../dist"),
    emptyOutDir: true,
  },
  plugins: [react()],
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@backend": path.resolve(__dirname, "../backend/src"),
    },
  },
}));
