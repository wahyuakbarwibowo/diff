#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { printHelp, runCli } from "../lib/cli.mjs";
import { startServer } from "../lib/server.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

try {
  const result = await runCli(process.argv.slice(2));
  if (result?.mode === "serve") {
    if (result.options?.help) {
      printHelp();
      process.exit(0);
    }
    startServer(rootDir, result.options);
  }
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}
