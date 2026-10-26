import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

function readNetworkConfig() {
  const file = path.resolve(process.cwd(), "network.conf");
  if (!fs.existsSync(file)) return "";
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((row) => /^\s*API_BASE_URL\s*=/.test(row));
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "").replace(/\/$/, "") : "";
}

const apiBaseUrl = (process.env.RUNSTOCK_API_BASE_URL || readNetworkConfig()).replace(/\/$/, "");

export default defineConfig({
  plugins: [react()],
  base: "./",
  root: '.',
  define: {
    __RUNSTOCK_API_BASE_URL__: JSON.stringify(apiBaseUrl),
  },
  build: {
    outDir: 'dist-mobile',
    rollupOptions: {
      input: {
        main: './mobile.html'
      }
    }
  },
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
