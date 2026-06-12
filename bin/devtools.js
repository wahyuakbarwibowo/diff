#!/usr/bin/env node
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

function parseArgs(argv) {
  const options = { host: "127.0.0.1", port: 4173, open: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--host" && argv[i + 1]) options.host = argv[++i];
    else if (arg === "--port" && argv[i + 1]) options.port = Number(argv[++i]);
    else if (arg === "--open") options.open = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
  }
  return options;
}

function printHelp() {
  console.log(`devtools-offline\n\nUsage:\n  devtools-offline [--host 127.0.0.1] [--port 4173] [--open]\n\nOptions:\n  --host   Host to bind (default: 127.0.0.1)\n  --port   Port to bind (default: 4173)\n  --open   Print the local URL more prominently for quick opening\n  --help   Show this message\n`);
}

function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const requested = cleanPath === "/" ? "/index.html" : cleanPath;
  const resolved = path.normalize(path.join(rootDir, requested));
  if (!resolved.startsWith(rootDir)) return null;
  return resolved;
}

async function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  createReadStream(filePath).pipe(res);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}
if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
  console.error("Invalid --port value");
  process.exit(1);
}

const server = createServer(async (req, res) => {
  try {
    const filePath = resolvePath(req.url || "/");
    if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    await serveFile(filePath, res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
});

server.listen(options.port, options.host, () => {
  const url = `http://${options.host}:${options.port}/`;
  if (options.open) console.log(`\nOpen: ${url}\n`);
  else console.log(url);
});
