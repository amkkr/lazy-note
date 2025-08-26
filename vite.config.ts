/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { registerApiMiddlewares } from "./src/api";
import fs from "node:fs";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/lazy-note/" : "/",
  plugins: [
    react(),
    {
      name: "datasources-plugin",
      configureServer(server) {
        // APIミドルウェアを登録
        registerApiMiddlewares(server);
      },
      generateBundle() {
        // ビルド時にdatasourcesフォルダをdistにコピー
        const datasourcesPath = path.resolve("datasources");
        const outputPath = path.resolve("dist", "datasources");

        if (fs.existsSync(datasourcesPath)) {
          fs.mkdirSync(outputPath, { recursive: true });
          const files = fs.readdirSync(datasourcesPath);
          
          for (const file of files) {
            if (file.endsWith(".md")) {
              const sourcePath = path.join(datasourcesPath, file);
              const destPath = path.join(outputPath, file);
              fs.copyFileSync(sourcePath, destPath);
            }
          }
        }
      },
    },
  ],
  server: {
    watch: {
      ignored: ["!**/datasources/**/*.md"],
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: [
      "src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    typecheck: {
      checker: "tsc",
      include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
      tsconfig: "./tsconfig.test.json",
    },
  },
});
