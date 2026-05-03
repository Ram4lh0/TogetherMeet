import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/playtomic": {
        target: "https://playtomic.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/playtomic/, "/api/clubs/availability"),
      },
    },
  },
});
