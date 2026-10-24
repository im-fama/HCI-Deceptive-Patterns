
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Firebase is only loaded when VITE_FIREBASE_* is configured.
        manualChunks: (id) => (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase") ? "firebase" : undefined),
      },
    },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["tests/unit/setup.ts"],
  },
});
