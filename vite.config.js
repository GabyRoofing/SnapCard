import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // In dev, proxy /api calls to netlify dev (port 8888)
  server: {
    proxy: {
      "/api": "http://localhost:8888",
    },
  },
});
