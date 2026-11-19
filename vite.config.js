import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// In development, /api goes to the local Express server. In production the site calls VITE_API_URL directly.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:4000" } },
});
