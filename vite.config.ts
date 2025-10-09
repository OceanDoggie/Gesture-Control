import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";   // ✅ 新增
// ❌ runtimeErrorOverlay / cartographer 这些是 Replit 用的，Netlify 不需要
// import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// ✅ 在 ESM 模式下手动恢复 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // ✅ 改这里：Netlify 部署用根路径，不要用 GitHub Pages 的 "/Gesture-Control/"
  base: "/",

  plugins: [
    react(),
    // ❌ 移除 Replit 的插件，避免打包报错
    // runtimeErrorOverlay(),
  ],

  resolve: {
    alias: {
      // ✅ 保留别名，方便导入
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },

  // ✅ 明确项目根目录是 client/
  root: path.resolve(__dirname, "client"),

  build: {
    // ✅ 输出目录在 client/dist，而不是根目录的 dist/public
    outDir: path.resolve(__dirname, "client", "dist"),
    emptyOutDir: true, // ✅ 每次 build 自动清空 dist，避免旧文件残留
  },

  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
