#!/usr/bin/env node
/** Compares two W1 hash inventories (current schema and the prior round's schema). */
import { readFileSync } from "node:fs";

function load(file) {
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  const rows = Array.isArray(parsed) ? parsed : parsed.files;
  const map = new Map();
  for (const row of rows) map.set(row.relativePath ?? row.path, row);
  return map;
}

const [beforeFile, afterFile, filter] = process.argv.slice(2);
if (!beforeFile || !afterFile) {
  console.error("usage: node scripts/w1final/compare-hashes.mjs <before.json> <after.json> [path-prefix]");
  process.exit(2);
}
const before = load(beforeFile);
const after = load(afterFile);
const keep = (key) => !filter || key.startsWith(filter);
const changed = [];
const added = [];
const removed = [];
for (const [key, row] of after) {
  if (!keep(key)) continue;
  const old = before.get(key);
  if (!old) added.push(key);
  else if (old.sha256 !== row.sha256) changed.push({ path: key, before: old.sha256, after: row.sha256, beforeBytes: old.bytes, afterBytes: row.bytes });
}
for (const key of before.keys()) {
  if (keep(key) && !after.has(key)) removed.push(key);
}
console.log(
  JSON.stringify(
    {
      before: beforeFile,
      after: afterFile,
      filter: filter ?? null,
      beforeCount: before.size,
      afterCount: after.size,
      changedCount: changed.length,
      addedCount: added.length,
      removedCount: removed.length,
      changed,
      added,
      removed,
    },
    null,
    2,
  ),
);
