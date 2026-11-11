#!/usr/bin/env node
/**
 * W1-FINAL — pre/post source inventory.
 *
 * Hashes only the declared, non-secret project surfaces. It never walks or
 * stats the developer D1 store, historical run roots, `.dev.vars*` or `.env*`.
 * The directory list below is explicit so a protected root cannot be reached
 * by a recursive walk.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const DIRECTORIES = [
  "server",
  "shared",
  "worker",
  "src",
  "tests",
  "e2e",
  "scripts",
  "drizzle/migrations",
];

const ROOT_FILES = [
  "package.json",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "vite.config.ts",
  "playwright.config.ts",
  "wrangler.jsonc",
  "vitest.config.ts",
  "AGENTS.md",
  "AGANT.MD",
  "HANDOFF.MD",
];

const FORBIDDEN_SEGMENTS = [
  ".wrangler",
  ".wrangler-e2e",
  ".wrangler-perf",
  ".wrangler-reliability",
  ".wrangler-transition-audit",
  "node_modules",
  "dist",
  "playwright-report",
  "test-results",
];

function isForbidden(relative) {
  const normalized = relative.replaceAll("\\", "/").toLowerCase();
  if (/(^|\/)\.env(\.|$)/.test(normalized)) return true;
  if (/(^|\/)\.dev\.vars(\.|$)/.test(normalized)) return true;
  return FORBIDDEN_SEGMENTS.some((segment) => normalized.split("/").includes(segment));
}

function walk(relativeDir, out) {
  if (isForbidden(relativeDir)) return;
  let entries;
  try {
    entries = readdirSync(path.join(projectRoot, relativeDir), { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const relative = `${relativeDir}/${entry.name}`.replaceAll("\\", "/");
    if (isForbidden(relative)) continue;
    if (entry.isDirectory()) walk(relative, out);
    else if (entry.isFile()) out.push(relative);
  }
}

const files = [];
for (const dir of DIRECTORIES) walk(dir, files);
for (const file of ROOT_FILES) {
  try {
    if (statSync(path.join(projectRoot, file)).isFile()) files.push(file);
  } catch {
    /* optional root file */
  }
}

const rows = [];
for (const relative of files.sort()) {
  const absolute = path.join(projectRoot, relative);
  const bytes = readFileSync(absolute);
  rows.push({
    relativePath: relative,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    mtimeIso: new Date(statSync(absolute).mtimeMs).toISOString(),
  });
}

const output = {
  projectRoot,
  capturedAt: new Date().toISOString(),
  fileCount: rows.length,
  files: rows,
};

const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/w1final/hash-inventory.mjs <output.json>");
  process.exit(2);
}
mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
writeFileSync(path.resolve(target), `${JSON.stringify(output, null, 2)}\n`);
console.log(
  JSON.stringify({
    output: path.resolve(target),
    fileCount: rows.length,
    migrations: rows.filter((row) => row.relativePath.startsWith("drizzle/migrations/")).length,
  }),
);
