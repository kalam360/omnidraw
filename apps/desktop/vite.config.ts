import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  // The Canvas team's <OmnidrawCanvas/> is lazy-loaded via React.lazy(),
  // which Vite/Rollup automatically splits into its own chunk. Once the
  // Canvas team's package lands, the Excalidraw bundle will only load on
  // routes that mount the canvas (Session, PresentationMode).
});
