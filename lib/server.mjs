import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";

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

export function startServer(rootDir, options = {}) {
  const host = options.host || "127.0.0.1";
  const port = Number.isInteger(options.port) ? options.port : 4173;

  function resolvePath(urlPath) {
    const cleanPath = decodeURIComponent((urlPath || "/").split("?")[0]);
    const requested = cleanPath === "/" ? "/index.html" : cleanPath;
    const resolved = path.normalize(path.join(rootDir, requested));
    if (!resolved.startsWith(rootDir)) return null;
    return resolved;
  }

  function serveFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    createReadStream(filePath).pipe(res);
  }

  const server = createServer((req, res) => {
    try {
      const filePath = resolvePath(req.url || "/");
      if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }
      serveFile(filePath, res);
    } catch {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Server error");
    }
  });

  server.listen(port, host, () => {
    const url = `http://${host}:${port}/`;
    if (options.open) console.log(`\nOpen: ${url}\n`);
    else console.log(url);
  });

  return server;
}
