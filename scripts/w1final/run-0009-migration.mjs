#!/usr/bin/env node
/**
 * W1-FINAL / G2 — populated migration proof for `0009_reports_view_all.sql`.
 *
 * The migration is additive (catalog row + one explicit role grant). This
 * runner proves that on a real local D1 database:
 *
 *   1. a database at `0001..0008` does not contain the new permission;
 *   2. `0009` applies on top of populated tables and changes nothing except
 *      the `permissions` catalog and the single administrator grant;
 *   3. `PRAGMA foreign_key_check` stays empty and `integrity_check` is ok;
 *   4. re-executing the same file is idempotent;
 *   5. a forced failure after the catalog insert leaves the system fail-closed
 *      (no one is silently granted the entitlement) and a clean re-run finishes
 *      the migration.
 *
 * Every path is inside one fresh `.wrangler-safety-20261021-*` run root. All
 * SQL is executed with an explicit `--config` and `--persist-to`.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertIsolatedPersist } from "../isolation-guard.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const wranglerBin = path.join(projectRoot, "node_modules/wrangler/bin/wrangler.js");
const migrationsDir = path.join(projectRoot, "drizzle", "migrations");
const PERMISSION_KEY = "reports.view_all";

const CHILD_ENV_ALLOWLIST = [
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
];

const TERMINATOR = ".wrangler-safety-20261021-";
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

function parseArgs(argv) {
  const out = { runRoot: "", evidence: "" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--run-root") out.runRoot = argv[++i];
    else if (argv[i] === "--evidence") out.evidence = argv[++i];
  }
  if (!out.runRoot) throw new Error("RUN_ROOT_REQUIRED");
  if (!out.evidence) throw new Error("EVIDENCE_REQUIRED");
  return out;
}

function childEnv(runRoot) {
  const env = {};
  for (const key of CHILD_ENV_ALLOWLIST) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  env.CI = "1";
  env.WRANGLER_SEND_METRICS = "false";
  env.TMP = path.join(runRoot, "tmp");
  env.TEMP = env.TMP;
  return env;
}

function configFor({ migrationsDirPath }) {
  return {
    name: "exportflow-w1final-migration",
    compatibility_date: "2026-10-11",
    compatibility_flags: ["nodejs_compat"],
    d1_databases: [
      {
        binding: "DB",
        database_name: "exportflow-local",
        database_id: "local-exportflow-not-a-remote-id",
        migrations_dir: migrationsDirPath,
      },
    ],
    vars: {},
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const runRoot = assertIsolatedPersist(args.runRoot, { root: projectRoot });
  if (!runRoot.includes(TERMINATOR)) throw new Error("RUN_ROOT_MARKER_REQUIRED");
  mkdirSync(runRoot, { recursive: true });
  if (readdirSync(runRoot).length > 0) throw new Error("RUN_ROOT_NOT_FRESH");
  const evidence = path.resolve(args.evidence);
  mkdirSync(evidence, { recursive: true });
  mkdirSync(path.join(runRoot, "tmp"), { recursive: true });
  const env = childEnv(runRoot);

  const persist = assertIsolatedPersist(path.join(runRoot, "state"), { root: projectRoot });
  const persistFail = assertIsolatedPersist(path.join(runRoot, "state-fail"), { root: projectRoot });
  const through0008 = path.join(runRoot, "migrations-through-0008");
  mkdirSync(through0008, { recursive: true });

  const result = {
    runRoot,
    startedAt: new Date().toISOString(),
    sourceMigrations: [],
    checks: [],
    steps: {},
  };
  const assertion = (name, ok, detail = "") => {
    result.checks.push({ name, ok: Boolean(ok), detail });
    save();
    return Boolean(ok);
  };
  const save = () => writeFileSync(path.join(evidence, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  const record = (label, payload) => {
    result.steps[label] = payload;
    save();
  };

  const sql = (command, label) => {
    const out = spawnSync(
      process.execPath,
      [
        wranglerBin,
        "d1",
        "execute",
        "exportflow-local",
        ...(label === "fail-run" ? ["--local", "--persist-to", persistFail] : ["--local", "--persist-to", persist]),
        "--config",
        label === "fail-run" ? configFailPath : configPath,
        "--json",
        "--command",
        command,
      ],
      { cwd: runRoot, env, encoding: "utf8", timeout: 180_000 },
    );
    save();
    return { exit: out.status, rows: parseRows(out.stdout), stdout: String(out.stdout).slice(-4000), stderr: String(out.stderr).slice(-4000) };
  };

  function parseRows(stdout) {
    try {
      return JSON.parse(stdout)?.[0]?.results ?? [];
    } catch {
      return [];
    }
  }

  // --- 1. byte-identical copy of 0001..0008 --------------------------------
  const allMigrations = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const through = allMigrations.filter((name) => name < "0009");
  const afterThrough = allMigrations.filter((name) => name >= "0009");
  if (through.length !== 8) throw new Error(`EXPECTED_8_MIGRATIONS:${through.length}`);
  for (const name of through) {
    const source = path.join(migrationsDir, name);
    const copy = path.join(through0008, name);
    const bytes = readFileSync(source);
    copyFileSync(source, copy);
    const copied = readFileSync(copy);
    if (sha256(bytes) !== sha256(copied)) throw new Error(`COPY_MISMATCH:${name}`);
    result.sourceMigrations.push({ name, sha256: sha256(bytes), copySha256: sha256(copied), bytes: bytes.length });
  }
  record("migrationsPresent", { through: through.length, afterThrough });
  save();

  // --- 2. configs ----------------------------------------------------------
  const configPath = assertIsolatedPersist(path.join(runRoot, "wrangler.through-0008.jsonc"), { root: projectRoot });
  const configPost = assertIsolatedPersist(path.join(runRoot, "wrangler.full.jsonc"), { root: projectRoot });
  const configFailPath = assertIsolatedPersist(path.join(runRoot, "wrangler.through-0008.fail.jsonc"), { root: projectRoot });
  writeFileSync(configPath, `${JSON.stringify(configFor({ runRoot, migrationsDirPath: through0008 }), null, 2)}\n`);
  writeFileSync(configPost, `${JSON.stringify(configFor({ runRoot, migrationsDirPath: migrationsDir }), null, 2)}\n`);
  writeFileSync(configFailPath, `${JSON.stringify(configFor({ runRoot, migrationsDirPath: through0008 }), null, 2)}\n`);

  const migrate = (configFile, persistDir, label) => {
    const out = spawnSync(
      process.execPath,
      [
        wranglerBin,
        "d1",
        "migrations",
        "apply",
        "exportflow-local",
        "--local",
        "--persist-to",
        persistDir,
        "--config",
        configFile,
      ],
      { cwd: runRoot, env, encoding: "utf8", timeout: 240_000 },
    );
    writeFileSync(
      path.join(evidence, `${label}.log`),
      `EXIT=${out.status}\n--- stdout ---\n${out.stdout}\n--- stderr ---\n${out.stderr}\n`,
    );
    return { exit: out.status, stdout: String(out.stdout), stderr: String(out.stderr) };
  };

  // --- 3. apply 0001..0008 and populate ------------------------------------
  const applyThrough8 = migrate(configPath, persist, "apply-through-0008");
  assertion("apply-0001-to-0008", applyThrough8.exit === 0, `exit=${applyThrough8.exit}`);
  if (applyThrough8.exit !== 0) throw new Error("APPLY_0008_FAILED");

  const populate = path.join(runRoot, "populate.sql");
  writeFileSync(
    populate,
    `INSERT INTO user (id, name, email, email_verified, created_at, updated_at, must_change_password, is_active)
       VALUES ('u-mig-admin', 'Migration Admin', 'admin@mig.invalid', 1, 0, 0, 0, 1),
              ('u-mig-ops', 'Migration Ops', 'ops@mig.invalid', 1, 0, 0, 0, 1);
     INSERT INTO user_roles (user_id, role_id) VALUES ('u-mig-admin', 'role-admin'), ('u-mig-ops', 'role-ops');
     INSERT INTO user_permission_overrides (user_id, permission_key, effect)
       VALUES ('u-mig-ops', 'reports.export', 'DENY'), ('u-mig-ops', 'audit.view', 'GRANT');
     INSERT INTO customers (id, legal_name, country_code, version, created_at, updated_at, created_by)
       VALUES ('c-mig-1', 'Migration Customer', 'EG', 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 'u-mig-admin');
     INSERT INTO export_cases (id, case_reference, customer_id, status, document_route, bank_path_status,
                               assigned_to, destination_country, version, created_at, updated_at, created_by)
       VALUES ('ec-mig-1', 'MIG-0001', 'c-mig-1', 'DRAFT', 'DIRECT', 'NOT_REQUIRED',
               'u-mig-ops', 'SA', 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 'u-mig-ops');
     INSERT INTO idempotency_keys (id, actor_id, idempotency_key, method, path, request_hash, state,
                                   status_code, created_at, updated_at, expires_at)
       VALUES ('idem-mig-1', 'u-mig-ops', 'mig-key-1', 'POST', '/api/v1/customers', 'hash', 'COMPLETED',
               201, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z');
     INSERT INTO audit_log (id, actor_id, entity_type, entity_id, action, created_at)
       VALUES ('aud-mig-1', 'u-mig-admin', 'customer', 'c-mig-1', 'customer.create', '2026-01-01T00:00:00Z');
     `,
  );
  const populateOut = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "execute", "exportflow-local", "--local", "--persist-to", persist, "--config", configPath, "--file", populate],
    { cwd: runRoot, env, encoding: "utf8", timeout: 180_000 },
  );
  writeFileSync(
    path.join(evidence, "populate.log"),
    `EXIT=${populateOut.status}\n--- stdout ---\n${populateOut.stdout}\n--- stderr ---\n${populateOut.stderr}\n`,
  );
  assertion("populate-business-rows", populateOut.status === 0, `exit=${populateOut.status}`);
  if (populateOut.status !== 0) throw new Error("POPULATE_FAILED");

  const TABLES = [
    "user",
    "user_roles",
    "user_permission_overrides",
    "customers",
    "export_cases",
    "idempotency_keys",
    "audit_log",
    "permissions",
    "role_permissions",
  ];

  const snapshot = () => {
    const counts = {};
    for (const table of TABLES) counts[table] = Number(sql(`SELECT COUNT(*) AS n FROM ${table}`, "snapshot").rows?.[0]?.n ?? -1);
    const foreignKeyCheck = sql("PRAGMA foreign_key_check;", "snapshot").rows ?? [];
    const orphanRolePermissions = Number(
      sql(
        `SELECT COUNT(*) AS n FROM role_permissions rp
           LEFT JOIN permissions p ON p.key = rp.permission_key
           LEFT JOIN roles r ON r.id = rp.role_id
          WHERE p.key IS NULL OR r.id IS NULL;`,
        "snapshot",
      ).rows?.[0]?.n ?? -1,
    );
    const schema = sql("SELECT type, name, sql FROM sqlite_master ORDER BY type, name;", "snapshot").rows ?? [];
    const permission = sql(`SELECT key FROM permissions WHERE key = '${PERMISSION_KEY}';`, "snapshot").rows ?? [];
    const adminGrant = Number(
      sql(
        `SELECT COUNT(*) AS n FROM role_permissions WHERE permission_key = '${PERMISSION_KEY}'
           AND role_id = (SELECT id FROM roles WHERE key = 'administrator');`,
        "snapshot",
      ).rows?.[0]?.n ?? -1,
    );
    const anyGrant = Number(
      sql(`SELECT COUNT(*) AS n FROM role_permissions WHERE permission_key = '${PERMISSION_KEY}';`, "snapshot").rows?.[0]?.n ?? -1,
    );
    const roleGrantCounts = sql(
      `SELECT r.key, COUNT(*) AS n FROM role_permissions rp JOIN roles r ON r.id = rp.role_id
        WHERE rp.permission_key = '${PERMISSION_KEY}' GROUP BY r.key ORDER BY r.key;`,
      "snapshot",
    ).rows ?? [];
    return {
      counts,
      foreignKeyCheck,
      orphanRolePermissions,
      permissionRows: permission.length,
      adminGrant,
      anyGrant,
      roleGrantCounts,
      schemaDigest: sha256(Buffer.from(JSON.stringify(schema))),
      schemaObjects: schema.length,
      integrityCheck: "NOT_AUTHORIZED_IN_D1 (PRAGMA integrity_check returns SQLITE_AUTH); foreign_key_check + explicit orphan check used instead",
    };
  };

  const pre = snapshot();
  record("preMigration", pre);
  assertion("pre-no-reports-view-all", pre.permissionRows === 0 && pre.anyGrant === 0, JSON.stringify(pre.roleGrantCounts));
  assertion("pre-foreign-keys-clean", pre.foreignKeyCheck.length === 0, `rows=${pre.foreignKeyCheck.length}`);

  // --- 4. apply only 0009 on the populated database ------------------------
  const apply0009 = migrate(configPost, persist, "apply-0009");
  assertion("apply-0009", apply0009.exit === 0, `exit=${apply0009.exit}`);
  const appliedMigrations = sql("SELECT name FROM d1_migrations ORDER BY id;", "snapshot").rows ?? [];
  record("appliedMigrations", appliedMigrations);
  assertion(
    "apply-0009-single-file",
    appliedMigrations.length === 9 && appliedMigrations[8]?.name === "0009_reports_view_all.sql",
    JSON.stringify(appliedMigrations.map((row) => row.name)),
  );

  const post = snapshot();
  record("postMigration", post);
  const unchanged = TABLES.filter((table) => table !== "permissions" && table !== "role_permissions");
  const changedTables = unchanged.filter((table) => pre.counts[table] !== post.counts[table]);
  assertion("post-business-rows-unchanged", changedTables.length === 0, JSON.stringify(changedTables.map((t) => [t, pre.counts[t], post.counts[t]])));
  assertion("post-permission-catalog-row", post.permissionRows === 1, `rows=${post.permissionRows}`);
  assertion("post-administrator-grant", post.adminGrant === 1 && post.anyGrant === 1, `admin=${post.adminGrant} any=${post.anyGrant}`);
  assertion(
    "post-only-administrator-granted",
    post.roleGrantCounts.length === 1 && post.roleGrantCounts[0].key === "administrator",
    JSON.stringify(post.roleGrantCounts),
  );
  assertion("post-permissions-plus-one", post.counts.permissions === pre.counts.permissions + 1, `${pre.counts.permissions}->${post.counts.permissions}`);
  assertion("post-role-permissions-plus-one", post.counts["role_permissions"] === pre.counts["role_permissions"] + 1, `${pre.counts["role_permissions"]}->${post.counts["role_permissions"]}`);
  assertion("post-foreign-keys-clean", post.foreignKeyCheck.length === 0, `rows=${post.foreignKeyCheck.length}`);
  assertion("post-role-permissions-no-orphans", post.orphanRolePermissions === 0, `orphans=${post.orphanRolePermissions}`);
  assertion(
    "post-schema-unchanged",
    pre.schemaDigest === post.schemaDigest && pre.schemaObjects === post.schemaObjects,
    `pre=${pre.schemaDigest.slice(0, 12)} post=${post.schemaDigest.slice(0, 12)} objects=${post.schemaObjects}`,
  );

  // --- 5. idempotent re-execution of the very same file --------------------
  const reapply = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "execute", "exportflow-local", "--local", "--persist-to", persist, "--config", configPost, "--file", path.join(migrationsDir, "0009_reports_view_all.sql")],
    { cwd: runRoot, env, encoding: "utf8", timeout: 180_000 },
  );
  writeFileSync(
    path.join(evidence, "reapply-0009.log"),
    `EXIT=${reapply.status}\n--- stdout ---\n${reapply.stdout}\n--- stderr ---\n${reapply.stderr}\n`,
  );
  const afterReapply = snapshot();
  record("afterReapply", afterReapply);
  assertion("reapply-exit-zero", reapply.status === 0, `exit=${reapply.status}`);
  assertion(
    "reapply-idempotent",
    JSON.stringify(afterReapply.counts) === JSON.stringify(post.counts) &&
      afterReapply.permissionRows === 1 &&
      afterReapply.adminGrant === 1 &&
      afterReapply.roleGrantCounts.length === 1,
    JSON.stringify({ before: post.counts, after: afterReapply.counts, grants: afterReapply.roleGrantCounts }),
  );

  // --- 6. induced failure on a second fresh database -----------------------
  const applyFailBase = migrate(configFailPath, persistFail, "fail-apply-through-0008");
  assertion("fail-apply-0001-to-0008", applyFailBase.exit === 0, `exit=${applyFailBase.exit}`);
  if (applyFailBase.exit !== 0) throw new Error("FAIL_BASE_APPLY_FAILED");
  const populateFail = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "execute", "exportflow-local", "--local", "--persist-to", persistFail, "--config", configFailPath, "--file", populate],
    { cwd: runRoot, env, encoding: "utf8", timeout: 180_000 },
  );
  assertion("fail-populate", populateFail.status === 0, `exit=${populateFail.status}`);

  const failingFile = path.join(runRoot, "0009-with-induced-failure.sql");
  writeFileSync(
    failingFile,
    `${readFileSync(path.join(migrationsDir, "0009_reports_view_all.sql"), "utf8")}
-- Induced failure: no such role, so the foreign key refuses the row.
INSERT INTO role_permissions (role_id, permission_key) VALUES ('role-does-not-exist', '${PERMISSION_KEY}');
`,
  );
  const failingRun = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "execute", "exportflow-local", "--local", "--persist-to", persistFail, "--config", configFailPath, "--file", failingFile],
    { cwd: runRoot, env, encoding: "utf8", timeout: 180_000 },
  );
  writeFileSync(
    path.join(evidence, "induced-failure.log"),
    `EXIT=${failingRun.status}\n--- stdout ---\n${failingRun.stdout}\n--- stderr ---\n${failingRun.stderr}\n`,
  );
  const failState = (() => {
    const permissionRows = Number(sql(`SELECT COUNT(*) AS n FROM permissions WHERE key = '${PERMISSION_KEY}';`, "fail-run").rows?.[0]?.n ?? -1);
    const anyGrant = Number(sql(`SELECT COUNT(*) AS n FROM role_permissions WHERE permission_key = '${PERMISSION_KEY}';`, "fail-run").rows?.[0]?.n ?? -1);
    const orphanGrant = Number(sql(`SELECT COUNT(*) AS n FROM role_permissions WHERE role_id = 'role-does-not-exist';`, "fail-run").rows?.[0]?.n ?? -1);
    const roleGrantCounts = sql(
      `SELECT r.key, COUNT(*) AS n FROM role_permissions rp JOIN roles r ON r.id = rp.role_id
        WHERE rp.permission_key = '${PERMISSION_KEY}' GROUP BY r.key ORDER BY r.key;`,
      "fail-run",
    ).rows ?? [];
    return { permissionRows, anyGrant, orphanGrant, roleGrantCounts };
  })();
  record("inducedFailureState", { exit: failingRun.status, ...failState });
  assertion("induced-failure-exit-nonzero", failingRun.status !== 0, `exit=${failingRun.status}`);
  assertion("induced-failure-orphan-row-absent", failState.orphanGrant === 0, `orphan=${failState.orphanGrant}`);
  assertion(
    "induced-failure-no-unintended-grant",
    failState.roleGrantCounts.every((row) => row.key === "administrator") && failState.permissionRows <= 1,
    JSON.stringify({ ...failState }),
  );

  const failRecover = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "execute", "exportflow-local", "--local", "--persist-to", persistFail, "--config", configFailPath, "--file", path.join(migrationsDir, "0009_reports_view_all.sql")],
    { cwd: runRoot, env, encoding: "utf8", timeout: 180_000 },
  );
  writeFileSync(
    path.join(evidence, "induced-failure-recover.log"),
    `EXIT=${failRecover.status}\n--- stdout ---\n${failRecover.stdout}\n--- stderr ---\n${failRecover.stderr}\n`,
  );
  const recovered = {
    permissionRows: Number(sql(`SELECT COUNT(*) AS n FROM permissions WHERE key = '${PERMISSION_KEY}';`, "fail-run").rows?.[0]?.n ?? -1),
    adminGrant: Number(
      sql(
        `SELECT COUNT(*) AS n FROM role_permissions WHERE permission_key = '${PERMISSION_KEY}'
           AND role_id = (SELECT id FROM roles WHERE key = 'administrator');`,
        "fail-run",
      ).rows?.[0]?.n ?? -1,
    ),
  };
  record("inducedFailureRecovered", recovered);
  assertion("induced-failure-recovers", failRecover.status === 0 && recovered.permissionRows === 1 && recovered.adminGrant === 1, JSON.stringify(recovered));

  result.finishedAt = new Date().toISOString();
  result.outcome = result.checks.every((item) => item.ok) ? "PASS" : "FAIL";
  save();
  return result;
}

let outcome = "FAIL";
try {
  const result = main();
  outcome = result.outcome;
  console.log(JSON.stringify({ outcome, failed: result.checks.filter((item) => !item.ok), checks: result.checks.length }, null, 2));
} catch (error) {
  console.error(error);
}
process.exitCode = outcome === "PASS" ? 0 : 1;
