import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CASE_WORD_RE = /[A-Z]+(?![a-z])|[A-Z]?[a-z]+|[0-9]+/g;

export async function runCli(argv) {
  const [command = "serve", ...rest] = argv;
  switch (command) {
    case "help":
    case "--help":
    case "-h":
      printHelp();
      return { ok: true };
    case "serve":
      return { ok: true, mode: "serve", options: parseServeOptions(rest) };
    case "diff":
      console.log(await runDiff(rest));
      return { ok: true };
    case "json":
      console.log(await runJson(rest));
      return { ok: true };
    case "jwt":
      console.log(await runJwt(rest));
      return { ok: true };
    case "timestamp":
      console.log(runTimestamp(rest));
      return { ok: true };
    case "hash":
      console.log(await runHash(rest));
      return { ok: true };
    case "case":
      console.log(await runCase(rest));
      return { ok: true };
    case "url":
      console.log(await runUrl(rest));
      return { ok: true };
    case "uuid":
      console.log(runUuid(rest));
      return { ok: true };
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

export function printHelp() {
  console.log(`dtool\n\nUsage:\n  dtool serve [--host 127.0.0.1] [--port 4173] [--open]\n  dtool diff <left> <right>\n  dtool json <format|minify|sort|validate> <input>\n  dtool jwt decode <token>\n  dtool timestamp [value]\n  dtool hash [sha256|sha1|sha384|sha512|md5] <input> [--file]\n  dtool case <camel|pascal|snake|kebab|constant|dot|path|title|lower|upper> <input>\n  dtool url <inspect|encode|decode> <input>\n  dtool uuid [v4|v7|ulid] [count]\n\nNotes:\n  - No command defaults to 'serve' for the browser UI.\n  - Use quotes for text with spaces.\n  - For file-based commands, pass --file before the path.\n`);
}

export function parseServeOptions(args) {
  const options = { host: "127.0.0.1", port: 4173, open: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--host" && args[i + 1]) options.host = args[++i];
    else if (arg === "--port" && args[i + 1]) options.port = Number(args[++i]);
    else if (arg === "--open") options.open = true;
    else if (arg === "--help" || arg === "-h") return { help: true };
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new Error("Invalid --port value");
  }
  return options;
}

async function runDiff(args) {
  if (args.length < 2) throw new Error("Usage: dtool diff <left> <right>");
  const left = await maybeReadArg(args[0]);
  const right = await maybeReadArg(args[1]);
  return makeUnifiedDiff(left, right);
}

async function runJson(args) {
  const action = args[0] || "format";
  const input = await readSingleInput(args.slice(1));
  const value = JSON.parse(input);
  if (action === "validate") return "Valid JSON";
  if (action === "minify") return JSON.stringify(value);
  if (action === "sort") return JSON.stringify(sortKeys(value), null, 2);
  if (action === "format") return JSON.stringify(value, null, 2);
  throw new Error(`Unknown json action: ${action}`);
}

async function runJwt(args) {
  const action = args[0] || "decode";
  if (action !== "decode") throw new Error("Only 'decode' is supported for jwt right now");
  const token = (await readSingleInput(args.slice(1))).trim();
  const parts = token.split(".");
  if (parts.length < 2) throw new Error("JWT must contain at least header.payload");
  const header = JSON.parse(base64UrlDecode(parts[0]));
  const payload = JSON.parse(base64UrlDecode(parts[1]));
  const lines = [
    "Header:",
    JSON.stringify(header, null, 2),
    "",
    "Payload:",
    JSON.stringify(payload, null, 2),
  ];
  const claimSummary = formatJwtClaims(payload);
  if (claimSummary) lines.push("", claimSummary);
  return lines.join("\n");
}

function runTimestamp(args) {
  const raw = args[0] || "now";
  const date = parseTimestamp(raw);
  const ms = date.getTime();
  const sec = Math.floor(ms / 1000);
  return [
    `Input: ${raw}`,
    `ISO: ${date.toISOString()}`,
    `Unix (s): ${sec}`,
    `Unix (ms): ${ms}`,
    `Local: ${date.toString()}`,
  ].join("\n");
}

async function runHash(args) {
  let algorithm = "sha256";
  let fileMode = false;
  const rest = [];
  for (const arg of args) {
    if (arg === "--file") fileMode = true;
    else rest.push(arg);
  }
  if (rest[0] && /^[a-z0-9-]+$/i.test(rest[0]) && ["md5", "sha1", "sha256", "sha384", "sha512"].includes(rest[0].toLowerCase())) {
    algorithm = rest.shift().toLowerCase();
  }
  const input = fileMode ? await readFile(rest[0]) : await readSingleInput(rest);
  return createHash(algorithm).update(input).digest("hex");
}

async function runCase(args) {
  const target = args[0];
  if (!target) throw new Error("Usage: dtool case <target> <input>");
  const input = await readSingleInput(args.slice(1));
  const words = splitWords(input);
  return convertCase(target, words);
}

async function runUrl(args) {
  const action = args[0] || "inspect";
  const input = await readSingleInput(args.slice(1));
  if (action === "encode") return encodeURIComponent(input);
  if (action === "decode") return decodeURIComponent(input);
  if (action !== "inspect") throw new Error(`Unknown url action: ${action}`);
  const url = new URL(input);
  const query = [...url.searchParams.entries()];
  const lines = [
    `href: ${url.href}`,
    `origin: ${url.origin}`,
    `protocol: ${url.protocol}`,
    `host: ${url.host}`,
    `hostname: ${url.hostname}`,
    `port: ${url.port || "(default)"}`,
    `pathname: ${url.pathname}`,
    `search: ${url.search || "(empty)"}`,
    `hash: ${url.hash || "(empty)"}`,
  ];
  if (query.length) {
    lines.push("query:");
    for (const [key, value] of query) lines.push(`  ${key}=${value}`);
  }
  return lines.join("\n");
}

function runUuid(args) {
  const kind = (args[0] || "v4").toLowerCase();
  const count = Math.max(1, Number(args[1] || 1));
  const values = [];
  for (let i = 0; i < count; i++) {
    if (kind === "v4") values.push(randomUUID());
    else if (kind === "v7") values.push(uuidv7());
    else if (kind === "ulid") values.push(ulid());
    else throw new Error(`Unknown uuid variant: ${kind}`);
  }
  return values.join("\n");
}

async function maybeReadArg(value) {
  try {
    return await readFile(value, "utf8");
  } catch {
    return value;
  }
}

async function readSingleInput(args) {
  let fileMode = false;
  const values = [];
  for (const arg of args) {
    if (arg === "--file") fileMode = true;
    else values.push(arg);
  }
  if (!values.length) throw new Error("Missing input");
  if (fileMode) return readFile(values[0], "utf8");
  return values.join(" ");
}

function makeUnifiedDiff(left, right) {
  const a = left.replace(/\r\n/g, "\n").split("\n");
  const b = right.replace(/\r\n/g, "\n").split("\n");
  const ops = diffLines(a, b);
  const lines = ["--- left", "+++ right"];
  for (const op of ops) {
    const prefix = op.type === "equal" ? " " : op.type === "delete" ? "-" : "+";
    for (const line of op.lines) lines.push(prefix + line);
  }
  return lines.join("\n");
}

function diffLines(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pushOp(ops, "equal", a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pushOp(ops, "delete", a[i++]);
    } else {
      pushOp(ops, "add", b[j++]);
    }
  }
  while (i < a.length) pushOp(ops, "delete", a[i++]);
  while (j < b.length) pushOp(ops, "add", b[j++]);
  return ops;
}

function pushOp(ops, type, line) {
  const last = ops[ops.length - 1];
  if (last && last.type === type) last.lines.push(line);
  else ops.push({ type, lines: [line] });
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  return Buffer.from(normalized + pad, "base64").toString("utf8");
}

function formatJwtClaims(payload) {
  const keys = ["iat", "nbf", "exp"].filter((key) => typeof payload[key] === "number");
  if (!keys.length) return "";
  const now = Date.now();
  return keys.map((key) => {
    const ms = payload[key] * 1000;
    const status = key === "exp" ? (ms < now ? "expired" : "active") : (ms > now ? "future" : "active");
    return `${key}: ${new Date(ms).toISOString()} (${status})`;
  }).join("\n");
}

function parseTimestamp(raw) {
  if (raw === "now") return new Date();
  if (/^-?\d+$/.test(raw)) {
    const num = Number(raw);
    const abs = Math.abs(num);
    if (abs < 1e11) return new Date(num * 1000);
    return new Date(num);
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid timestamp input");
  return date;
}

function splitWords(input) {
  const normalized = input
    .replace(/[_./-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return (normalized.match(CASE_WORD_RE) || []).map((word) => word.toLowerCase());
}

function convertCase(target, words) {
  if (!words.length) return "";
  switch (target.toLowerCase()) {
    case "camel":
      return words[0] + words.slice(1).map(capitalize).join("");
    case "pascal":
      return words.map(capitalize).join("");
    case "snake":
      return words.join("_");
    case "kebab":
      return words.join("-");
    case "constant":
      return words.join("_").toUpperCase();
    case "dot":
      return words.join(".");
    case "path":
      return words.join("/");
    case "title":
      return words.map(capitalize).join(" ");
    case "lower":
      return words.join(" ");
    case "upper":
      return words.join(" ").toUpperCase();
    default:
      throw new Error(`Unknown case target: ${target}`);
  }
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function uuidv7() {
  const bytes = randomBytes(16);
  const time = BigInt(Date.now());
  for (let i = 5; i >= 0; i--) {
    bytes[i] = Number((time >> BigInt((5 - i) * 8)) & 0xffn);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuidBytes(bytes);
}

function formatUuidBytes(bytes) {
  const hex = Buffer.from(bytes).toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

function ulid() {
  const time = encodeBase32(Date.now(), 10);
  let random = "";
  const bytes = randomBytes(16);
  for (let i = 0; i < 16; i++) random += BASE32[bytes[i] & 31];
  return time + random;
}

function encodeBase32(value, length) {
  let out = "";
  let current = BigInt(value);
  while (out.length < length) {
    out = BASE32[Number(current % 32n)] + out;
    current /= 32n;
  }
  return out;
}
