import path from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      // "server-only" só existe compilado dentro do Next (webpack aliasa em
      // build); fora dele (aqui, no Vitest) precisa apontar pro stub vazio
      // que o próprio Next usa na compilação do lado servidor.
      "server-only": path.resolve(rootDir, "node_modules/next/dist/compiled/server-only/empty.js"),
    },
  },
});
