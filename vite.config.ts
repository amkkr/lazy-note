/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/lazy-note/" : "/",
  plugins: [
    react(),
    {
      name: "datasources-watcher",
      configureServer(server) {
        server.middlewares.use("/api/posts", (req, res, next) => {
          if (req.method === "GET") {
            const datasourcesPath = path.join(process.cwd(), "datasources");

            try {
              const files = fs
                .readdirSync(datasourcesPath)
                .filter((file: string) => file.endsWith(".md"))
                .map((file: string) => file.replace(".md", ""));

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(files));
            } catch (error) {
              res.statusCode = 500;
              res.end(
                JSON.stringify({
                  error: "Failed to read datasources directory",
                })
              );
            }
          } else {
            next();
          }
        });

        server.middlewares.use("/datasources", (req, res, next) => {
          if (!req.url) {
            res.statusCode = 400;
            res.end("Bad request");
            return;
          }

          const filePath = path.join(process.cwd(), "datasources", req.url);

          try {
            const content = fs.readFileSync(filePath, "utf8");
            res.setHeader("Content-Type", "text/plain");
            res.end(content);
          } catch (error) {
            res.statusCode = 404;
            res.end("File not found");
          }
        });
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
