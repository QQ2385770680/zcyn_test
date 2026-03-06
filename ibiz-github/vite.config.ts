import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

/**
 * GitHub Pages 部署配置
 *
 * 部署地址：https://<username>.github.io/zcyn_test/
 * 通过环境变量 GITHUB_PAGES_BASE 可覆盖 base 路径：
 *   - 子路径部署（默认）：GITHUB_PAGES_BASE=/zcyn_test/
 *   - 自定义域名部署：GITHUB_PAGES_BASE=/
 */
const BASE_PATH = process.env.GITHUB_PAGES_BASE || "/zcyn_test/";

export default defineConfig({
  base: BASE_PATH,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
  },
});
