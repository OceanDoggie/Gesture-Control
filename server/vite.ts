import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { nanoid } from "nanoid";
import react from "@vitejs/plugin-react";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * 统一的前端服务设置函数
 * 生产环境：挂载打包后的静态文件（dist目录）
 * 开发环境：使用 Vite dev 中间件实现热更新
 */
export async function setupFrontend(app: Express, server?: Server) {
  // 生产环境：使用静态文件服务
  if (process.env.NODE_ENV === "production") {
    // 使用 process.cwd() 定位项目根目录，解决 __dirname 在 ESM 下不存在的问题
    const distPath = path.resolve(process.cwd(), "dist");

    // 检查 dist 目录是否存在
    if (!fs.existsSync(distPath)) {
      console.error(`❌ 找不到打包目录: ${distPath}`);
      console.error(`   请先运行: npm run build`);
      throw new Error(
        `Could not find the build directory: ${distPath}, make sure to build the client first`
      );
    }

    // 挂载静态文件目录
    app.use(express.static(distPath));

    // 所有未匹配的路由都返回 index.html（用于 SPA 路由）
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    console.log("[express] static frontend mounted:", distPath);
  } 
  // 开发环境：使用 Vite dev 中间件
  else {
    if (!server) {
      throw new Error("Server instance is required for Vite dev middleware");
    }

    const serverOptions = {
      middlewareMode: true,
      // ✅ 明确指定 Vite HMR WebSocket 路径，避免与业务 WebSocket 冲突
      hmr: { 
        server,
        path: '/__vite_hmr'  // Vite 默认路径，显式声明避免混淆
      },
      allowedHosts: true as const,
    };

    // 使用 process.cwd() 定位项目根目录
    const projectRoot = process.cwd();
    const clientRoot = path.resolve(projectRoot, "client");

    const vite = await createViteServer({
      base: "/",
      plugins: [react()],
      resolve: {
        alias: {
          "@": path.resolve(clientRoot, "src"),
          "@shared": path.resolve(projectRoot, "shared"),
          "@assets": path.resolve(projectRoot, "attached_assets"),
        },
      },
      root: clientRoot,
      build: {
        outDir: path.resolve(projectRoot, "dist"),
        emptyOutDir: true,
      },
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg, options) => {
          viteLogger.error(msg, options);
          process.exit(1);
        },
      },
      server: serverOptions,
      appType: "custom",
    });

    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const clientTemplate = path.resolve(
          projectRoot,
          "client",
          "index.html",
        );

        // 总是从磁盘重新读取 index.html，以便检测到更改
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`,
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });

    console.log("[vite] dev middleware enabled");
  }
}
