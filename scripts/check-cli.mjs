import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const bin = path.join(rootDir, "bin", "devtools.js");

const checks = [
  ["diff", "hello", "hullo"],
  ["json", "format", '{"a":1}'],
  ["jwt", "decode", "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMifQ."],
  ["timestamp", "1700000000"],
  ["hash", "sha256", "hello"],
  ["case", "snake", "Hello World"],
  ["url", "inspect", "https://example.com/a?x=1"],
  ["uuid", "v7", "1"],
];

for (const args of checks) {
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(`CLI check failed: ${args.join(" ")}`);
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

console.log(`Checked ${checks.length} CLI commands`);
