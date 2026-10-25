import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    allowedHosts: ["localhost", "terminal.local"],
    proxy: {"/api": "http://127.0.0.1:3001", "/auth": "http://127.0.0.1:3001"},
    warmup: {
      clientFiles: ["./src/main.tsx"],
    },
  },
  plugins: [react()],
});
