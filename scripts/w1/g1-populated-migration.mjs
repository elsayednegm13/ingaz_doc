#!/usr/bin/env node
/**
 * W1-G1 harness: populated synthetic D1 upgrade 0007 -> 0008.
 *
 * Safety contract:
 *  - The target run root must pass the shared fail-closed isolation guard.
 *  - Migrations are copied into the run root; drizzle/migrations is never edited.
 *  - Every wrangler call gets an explicit --config and --persist-to inside the
 *    owned root, plus a sanitized child environment (no project .dev.vars, no
 *    Cloudflare credentials, no inherited host secrets).
 *  - Only the synthetic fixture set is written; no real data is read.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { assertIsolatedPersist } from "../isolation-guard.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const wranglerBin = path.join(projectRoot, "node_modules/wrangler/bin/wrangler.js");
const sourceMigrations = path.join(projectRoot, "drizzle/migrations");
const fixtureSeed = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures/seed-0007.sql");

const MIGRATION_ORDER = [
  "0001_init.sql",
  "0002_seed.sql",
  "0003_checkpoint.sql",
  "0004_invoice_revisions.sql",
  "0005_idempotency.sql",
  "0006_customer_imports.sql",
  "0007_performance_indexes.sql",
];
const MIGRATION_0008 = "0008_replay_safety_and_import_identity.sql";
const DATABASE_NAME = "exportflow-local";

function parseArgs(argv) {
  const out = { phase: "happy", runRoot: "", evidence: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--run-root") out.runRoot = argv[++i];
    else if (key === "--evidence") out.evidence = argv[++i];
    else if (key === "--phase") out.phase = argv[++i];
  }
  if (!out.runRoot) throw new Error("RUN_ROOT_REQUIRED");
  if (!out.evidence) throw new Error("EVIDENCE_REQUIRED");
  return out;
}

const ALLOWED_OS_ENV = [
  "PATH",
  "SYSTEMDRIVE",
  "SYSTEMROOT",
  "WINDIR",
  "COMSPEC",
  "PATHEXT",
  "PROGRAMFILES",
  "PROGRAMFILES(X86)",
  "OS",
  "NUMBER_OF_PROCESSORS",
  "PROCESSOR_ARCHITECTURE",
  "PROCESSOR_IDENTIFIER",
];

function toolEnv(runRoot) {
  const env = {};
  for (const key of ALLOWED_OS_ENV) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  // Keep wrangler's global config/log/cache inside the owned root.
  env.USERPROFILE = path.join(runRoot, "home");
  env.HOME = env.USERPROFILE;
  env.APPDATA = path.join(runRoot, "home", "AppData", "Roaming");
  env.LOCALAPPDATA = path.join(runRoot, "home", "AppData", "Local");
  env.TMP = path.join(runRoot, "tmp");
  env.TEMP = env.TMP;
  env.CI = "1";
  env.NO_COLOR = "1";
  env.FORCE_COLOR = "0";
  env.WRANGLER_SEND_METRICS = "false";
  env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV = "false";
  return env;
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function writeLog(evidence, name, text) {
  ensureDir(evidence);
  writeFileSync(path.join(evidence, name), text.endsWith("\n") ? text : `${text}\n`);
}

function runWrangler({ runRoot, evidence, label, args }) {
  const started = new Date().toISOString();
  const result = spawnSync(process.execPath, [wranglerBin, ...args], {
    cwd: runRoot,
    env: toolEnv(runRoot),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 240_000,
  });
  const record = {
    label,
    started,
    argv: ["node", "node_modules/wrangler/bin/wrangler.js", ...args],
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
  writeLog(evidence, `cmd-${label}.json`, JSON.stringify(record, null, 2));
  writeLog(evidence, `cmd-${label}.stdout.txt`, record.stdout);
  writeLog(evidence, `cmd-${label}.stderr.txt`, record.stderr);
  return record;
}

function buildConfig({ migrationsDir, mainAbs }) {
  return {
    $schema: path.join(projectRoot, "node_modules/wrangler/config-schema.json"),
    name: "exportflow",
    compatibility_date: "2026-10-11",
    compatibility_flags: ["nodejs_compat"],
    main: mainAbs,
    d1_databases: [
      {
        binding: "DB",
        database_name: DATABASE_NAME,
        database_id: "local-exportflow-not-a-remote-id",
        migrations_dir: migrationsDir,
      },
    ],
    vars: { APP_NAME: "ExportFlow", COMPANY_TIMEZONE: "Africa/Cairo" },
  };
}

function findD1DatabaseFiles(root) {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (
        entry.isFile() &&
        entry.name.endsWith(".sqlite") &&
        entry.name !== "metadata.sqlite" &&
        path.basename(dir) === "miniflare-D1DatabaseObject"
      ) {
        found.push(full);
      }
    }
  };
  if (existsSync(root)) walk(root);
  return found;
}

function quoteIdent(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

function encodeValue(value) {
  if (value === null || value === undefined) return "N";
  if (typeof value === "bigint") return `I:${value.toString()}`;
  if (typeof value === "number") return `I:${Number.isFinite(value) ? value : String(value)}`;
  if (typeof value === "string") return `T:${Buffer.byteLength(value, "utf8")}:${value}`;
  if (value instanceof Uint8Array) return `B:${Buffer.from(value).toString("hex")}`;
  return `X:${JSON.stringify(value)}`;
}

function tableColumns(db, table) {
  return db
    .prepare(`PRAGMA table_info(${quoteIdent(table)})`)
    .all()
    .sort((a, b) => Number(a.cid) - Number(b.cid))
    .map((row) => ({ name: row.name, type: row.type, notnull: Number(row.notnull), pk: Number(row.pk) }));
}

function hashCodeTable(db, table, columns) {
  const names = columns.map((c) => c.name);
  const select = names.map((n) => quoteIdent(n)).join(", ");
  const rows = db.prepare(`SELECT ${select} FROM ${quoteIdent(table)} ORDER BY rowid`).all();
  const hash = createHash("sha256");
  for (const row of rows) {
    hash.update(names.map((n) => `${n}=${encodeValue(row[n])}`).join("\u001f"));
    hash.update("\u001e");
  }
  return { rows: rows.length, sha256: hash.digest("hex") };
}

function snapshot(dbPath, legacyColumns) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const objects = db
      .prepare(
        "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all();
    const tables = {};
    for (const object of objects) {
      if (object.type !== "table") continue;
      const columns = tableColumns(db, object.name);
      const full = hashCodeTable(db, object.name, columns);
      const prior = legacyColumns?.[object.name];
      let legacy = null;
      if (prior) {
        const present = new Set(columns.map((c) => c.name));
        const missing = prior.filter((name) => !present.has(name));
        legacy = missing.length
          ? { missingColumns: missing }
          : hashCodeTable(db, object.name, prior.map((name) => ({ name })));
      }
      tables[object.name] = {
        columns: columns.map((c) => c.name),
        rowCount: full.rows,
        sha256All: full.sha256,
        sha256LegacyColumns: legacy ? legacy.sha256 : full.sha256,
        missingLegacyColumns: legacy?.missingColumns ?? [],
      };
    }
    const indexes = db
      .prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL ORDER BY name")
      .all();
    const fkCheck = db.prepare("PRAGMA foreign_key_check").all();
    const integrity = db.prepare("PRAGMA integrity_check").all();
    const applied = tables.d1_migrations
      ? db.prepare("SELECT name FROM d1_migrations ORDER BY id").all().map((r) => r.name)
      : [];
    return { tables, indexes, fkCheck, integrityCheck: integrity, appliedMigrations: applied };
  } finally {
    db.close();
  }
}

function diffSnapshots(before, after) {
  const result = {
    preserved: [],
    changed: [],
    addedTables: [],
    addedColumns: {},
    droppedTables: [],
    platformInternalTables: [],
    ok: true,
  };
  for (const [table, prior] of Object.entries(before.tables)) {
    if (table.startsWith("_cf_")) {
      result.platformInternalTables.push(table);
      continue;
    }
    const current = after.tables[table];
    if (table === "d1_migrations") {
      // Wrangler's own ledger must gain exactly the 0008 row; row content is
      // checked through appliedMigrations instead of a data hash.
      result.expectedChanges = result.expectedChanges ?? [];
      result.expectedChanges.push({
        table,
        before: prior.rowCount,
        after: current?.rowCount ?? 0,
        reason: "migration ledger records the newly applied migration",
      });
      continue;
    }
    if (!current) {
      result.droppedTables.push(table);
      result.ok = false;
      continue;
    }
    const added = current.columns.filter((c) => !prior.columns.includes(c));
    if (added.length) result.addedColumns[table] = added;
    if (prior.missingColumns?.length) {
      result.changed.push({ table, reason: "legacy column missing after upgrade", missing: prior.missingColumns });
      result.ok = false;
      continue;
    }
    if (prior.sha256LegacyColumns && current.sha256LegacyColumns === prior.sha256LegacyColumns) {
      result.preserved.push(table);
    } else {
      result.changed.push({
        table,
        reason: "legacy-column content hash differs",
        before: prior.sha256LegacyColumns,
        after: current.sha256LegacyColumns,
      });
      result.ok = false;
    }
  }
  for (const table of Object.keys(after.tables)) {
    if (!before.tables[table]) result.addedTables.push(table);
  }
  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const runRoot = assertIsolatedPersist(args.runRoot, { root: projectRoot });
  const evidence = args.evidence;
  ensureDir(evidence);
  ensureDir(path.join(runRoot, "home"));
  ensureDir(path.join(runRoot, "tmp"));

  const work = path.join(runRoot, `g1-${args.phase}`);
  const migrationsDir = path.join(work, "migrations");
  const stateDir = path.join(work, "state");
  ensureDir(migrationsDir);
  ensureDir(stateDir);
  if (findD1DatabaseFiles(stateDir).length > 0) throw new Error("STATE_NOT_FRESH");

  const configPath = path.join(work, "wrangler.g1.jsonc");
  const config = buildConfig({
    migrationsDir,
    mainAbs: path.join(projectRoot, "worker/index.ts"),
  });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  const steps = [];
  const record = (name, value) => {
    steps.push({ name, value });
    writeLog(evidence, `step-${String(steps.length).padStart(2, "0")}-${name}.json`, JSON.stringify(value, null, 2));
  };

  // 1. Materialise 0001..0007 inside the owned root.
  for (const file of MIGRATION_ORDER) {
    copyFileSync(path.join(sourceMigrations, file), path.join(migrationsDir, file));
  }
  const seedCopy = path.join(work, "seed-0007.sql");
  copyFileSync(fixtureSeed, seedCopy);
  record("migration-set-0007", { files: MIGRATION_ORDER, seed: path.basename(seedCopy) });

  // 2. Apply 0001..0007.
  const apply1 = runWrangler({
    runRoot,
    evidence,
    label: `${args.phase}-apply-0007`,
    args: ["d1", "migrations", "apply", DATABASE_NAME, "--local", "--persist-to", stateDir, "--config", configPath],
  });
  record("apply-0007", { status: apply1.status, stdout: apply1.stdout.slice(-4000), stderr: apply1.stderr.slice(-4000) });
  if (apply1.status !== 0) {
    console.log(JSON.stringify({ phase: args.phase, outcome: "FAIL", at: "apply-0007", steps }, null, 2));
    process.exit(1);
  }

  // 3. Seed synthetic rows.
  const seedRun = runWrangler({
    runRoot,
    evidence,
    label: `${args.phase}-seed`,
    args: [
      "d1",
      "execute",
      DATABASE_NAME,
      "--local",
      "--persist-to",
      stateDir,
      "--config",
      configPath,
      `--file=${seedCopy}`,
    ],
  });
  record("seed", { status: seedRun.status, stderr: seedRun.stderr.slice(-4000) });
  if (seedRun.status !== 0) {
    console.log(JSON.stringify({ phase: args.phase, outcome: "FAIL", at: "seed", steps }, null, 2));
    process.exit(1);
  }

  const sqliteFiles = findD1DatabaseFiles(stateDir);
  record("state-files", { sqlite: sqliteFiles.map((f) => path.relative(runRoot, f)) });
  if (sqliteFiles.length !== 1) {
    console.log(JSON.stringify({ phase: args.phase, outcome: "FAIL", at: "state-discovery", sqliteFiles }, null, 2));
    process.exit(1);
  }
  const dbPath = sqliteFiles[0];

  // Preserve an exact pre-upgrade copy (with WAL sidecars) so the "before"
  // side stays auditable: D1 keeps committed pages in -wal until checkpoint.
  const beforeCopy = path.join(work, "before-upgrade.sqlite");
  copyFileSync(dbPath, beforeCopy);
  for (const suffix of ["-wal", "-shm"]) {
    if (existsSync(`${dbPath}${suffix}`)) copyFileSync(`${dbPath}${suffix}`, `${beforeCopy}${suffix}`);
  }

  // 4. Snapshot before the upgrade.
  const before = snapshot(beforeCopy);
  record("snapshot-before", {
    tables: Object.keys(before.tables).length,
    appliedMigrations: before.appliedMigrations,
    fkCheck: before.fkCheck,
    integrity: before.integrityCheck,
    counts: Object.fromEntries(Object.entries(before.tables).map(([t, v]) => [t, v.rowCount])),
  });

  // 5. Failure-case precondition (hostile but legitimate schema shape).
  if (args.phase === "failure") {
    const hostile = runWrangler({
      runRoot,
      evidence,
      label: "failure-precondition",
      args: [
        "d1",
        "execute",
        DATABASE_NAME,
        "--local",
        "--persist-to",
        stateDir,
        "--config",
        configPath,
        "--command",
        "CREATE VIEW auth_compensation_incidents AS SELECT 'hostile' AS id",
      ],
    });
    record("failure-precondition", { status: hostile.status, stderr: hostile.stderr.slice(-2000) });
    if (hostile.status !== 0) {
      console.log(JSON.stringify({ phase: args.phase, outcome: "FAIL", at: "precondition", steps }, null, 2));
      process.exit(1);
    }
  }

  // 6. Add 0008 (unmodified copy) and apply.
  copyFileSync(path.join(sourceMigrations, MIGRATION_0008), path.join(migrationsDir, MIGRATION_0008));
  const apply2 = runWrangler({
    runRoot,
    evidence,
    label: `${args.phase}-apply-0008`,
    args: ["d1", "migrations", "apply", DATABASE_NAME, "--local", "--persist-to", stateDir, "--config", configPath],
  });
  record("apply-0008", { status: apply2.status, stdout: apply2.stdout.slice(-4000), stderr: apply2.stderr.slice(-4000) });

  // 7. Snapshot after and diff.
  const after = snapshot(dbPath, Object.fromEntries(Object.entries(before.tables).map(([t, v]) => [t, v.columns])));
  record("snapshot-after", {
    tables: Object.keys(after.tables).length,
    appliedMigrations: after.appliedMigrations,
    fkCheck: after.fkCheck,
    integrity: after.integrityCheck,
    counts: Object.fromEntries(Object.entries(after.tables).map(([t, v]) => [t, v.rowCount])),
  });
  const diff = diffSnapshots(before, after);
  record("diff", diff);

  // 8. Post-checks specific to 0008.
  const db = new DatabaseSync(dbPath, { readOnly: true });
  let postChecks;
  try {
    const cols = (table) => db.prepare(`PRAGMA table_info(${quoteIdent(table)})`).all().map((r) => r.name);
    const incidentCols = cols("auth_compensation_incidents");
    const idemCols = cols("idempotency_keys");
    const importCols = cols("customer_import_operations");
    const idx = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name IN ('auth_compensation_incidents_open_idx','idempotency_keys_witness_idx')")
      .all()
      .map((r) => r.name);
    postChecks = {
      incidentColumns: incidentCols,
      idempotencyHasNewColumns: ["response_expires_at", "outcome_class", "effect_ref"].every((c) => idemCols.includes(c)),
      importHasNewColumns: ["file_fingerprint", "parser_version"].every((c) => importCols.includes(c)),
      newIndexes: idx,
      incidentRowCount: db.prepare("SELECT COUNT(*) AS n FROM auth_compensation_incidents").get().n,
      duplicateInvoiceNumbers:
        db.prepare("SELECT COUNT(*) AS n FROM (SELECT invoice_number FROM export_invoices GROUP BY invoice_number HAVING COUNT(*) > 1)").get().n,
    };
  } finally {
    db.close();
  }
  record("post-checks", postChecks);

  const outcome =
    args.phase === "failure"
      ? apply2.status !== 0 && diff.ok
        ? "PASS"
        : "FAIL"
      : apply2.status === 0 && diff.ok && postChecks.idempotencyHasNewColumns && postChecks.importHasNewColumns
        ? "PASS"
        : "FAIL";

  const summary = {
    phase: args.phase,
    runRoot: path.relative(projectRoot, runRoot),
    database: path.relative(runRoot, dbPath),
    outcome,
    apply0007Status: apply1.status,
    apply0008Status: apply2.status,
    tablesBefore: Object.keys(before.tables).length,
    tablesAfter: Object.keys(after.tables).length,
    preservedTables: diff.preserved.length,
    changedTables: diff.changed,
    addedTables: diff.addedTables,
    addedColumns: diff.addedColumns,
    appliedMigrations: after.appliedMigrations,
    fkCheckViolations: after.fkCheck.length,
    integrity: after.integrityCheck,
    postChecks,
  };
  writeLog(evidence, `g1-summary-${args.phase}.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  process.exit(outcome === "PASS" ? 0 : 1);
}

main();
