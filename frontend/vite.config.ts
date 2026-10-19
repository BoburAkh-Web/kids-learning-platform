import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": { target: env.API_TARGET, changeOrigin: true },
        "/socket.io": { target: env.API_TARGET, changeOrigin: true, ws: true },
      },
    },
  };
});
