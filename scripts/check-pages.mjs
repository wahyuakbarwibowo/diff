import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const entries = await readdir(rootDir);
const htmlFiles = entries.filter((name) => name.endsWith(".html")).sort();
let failed = false;

for (const file of htmlFiles) {
  const fullPath = path.join(rootDir, file);
  const html = await readFile(fullPath, "utf8");
  if (!html.includes('<meta charset="UTF-8">')) {
    console.error(`${file}: missing UTF-8 charset meta tag`);
    failed = true;
  }
  if (!html.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">')) {
    console.error(`${file}: missing viewport meta tag`);
    failed = true;
  }
  if (!html.includes('id="theme"')) {
    console.error(`${file}: missing theme control`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`Checked ${htmlFiles.length} HTML files`);
