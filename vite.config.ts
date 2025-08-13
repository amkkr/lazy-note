/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { registerApiMiddlewares } from "./src/api";

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/lazy-note/" : "/",
  plugins: [
    react(),
    {
      name: "datasources-watcher",
      configureServer(server) {
        // APIミドルウェアを登録
        registerApiMiddlewares(server);
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
