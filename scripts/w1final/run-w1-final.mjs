#!/usr/bin/env node
/**
 * W1-FINAL — real-path harness (G1 last-root-admin, G2 report ACL, G3 document races).
 *
 * Every invocation owns:
 *   - one fresh `.wrangler-safety-20261021-*` run root (never a protected root),
 *   - one free loopback port,
 *   - one generated Worker config and synthetic `.dev.vars` inside that root,
 *   - one local D1 store (`<runRoot>/state`), migrated with `--config` only,
 *   - one evidence directory; every HTTP call is appended and persisted.
 *
 * The Worker entry is `tests/w1/w1-final-worker.ts`: the real Hono app with
 * delay-only fault injection selected by Worker vars in the generated config.
 * No production endpoint, header, cookie or body can enable a delay.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertIsolatedPersist } from "../isolation-guard.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const wranglerBin = path.join(projectRoot, "node_modules/wrangler/bin/wrangler.js");
const HARNESS_ENTRY = path.resolve(projectRoot, "tests", "w1", "w1-final-worker.ts");

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

const MODES = new Set(["g1", "g2", "g3", "g1proof"]);
const SCENARIOS = new Set([
  "full",
  "race",
  "negative",
  "cross",
  "ghost",
  "grantonly",
  "truth",
  "atomic",
  "stale-roles",
  "stale-overrides",
  "stale-active",
  "stale-roleperm",
  "stale-create-user",
  "stale-create-role",
]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const out = { mode: "", scenario: "full", runRoot: "", evidence: "", port: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--mode") out.mode = argv[++i];
    else if (key === "--run-root") out.runRoot = argv[++i];
    else if (key === "--evidence") out.evidence = argv[++i];
    else if (key === "--port") out.port = argv[++i];
    else if (key === "--scenario") out.scenario = argv[++i];
  }
  if (!MODES.has(out.mode)) throw new Error("MODE_INVALID");
  if (!SCENARIOS.has(out.scenario)) throw new Error("SCENARIO_INVALID");
  if (!out.runRoot) throw new Error("RUN_ROOT_REQUIRED");
  if (!out.evidence) throw new Error("EVIDENCE_REQUIRED");
  if (!/^\d+$/.test(out.port)) throw new Error("PORT_REQUIRED");
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

function generatedConfig({ mode, scenario, port, base, probeToken }) {
  void port;
  void base;
  const staleDelay = "1400";
  const delayBind =
    scenario === "stale-roles" || scenario === "stale-overrides"
      ? "w1-proof-d"
      : scenario === "stale-active"
        ? "w1-proof-e"
        : scenario === "stale-roleperm"
          ? "role-viewer"
          : scenario === "stale-create-user"
            ? "export_officer"
            : "";
  return {
    name: "exportflow-w1final",
    compatibility_date: "2026-10-11",
    compatibility_flags: ["nodejs_compat"],
    main: HARNESS_ENTRY,
    d1_databases: [
      {
        binding: "DB",
        database_name: "exportflow-local",
        database_id: "local-exportflow-not-a-remote-id",
        migrations_dir: path.resolve(projectRoot, "drizzle", "migrations"),
      },
    ],
    r2_buckets: [{ binding: "DOCUMENTS", bucket_name: "exportflow-documents-local" }],
    vars: {
      APP_NAME: "ExportFlow",
      COMPANY_TIMEZONE: "Africa/Cairo",
      INCOTERMS_EDITION_DEFAULT: "Incoterms 2020",
      MAX_UPLOAD_BYTES: "419430400",
      UPLOAD_PART_SIZE_BYTES: "10485760",
      W1_MODE: mode,
      W1_PROBE_TOKEN: probeToken,
      W1_DELAY_BIND: delayBind,
      W1_ACTIVE_DELAY_MS: mode === "g1" ? "250" : "0",
      W1_REVIEW_READ_DELAY_MS: mode === "g3" ? "600" : "0",
      W1_ROLE_READ_DELAY_MS: scenario === "stale-roles" ? staleDelay : "0",
      W1_OVERRIDE_READ_DELAY_MS: scenario === "stale-overrides" ? staleDelay : "0",
      W1_ACTIVE_READ_DELAY_MS: scenario === "stale-active" ? staleDelay : "0",
      W1_ROLEPERM_READ_DELAY_MS: scenario === "stale-roleperm" ? staleDelay : "0",
      W1_ROLE_LOOKUP_DELAY_MS: scenario === "stale-create-user" ? staleDelay : "0",
      W1_ROLE_INSERT_DELAY_MS: scenario === "stale-create-role" ? staleDelay : "0",
      TRUST_CF_CONNECTING_IP: "1",
    },
  };
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const EFFECTIVE_ROOT_CONDITION = (alias) => `
  EXISTS (SELECT 1 FROM (
    SELECT rp.permission_key AS k FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id WHERE ur.user_id = ${alias}.id
    UNION
    SELECT permission_key AS k FROM user_permission_overrides WHERE user_id = ${alias}.id AND effect = 'GRANT'
  ) g WHERE g.k = 'users.manage')
  AND EXISTS (SELECT 1 FROM (
    SELECT rp.permission_key AS k FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id WHERE ur.user_id = ${alias}.id
    UNION
    SELECT permission_key AS k FROM user_permission_overrides WHERE user_id = ${alias}.id AND effect = 'GRANT'
  ) g WHERE g.k = 'roles.manage')
  AND NOT EXISTS (SELECT 1 FROM user_permission_overrides WHERE user_id = ${alias}.id AND effect = 'DENY' AND permission_key = 'users.manage')
  AND NOT EXISTS (SELECT 1 FROM user_permission_overrides WHERE user_id = ${alias}.id AND effect = 'DENY' AND permission_key = 'roles.manage')`;

function rootCountSql(alias = "u") {
  return `SELECT COUNT(*) AS n FROM user ${alias} WHERE ${alias}.is_active = 1 AND ${EFFECTIVE_ROOT_CONDITION(alias)}`;
}

const ROLE_ROOT_COUNT_SQL = `SELECT COUNT(*) AS n FROM user u WHERE u.is_active = 1
  AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id WHERE ur.user_id = u.id AND rp.permission_key = 'users.manage')
  AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id WHERE ur.user_id = u.id AND rp.permission_key = 'roles.manage')`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const port = Number(args.port);
  const base = `http://127.0.0.1:${port}`;

  const runRoot = assertIsolatedPersist(args.runRoot, { root: projectRoot });
  mkdirSync(runRoot, { recursive: true });
  if (readdirSync(runRoot).length > 0) throw new Error("RUN_ROOT_NOT_FRESH");
  const persist = assertIsolatedPersist(path.join(runRoot, "state"), { root: projectRoot });
  const evidence = path.resolve(args.evidence);
  mkdirSync(evidence, { recursive: true });
  mkdirSync(path.join(runRoot, "tmp"), { recursive: true });

  const configPath = assertIsolatedPersist(path.join(runRoot, "wrangler.w1final.generated.jsonc"), { root: projectRoot });
  const devVarsPath = assertIsolatedPersist(path.join(runRoot, ".dev.vars"), { root: projectRoot });
  const probeToken = randomBytes(24).toString("base64url");
  const config = generatedConfig({ mode: args.mode, scenario: args.scenario, port, base, probeToken });
  if (path.resolve(config.main) !== HARNESS_ENTRY) throw new Error("HARNESS_ENTRY_MISMATCH");
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  const authSecret = randomBytes(32).toString("base64url");
  const bootstrapSecret = randomBytes(24).toString("base64url");
  writeFileSync(devVarsPath, `BETTER_AUTH_SECRET=${authSecret}\nBETTER_AUTH_URL=${base}\nBOOTSTRAP_SECRET=${bootstrapSecret}\n`);

  const runTag = randomBytes(4).toString("hex");
  const admin = {
    email: `w1f.admin.${runTag}@example.invalid`,
    password: `W1f-Admin-${randomBytes(9).toString("base64url")}`,
    nextPassword: `W1f-Admin2-${randomBytes(9).toString("base64url")}`,
  };
  writeFileSync(
    path.join(runRoot, "run.json"),
    JSON.stringify({ mode: args.mode, runRoot, persist, port, configPath, createdAt: new Date().toISOString() }, null, 2),
  );
  writeFileSync(
    path.join(evidence, "command.txt"),
    `node scripts/w1final/run-w1-final.mjs --mode ${args.mode} --scenario ${args.scenario} --run-root ${runRoot} --evidence ${evidence} --port ${port}\n`,
  );

  const result = {
    mode: args.mode,
    scenario: args.scenario,
    runRoot,
    persist,
    port,
    startedAt: new Date().toISOString(),
    negativeProof: {
      productionEntry: "worker/index.ts",
      productionEntryBareCreateApp: readFileSync(path.join(projectRoot, "worker", "index.ts"), "utf8").includes("const app = createApp();"),
      productionConfigMain: JSON.parse(readFileSync(path.join(projectRoot, "wrangler.jsonc"), "utf8")).main,
      harnessEntry: "tests/w1/w1-final-worker.ts",
      faultSource: "Worker vars in run-owned generated config (delays only)",
      clientCanSelectFault: false,
    },
    migrate: null,
    startup: null,
    http: [],
    attempts: [],
    checks: [],
    db: null,
    cleanup: null,
    outcome: "FAIL",
  };
  const assertion = (name, ok, detail = "") => {
    result.checks.push({ name, ok: Boolean(ok), detail });
    save();
    return Boolean(ok);
  };
  const save = () => writeFileSync(path.join(evidence, "result.json"), `${JSON.stringify(result, null, 2)}\n`);

  const env = childEnv(runRoot);
  save();

  // --- migrations (generated config + explicit local persist) ---------------
  const migrate = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "migrations", "apply", "exportflow-local", "--local", "--persist-to", persist, "--config", configPath],
    { cwd: runRoot, env, encoding: "utf8", timeout: 240_000 },
  );
  writeFileSync(
    path.join(evidence, "migrate.log"),
    `EXIT=${migrate.status}\n--- stdout ---\n${migrate.stdout}\n--- stderr ---\n${migrate.stderr}\n`,
  );
  result.migrate = { exit: migrate.status };
  if (migrate.status !== 0) {
    save();
    throw new Error(`MIGRATE_FAILED:${migrate.status}`);
  }

  const sql = (command) => {
    const out = spawnSync(
      process.execPath,
      [wranglerBin, "d1", "execute", "exportflow-local", "--local", "--persist-to", persist, "--config", configPath, "--json", "--command", command],
      { cwd: runRoot, env, encoding: "utf8", timeout: 180_000 },
    );
    if (out.status !== 0) return { rows: [], exit: out.status, stderr: String(out.stderr).slice(-2000) };
    try {
      return { rows: JSON.parse(out.stdout)?.[0]?.results ?? [], exit: 0 };
    } catch {
      return { rows: [], exit: 0, parseError: String(out.stdout).slice(0, 500) };
    }
  };
  const sqlFile = (filePath, label) => {
    const out = spawnSync(
      process.execPath,
      [wranglerBin, "d1", "execute", "exportflow-local", "--local", "--persist-to", persist, "--config", configPath, "--file", filePath],
      { cwd: runRoot, env, encoding: "utf8", timeout: 180_000 },
    );
    writeFileSync(path.join(evidence, `${label}.log`), `EXIT=${out.status}\n--- stdout ---\n${out.stdout}\n--- stderr ---\n${out.stderr}\n`);
    return { exit: out.status, stdout: String(out.stdout), stderr: String(out.stderr) };
  };
  const count = (condition) => {
    const row = sql(condition);
    return row.exit === 0 ? Number(row.rows?.[0]?.n ?? -1) : -1;
  };

  // --- real workerd server --------------------------------------------------
  const server = spawn(
    process.execPath,
    [
      wranglerBin,
      "dev",
      "--config",
      configPath,
      "--cwd",
      runRoot,
      "--persist-to",
      persist,
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--local",
      "--show-interactive-dev-session=false",
      "--log-level=info",
    ],
    { cwd: runRoot, env, stdio: ["ignore", "pipe", "pipe"] },
  );
  const stdout = [];
  const stderr = [];
  server.stdout.on("data", (chunk) => stdout.push(String(chunk)));
  server.stderr.on("data", (chunk) => stderr.push(String(chunk)));

  // Synthetic client IPs: Better Auth applies a per-IP sign-in rate limit
  // (30/60s). The run-owned config sets TRUST_CF_CONNECTING_IP=1 so the real
  // auth stack can resolve a client address instead of falling back to one
  // shared bucket. Every harness session gets its own reserved documentation
  // address; no real network address is used and no rate limit is disabled.
  let nextClientIp = 1;
  const allocateClientIp = () => {
    const octet = nextClientIp;
    nextClientIp += 1;
    return `10.20.${Math.floor(octet / 250) % 250}.${(octet % 250) + 1}`;
  };
  const newSession = (label) => ({ label, cookies: {}, clientIp: allocateClientIp() });
  const cookieHeader = (session) =>
    Object.entries(session.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  const mergeCookies = (session, rawCookies) => {
    for (const raw of rawCookies) {
      const pair = raw.split(";")[0];
      const index = pair.indexOf("=");
      if (index > 0) session.cookies[pair.slice(0, index).trim()] = pair.slice(index + 1).trim();
    }
  };

  const call = async (session, label, method, url, { body, headers = {}, timeout = 60_000 } = {}) => {
    const requestHeaders = { origin: base, ...headers };
    if (session?.clientIp) requestHeaders["cf-connecting-ip"] = session.clientIp;
    const payload = body === undefined ? undefined : JSON.stringify(body);
    if (payload !== undefined) {
      requestHeaders["content-type"] = "application/json";
      requestHeaders["content-length"] = Buffer.byteLength(payload);
    }
    if (session) {
      const cookie = cookieHeader(session);
      if (cookie) requestHeaders.cookie = cookie;
    }
    const started = Date.now();
    let response = null;
    let text = "";
    let error = null;
    try {
      // A fresh TCP connection per request (`agent: false`) keeps this harness
      // free of pooled-socket artefacts after a workerd restart. It is not a
      // retry: exactly one request is sent, and a transport failure is
      // recorded as such rather than retried behind the evidence.
      response = await new Promise((resolve, reject) => {
        const target = new URL(`${base}${url}`);
        const request = http.request(
          {
            hostname: target.hostname,
            port: target.port,
            path: `${target.pathname}${target.search}`,
            method,
            headers: requestHeaders,
            agent: false,
          },
          (incoming) => {
            const chunks = [];
            incoming.on("data", (chunk) => chunks.push(chunk));
            incoming.on("end", () =>
              resolve({
                status: incoming.statusCode ?? 0,
                headers: incoming.headers,
                setCookie: incoming.headers["set-cookie"] ?? [],
                text: Buffer.concat(chunks).toString("utf8"),
              }),
            );
          },
        );
        request.setTimeout(timeout, () => request.destroy(new Error("HARNESS_TIMEOUT")));
        request.on("error", reject);
        if (payload !== undefined) request.write(payload);
        request.end();
      });
      text = response.text;
      if (session) mergeCookies(session, response.setCookie);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }
    const ended = Date.now();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const entry = {
      label,
      session: session?.label ?? null,
      clientIp: session?.clientIp ?? null,
      method,
      path: url,
      status: response?.status ?? 0,
      requestId: response?.headers?.["x-request-id"] ?? null,
      sentAt: started,
      endedAt: ended,
      elapsedMs: ended - started,
      bodySha256: sha256(text),
      bodyBytes: Buffer.byteLength(text),
      body: text.slice(0, 2500),
      error,
    };
    result.http.push(entry);
    save();
    return { ...entry, json, text, headers: response?.headers };
  };

  // Test-only production-definition probe. It executes the real
  // `effectiveRootCondition`/`countRootAdmins` imported by the Worker, not a
  // harness copy of the SQL.
  const probe = async (label, path) => {
    const response = await call(null, label, "GET", path, { headers: { "x-w1-probe": probeToken } });
    if (response.status !== 200 || response.json?.ok !== true) {
      throw new Error(`PROBE_FAILED:${label}:${response.status}:${response.text.slice(0, 300)}`);
    }
    return response.json;
  };
  const probeRootIds = async (label) => (await probe(label, "/__w1/root-ids")).ids;
  const probeRootCount = async (label) => Number((await probe(label, "/__w1/root-count")).count);
  const probeRootFlags = async (label, ids) =>
    (await probe(label, `/__w1/root-flags?ids=${encodeURIComponent(ids.join(","))}`)).flags;

  const signIn = async (session, email, password) => {
    const response = await call(session, `sign-in:${session.label}`, "POST", "/api/auth/sign-in/email", {
      body: { email, password },
    });
    if (response.status !== 200) throw new Error(`SIGN_IN_FAILED:${session.label}:${response.status}`);
    return response;
  };

  const createUser = async (actorSession, roleKeys, label, overrides) => {
    const email = `w1f.${label}.${runTag}@example.invalid`;
    const password = `W1f-${label}-${randomBytes(7).toString("base64url")}`;
    const nextPassword = `${password}N`;
    const created = await call(actorSession, `create-user:${label}`, "POST", "/api/v1/users", {
      body: { email, password, name: `W1F ${label}`, roleKeys },
    });
    if (created.status !== 201) throw new Error(`CREATE_USER_FAILED:${label}:${created.status}:${created.text.slice(0, 200)}`);
    const id = created.json?.data?.id;
    const session = newSession(label);
    await signIn(session, email, password);
    const changed = await call(session, `change-password:${label}`, "POST", "/api/v1/me/password", {
      body: { currentPassword: password, newPassword: nextPassword },
    });
    if (changed.status !== 200) throw new Error(`CHANGE_PASSWORD_FAILED:${label}:${changed.status}`);
    await signIn(session, email, nextPassword);
    if (overrides) {
      const applied = await call(actorSession, `overrides:${label}`, "POST", `/api/v1/users/${id}/overrides`, { body: { overrides } });
      if (applied.status !== 200) throw new Error(`OVERRIDES_FAILED:${label}:${applied.status}`);
    }
    return { id, email, session, label };
  };

  const userRow = (id) => sql(`SELECT is_active, email FROM user WHERE id = ${sqlString(id)}`).rows?.[0] ?? null;

  try {
    const healthStarted = Date.now();
    let health = null;
    let attempts = 0;
    while (Date.now() - healthStarted < 180_000) {
      if (server.exitCode !== null) break;
      attempts += 1;
      try {
        const response = await fetch(`${base}/api/v1/health`, { signal: AbortSignal.timeout(5000) });
        const text = await response.text();
        health = { status: response.status, body: text.slice(0, 1000), attempts, elapsedMs: Date.now() - healthStarted };
        if (response.status === 200) break;
      } catch (caught) {
        health = { status: 0, error: caught instanceof Error ? caught.message : String(caught), attempts };
      }
      await sleep(750);
    }
    result.startup = { health, serverExitCode: server.exitCode };
    save();
    assertion("health", health?.status === 200, `status=${health?.status ?? 0} attempts=${attempts}`);
    if (health?.status !== 200) throw new Error("HEALTH_FAILED");

    const bootStatus = await call(null, "bootstrap-status", "GET", "/api/v1/auth/bootstrap-status");
    assertion("bootstrap-required", bootStatus.json?.data?.required === true, `status=${bootStatus.status}`);

    const adminSession = newSession("admin");
    const bootstrap = await call(null, "bootstrap", "POST", "/api/v1/auth/bootstrap", {
      body: { email: admin.email, password: admin.password, name: "W1F Admin" },
      headers: { "x-bootstrap-secret": bootstrapSecret },
    });
    assertion("bootstrap", bootstrap.status === 201, `status=${bootstrap.status}`);
    await signIn(adminSession, admin.email, admin.password);
    const changed = await call(adminSession, "admin-change-password", "POST", "/api/v1/me/password", {
      body: { currentPassword: admin.password, newPassword: admin.nextPassword },
    });
    assertion("admin-change-password", changed.status === 200, `status=${changed.status}`);
    await signIn(adminSession, admin.email, admin.nextPassword);
    const adminId = bootstrap.json?.data?.userId;
    result.admin = { id: adminId, email: admin.email };
    const adminIdRow = sql(`SELECT id FROM user WHERE email = ${sqlString(admin.email)}`);
    result.admin.dbId = adminIdRow.rows?.[0]?.id ?? null;

    if (args.mode === "g1") await runG1({
      call,
      sql,
      count,
      createUser,
      userRow,
      assertion,
      result,
      scenario: args.scenario,
      initialManager: { id: result.admin.dbId, session: adminSession, label: "admin" },
    });
    if (args.mode === "g2") await runG2({ call, sql, sqlFile, count, createUser, adminSession, adminId: result.admin.dbId, assertion, result });
    if (args.mode === "g3") await runG3({ call, sql, sqlFile, createUser, adminSession, assertion, result, runRoot });
    if (args.mode === "g1proof") {
      await runG1Proof({
        call,
        sql,
        sqlFile,
        createUser,
        userRow,
        assertion,
        result,
        scenario: args.scenario,
        adminSession,
        adminId: result.admin.dbId,
        probe,
        probeRootIds,
        probeRootCount,
        probeRootFlags,
        runRoot,
      });
    }

    result.productionProbe = {
      rootCount: await probeRootCount("probe-final-root-count"),
      rootIds: await probeRootIds("probe-final-root-ids"),
    };
    result.checks.push({ name: "no-5xx", ok: !result.http.some((item) => item.status >= 500), detail: `5xx=${result.http.filter((item) => item.status >= 500).length}` });
    result.finishedAt = new Date().toISOString();
    result.outcome = result.checks.every((item) => item.ok) ? "PASS" : "FAIL";
    save();
  } catch (error) {
    result.error = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
    result.checks.push({ name: "harness-exception", ok: false, detail: result.error.slice(0, 400) });
    save();
  } finally {
    let kill = { status: null, stdout: "", stderr: "" };
    if (server.pid) kill = spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { encoding: "utf8" });
    await sleep(2500);
    let portClosed = false;
    try {
      await fetch(`${base}/api/v1/health`, { signal: AbortSignal.timeout(1500) });
    } catch {
      portClosed = true;
    }
    const tasklist = spawnSync("tasklist", ["/FI", `PID eq ${server.pid}`, "/FO", "CSV", "/NH"], { encoding: "utf8" });
    const processGone = !String(tasklist.stdout).includes(String(server.pid));
    result.cleanup = {
      ownedPid: server.pid,
      taskkillExit: kill.status,
      portClosed,
      processGone,
      tasklist: String(tasklist.stdout).trim().slice(0, 300),
    };
    writeFileSync(path.join(evidence, "server-stdout.log"), stdout.join(""));
    writeFileSync(path.join(evidence, "server-stderr.log"), stderr.join(""));
    result.checks.push({ name: "teardown-port-closed", ok: portClosed, detail: `portClosed=${portClosed}` });
    result.checks.push({ name: "teardown-process-gone", ok: processGone, detail: `processGone=${processGone}` });

    try {
      const roots = sql(rootCountSql());
      const roleRoots = sql(ROLE_ROOT_COUNT_SQL);
      const sessions = sql("SELECT COUNT(*) AS n FROM session");
      const audits = sql("SELECT COUNT(*) AS n FROM audit_log");
      const users = sql("SELECT id, email, is_active FROM user ORDER BY email");
      result.db = {
        effectiveRootCount: roots.rows?.[0]?.n ?? null,
        roleRootCount: roleRoots.rows?.[0]?.n ?? null,
        sessionCount: sessions.rows?.[0]?.n ?? null,
        auditCount: audits.rows?.[0]?.n ?? null,
        users: users.rows ?? [],
        rootsExit: roots.exit,
        sessionsExit: sessions.exit,
      };
      writeFileSync(path.join(evidence, "db-after.json"), `${JSON.stringify(result.db, null, 2)}\n`);
    } catch (error) {
      result.db = { error: error instanceof Error ? error.message : String(error) };
    }
    result.outcome = result.checks.every((item) => item.ok) ? "PASS" : "FAIL";
    save();
  }

  return result;
}

/* ------------------------------------------------------------------------- */
/* G1 — last root administrator under real concurrency                       */
/* ------------------------------------------------------------------------- */
async function runG1({ call, sql, count, createUser, userRow, assertion, result, scenario, initialManager }) {
  const activeRootIds = () =>
    sql(`SELECT u.id FROM user u WHERE u.is_active = 1 AND ${EFFECTIVE_ROOT_CONDITION("u")} ORDER BY u.id`).rows.map(
      (row) => row.id,
    );
  const rootFlags = (userId) => {
    const row = sql(
      `SELECT
         CASE WHEN u.is_active = 1 AND ${EFFECTIVE_ROOT_CONDITION("u")} THEN 1 ELSE 0 END AS effective_root,
         CASE WHEN u.is_active = 1
           AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id
                       WHERE ur.user_id = u.id AND rp.permission_key = 'users.manage')
           AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id
                       WHERE ur.user_id = u.id AND rp.permission_key = 'roles.manage')
         THEN 1 ELSE 0 END AS role_root
       FROM user u WHERE u.id = ${sqlString(userId)}`,
    ).rows?.[0];
    return {
      effective: row ? Number(row.effective_root) : null,
      role: row ? Number(row.role_root) : null,
    };
  };
  const rootCount = () => count(rootCountSql());
  const code = (response) => response.json?.error?.code ?? null;

  // Each scenario starts from the run-owned bootstrap administrator and leaves
  // exactly one active effective root behind, so the next scenario can run.
  let manager = initialManager;
  const retireManager = async (label) => {
    const response = await call(manager.session, label, "POST", `/api/v1/users/${manager.id}/active`, {
      body: { active: false },
    });
    return response;
  };

  const runRace = scenario === "full" || scenario === "race";
  const runNegative = scenario === "full" || scenario === "negative";
  const runCross = scenario === "full" || scenario === "cross";
  const runGhost = scenario === "full" || scenario === "ghost";
  const runGrantOnly = scenario === "full" || scenario === "grantonly";

  /* --- A: two concurrent deactivations of the last two root admins --------- */
  if (runRace) {
    const baselineRoots = rootCount();
    assertion(
      "g1-baseline-single-root",
      baselineRoots === 1 && activeRootIds().length === 1,
      `roots=${baselineRoots} ids=${activeRootIds().join(",")}`,
    );
    if (baselineRoots !== 1) throw new Error("G1_BASELINE_NOT_SINGLE_ROOT");

    const raceAttempts = 12;
    let zeroObserved = 0;
    let bothSucceeded = 0;
    let overlapFailures = 0;
    for (let attempt = 1; attempt <= raceAttempts; attempt += 1) {
      const pair = [
        await createUser(manager.session, ["administrator"], `g1-a${attempt}`),
        await createUser(manager.session, ["administrator"], `g1-b${attempt}`),
      ];
      const retire = await retireManager(`g1-retire-manager-${attempt}`);
      const before = rootCount();
      assertion(`g1-attempt-${attempt}-retire-ok`, retire.status === 200 && before === 2, `status=${retire.status} before=${before}`);
      if (retire.status !== 200 || before !== 2) throw new Error(`G1_RACE_SETUP_FAILED:${retire.status}:${before}`);

      const startAt = Date.now() + 400;
      const burst = await Promise.all([
        (async () => {
          while (Date.now() < startAt) await sleep(2);
          return call(pair[0].session, `g1-race-${attempt}-a`, "POST", `/api/v1/users/${pair[1].id}/active`, {
            body: { active: false },
          });
        })(),
        (async () => {
          while (Date.now() < startAt) await sleep(2);
          return call(pair[1].session, `g1-race-${attempt}-b`, "POST", `/api/v1/users/${pair[0].id}/active`, {
            body: { active: false },
          });
        })(),
      ]);
      const after = rootCount();
      const overlap = Math.max(burst[0].sentAt, burst[1].sentAt) < Math.min(burst[0].endedAt, burst[1].endedAt);
      const successes = burst.filter((item) => item.status === 200).length;
      const rejected = burst.filter((item) => item.status === 409 || item.status === 401 || item.status === 403).length;
      const serverErrors = burst.filter((item) => item.status >= 500).length;
      if (after === 0) zeroObserved += 1;
      if (successes === 2) bothSucceeded += 1;
      if (!overlap) overlapFailures += 1;
      result.attempts.push({
        scenario: "race",
        attempt,
        retireStatus: retire.status,
        rootsBeforeRace: before,
        pair: pair.map((item) => item.id),
        statuses: burst.map((item) => item.status),
        codes: burst.map(code),
        successCount: successes,
        rejectedCount: rejected,
        serverErrorCount: serverErrors,
        overlap,
        intervals: burst.map((item) => ({ sentAt: item.sentAt, endedAt: item.endedAt, elapsedMs: item.elapsedMs })),
        rootsAfterRace: after,
        activeRootIdsAfterRace: activeRootIds(),
      });
      assertion(`g1-attempt-${attempt}-real-overlap`, overlap, JSON.stringify(burst.map((item) => [item.sentAt, item.endedAt])));
      assertion(`g1-attempt-${attempt}-invariant`, after >= 1, `after=${after}`);
      assertion(
        `g1-attempt-${attempt}-single-effect`,
        successes <= 1 && successes + rejected === 2,
        `successes=${successes} rejected=${rejected} statuses=${burst.map((item) => item.status).join(",")}`,
      );
      assertion(`g1-attempt-${attempt}-no-server-error`, serverErrors === 0, `5xx=${serverErrors}`);

      const alive = activeRootIds();
      const survivor = pair.find((candidate) => alive.includes(candidate.id));
      if (!survivor) throw new Error(`G1_RACE_NO_SURVIVOR:${JSON.stringify(alive)}`);
      manager = survivor;
    }
    result.g1Race = { raceAttempts, zeroObserved, bothSucceeded, overlapFailures };
  }

  /* --- B: authorization negatives and idempotent re-deactivation ----------- */
  if (runNegative) {
    const officer = await createUser(manager.session, ["export_officer"], "g1-officer");
    const deniedOther = await call(officer.session, "g1-officer-denied", "POST", `/api/v1/users/${manager.id}/active`, {
      body: { active: false },
    });
    assertion("g1-officer-cannot-disable-root", deniedOther.status === 403, `status=${deniedOther.status}`);
    const deniedSelf = await call(officer.session, "g1-officer-self-denied", "POST", `/api/v1/users/${officer.id}/active`, {
      body: { active: false },
    });
    assertion("g1-officer-cannot-disable-self", deniedSelf.status === 403, `status=${deniedSelf.status}`);

    const firstDisable = await call(manager.session, "g1-disable-officer-1", "POST", `/api/v1/users/${officer.id}/active`, {
      body: { active: false },
    });
    const secondDisable = await call(manager.session, "g1-disable-officer-2", "POST", `/api/v1/users/${officer.id}/active`, {
      body: { active: false },
    });
    const officerRow = userRow(officer.id);
    assertion(
      "g1-repeat-disable-idempotent",
      firstDisable.status === 200 && secondDisable.status === 200 && Number(officerRow?.is_active) === 0,
      `statuses=${firstDisable.status},${secondDisable.status} active=${officerRow?.is_active}`,
    );
    assertion("g1-repeat-disable-invariant", rootCount() >= 1, `roots=${rootCount()}`);

    // The two privilege-edit paths must also refuse to leave zero roots, and
    // must leave the stored privileges unchanged when they refuse.
    const rolesBefore = sql(`SELECT COUNT(*) AS n FROM user_roles WHERE user_id = ${sqlString(manager.id)}`).rows?.[0]?.n;
    const selfRoleRemoval = await call(manager.session, "g1-self-remove-last-root-roles", "POST", `/api/v1/users/${manager.id}/roles`, {
      body: { roleKeys: [] },
    });
    const rolesAfter = sql(`SELECT COUNT(*) AS n FROM user_roles WHERE user_id = ${sqlString(manager.id)}`).rows?.[0]?.n;
    assertion(
      "g1-self-role-removal-last-root-refused",
      selfRoleRemoval.status === 409 && code(selfRoleRemoval) === "LAST_ADMIN",
      `status=${selfRoleRemoval.status} code=${code(selfRoleRemoval)}`,
    );
    assertion(
      "g1-self-role-removal-restored",
      Number(rolesBefore) >= 1 && Number(rolesAfter) === Number(rolesBefore) && rootFlags(manager.id).effective === 1,
      `before=${rolesBefore} after=${rolesAfter} effective=${rootFlags(manager.id).effective}`,
    );

    const overridesBefore = sql(`SELECT COUNT(*) AS n FROM user_permission_overrides WHERE user_id = ${sqlString(manager.id)}`).rows?.[0]?.n;
    const selfDeny = await call(manager.session, "g1-self-deny-last-root", "POST", `/api/v1/users/${manager.id}/overrides`, {
      body: { overrides: [{ permissionKey: "users.manage", effect: "DENY" }] },
    });
    const overridesAfter = sql(`SELECT COUNT(*) AS n FROM user_permission_overrides WHERE user_id = ${sqlString(manager.id)}`).rows?.[0]?.n;
    assertion(
      "g1-self-deny-last-root-refused",
      selfDeny.status === 409 && code(selfDeny) === "LAST_ADMIN",
      `status=${selfDeny.status} code=${code(selfDeny)}`,
    );
    assertion(
      "g1-self-deny-restored",
      Number(overridesBefore) === Number(overridesAfter) && rootFlags(manager.id).effective === 1,
      `before=${overridesBefore} after=${overridesAfter} effective=${rootFlags(manager.id).effective}`,
    );
    result.g1Negative = {
      root: deniedOther.status,
      self: deniedSelf.status,
      disable: [firstDisable.status, secondDisable.status],
      selfRoleRemoval: { status: selfRoleRemoval.status, code: code(selfRoleRemoval), rolesBefore, rolesAfter },
      selfDeny: { status: selfDeny.status, code: code(selfDeny), overridesBefore, overridesAfter },
    };
  }

  /* --- C: deactivation racing a privilege revocation on the other root ----- */
  if (runCross) {
    const crossAttempts = 8;
    let zeroObserved = 0;
    let overlapFailures = 0;
    for (let attempt = 1; attempt <= crossAttempts; attempt += 1) {
      const actor = await createUser(manager.session, ["administrator"], `g1-cross-a${attempt}`);
      const target = await createUser(manager.session, ["administrator"], `g1-cross-b${attempt}`);
      const retire = await retireManager(`g1-cross-retire-${attempt}`);
      const before = rootCount();
      assertion(`g1-cross-${attempt}-retire-ok`, retire.status === 200 && before === 2, `status=${retire.status} before=${before}`);
      if (retire.status !== 200 || before !== 2) throw new Error(`G1_CROSS_SETUP_FAILED:${retire.status}:${before}`);

      const startAt = Date.now() + 400;
      const burst = await Promise.all([
        (async () => {
          while (Date.now() < startAt) await sleep(2);
          return call(target.session, `g1-cross-${attempt}-deactivate`, "POST", `/api/v1/users/${actor.id}/active`, {
            body: { active: false },
          });
        })(),
        (async () => {
          while (Date.now() < startAt) await sleep(2);
          return call(actor.session, `g1-cross-${attempt}-deny`, "POST", `/api/v1/users/${target.id}/overrides`, {
            body: { overrides: [{ permissionKey: "users.manage", effect: "DENY" }] },
          });
        })(),
      ]);
      const after = rootCount();
      const overlap = Math.max(burst[0].sentAt, burst[1].sentAt) < Math.min(burst[0].endedAt, burst[1].endedAt);
      const serverErrors = burst.filter((item) => item.status >= 500).length;
      if (after === 0) zeroObserved += 1;
      if (!overlap) overlapFailures += 1;
      result.attempts.push({
        scenario: "cross",
        attempt,
        retireStatus: retire.status,
        rootsBeforeRace: before,
        statuses: burst.map((item) => item.status),
        codes: burst.map(code),
        serverErrorCount: serverErrors,
        overlap,
        rootsAfterRace: after,
        activeRootIdsAfterRace: activeRootIds(),
      });
      assertion(`g1-cross-${attempt}-real-overlap`, overlap, JSON.stringify(burst.map((item) => [item.sentAt, item.endedAt])));
      assertion(`g1-cross-${attempt}-no-server-error`, serverErrors === 0, `5xx=${serverErrors}`);
      assertion(`g1-cross-${attempt}-invariant`, after >= 1, `after=${after} statuses=${burst.map((item) => item.status).join(",")}`);

      const alive = activeRootIds();
      const survivor = [actor, target].find((candidate) => alive.includes(candidate.id));
      if (!survivor) throw new Error(`G1_CROSS_NO_SURVIVOR:${JSON.stringify(alive)}`);
      manager = survivor;
    }
    result.g1Cross = { crossAttempts, zeroObserved, overlapFailures };
  }

  /* --- D: "ghost root" — role-root whose root permission is denied --------- */
  if (runGhost) {
    const ghost = await createUser(manager.session, ["administrator"], "g1-ghost", [
      { permissionKey: "users.manage", effect: "DENY" },
    ]);
    const ghostFlags = rootFlags(ghost.id);
    assertion("g1-ghost-is-role-root", ghostFlags.role === 1, `roleRoot=${ghostFlags.role}`);
    assertion("g1-ghost-is-not-effective-root", ghostFlags.effective === 0, `effective=${ghostFlags.effective}`);
    const managerFlags = rootFlags(manager.id);
    const rootsBefore = rootCount();
    assertion("g1-ghost-manager-is-effective-root", managerFlags.effective === 1, `effective=${managerFlags.effective}`);
    if (managerFlags.effective !== 1) throw new Error("G1_GHOST_SETUP_FAILED");

    const disableManager = await call(manager.session, "g1-ghost-disable-last-root", "POST", `/api/v1/users/${manager.id}/active`, {
      body: { active: false },
    });
    const after = rootCount();
    result.g1Ghost = {
      ghostId: ghost.id,
      managerId: manager.id,
      rootsBefore,
      ghostRoleRoot: ghostFlags.role,
      ghostEffectiveRoot: ghostFlags.effective,
      status: disableManager.status,
      code: code(disableManager),
      effectiveRootsAfter: after,
      activeRootIdsAfter: activeRootIds(),
    };
    assertion(
      "g1-ghost-last-root-refused",
      disableManager.status === 409 && code(disableManager) === "LAST_ADMIN",
      `status=${disableManager.status} code=${code(disableManager)}`,
    );
    assertion("g1-ghost-manager-still-active", Number(userRow(manager.id)?.is_active) === 1, `active=${userRow(manager.id)?.is_active}`);
    assertion("g1-ghost-invariant", after >= 1, `roots=${after}`);
  }

  /* --- E: grant-only root (no administrator role) cannot self-disable ------ */
  if (runGrantOnly) {
    const grantOnly = await createUser(manager.session, ["export_officer"], "g1-grantonly", [
      { permissionKey: "users.manage", effect: "GRANT" },
      { permissionKey: "roles.manage", effect: "GRANT" },
    ]);
    const flags = rootFlags(grantOnly.id);
    assertion("g1-grantonly-is-effective-root", flags.effective === 1, `effective=${flags.effective}`);
    assertion("g1-grantonly-is-not-role-root", flags.role === 0, `roleRoot=${flags.role}`);
    const rootsBefore = rootCount();
    assertion("g1-grantonly-two-roots-before", rootsBefore === 2, `roots=${rootsBefore}`);

    const removeOwnRoles = await call(manager.session, "g1-manager-remove-own-roles", "POST", `/api/v1/users/${manager.id}/roles`, {
      body: { roleKeys: [] },
    });
    const afterRemove = rootCount();
    const rootsNow = activeRootIds();
    assertion("g1-own-role-removal-allowed-with-root", removeOwnRoles.status === 200, `status=${removeOwnRoles.status}`);
    assertion(
      "g1-grantonly-becomes-last-root",
      afterRemove === 1 && rootsNow.length === 1 && rootsNow[0] === grantOnly.id,
      `roots=${afterRemove} ids=${rootsNow.join(",")}`,
    );

    const selfDisable = await call(grantOnly.session, "g1-grantonly-self-disable", "POST", `/api/v1/users/${grantOnly.id}/active`, {
      body: { active: false },
    });
    const finalRoots = rootCount();
    result.g1GrantOnly = {
      grantOnlyId: grantOnly.id,
      rootsBefore,
      status: selfDisable.status,
      code: code(selfDisable),
      effectiveRootsAfter: finalRoots,
      activeRootIdsAfter: activeRootIds(),
    };
    assertion(
      "g1-grantonly-last-root-refused",
      selfDisable.status === 409 && code(selfDisable) === "LAST_ADMIN",
      `status=${selfDisable.status} code=${code(selfDisable)}`,
    );
    assertion("g1-grantonly-still-active", Number(userRow(grantOnly.id)?.is_active) === 1, `active=${userRow(grantOnly.id)?.is_active}`);
    assertion("g1-grantonly-invariant", finalRoots >= 1, `roots=${finalRoots}`);
  }

  result.g1Final = { scenario, activeRootIds: activeRootIds(), roots: rootCount() };
}

/* ------------------------------------------------------------------------- */
/* G2 — reports.view_all: default deny + explicit grant/revoke               */
/* ------------------------------------------------------------------------- */
async function runG2({ call, sql, createUser, adminSession, adminId, assertion, result }) {
  const ops = await createUser(adminSession, ["operations_manager"], "g2-ops");
  const viewer = await createUser(adminSession, ["viewer"], "g2-viewer");
  const officer = await createUser(adminSession, ["export_officer"], "g2-officer");

  const customer = await call(adminSession, "g2-customer", "POST", "/api/v1/customers", {
    body: { legalName: `W1F Reports Customer ${Date.now()}`, countryCode: "EG" },
  });
  assertion("g2-customer-created", customer.status === 201 && Boolean(customer.json?.data?.id), `status=${customer.status}`);
  const customerId = customer.json?.data?.id;

  const makeCase = async (session, label, assignedTo) => {
    const response = await call(session, label, "POST", "/api/v1/export-cases", {
      body: { customerId, documentRoute: "DIRECT", destinationCountry: "SA", ...(assignedTo ? { assignedTo } : {}) },
    });
    if (response.status !== 201) throw new Error(`CREATE_CASE_FAILED:${label}:${response.status}:${response.text.slice(0, 200)}`);
    return response.json?.data?.id;
  };

  const opsCases = [];
  for (let i = 1; i <= 5; i += 1) opsCases.push(await makeCase(ops.session, `g2-case-ops-${i}`));
  const adminCases = [];
  for (let i = 1; i <= 3; i += 1) adminCases.push(await makeCase(adminSession, `g2-case-admin-${i}`, adminId));

  const totalCases = sql("SELECT COUNT(*) AS n FROM export_cases").rows?.[0]?.n;
  const opsOwned = sql(`SELECT COUNT(*) AS n FROM export_cases WHERE created_by = ${sqlString(ops.id)} OR assigned_to = ${sqlString(ops.id)}`).rows?.[0]?.n;
  const pendingDocs = (filter) =>
    sql(
      `SELECT COUNT(*) AS n FROM operation_document_requirements d JOIN export_cases c ON c.id = d.case_id
        WHERE d.required = 1 AND d.status NOT IN ('APPROVED','WAIVED') AND (${filter})`,
    ).rows?.[0]?.n;
  const opsPendingDocs = pendingDocs(`c.assigned_to = ${sqlString(ops.id)} OR c.created_by = ${sqlString(ops.id)}`);
  const allPendingDocs = pendingDocs("1 = 1");
  result.g2Setup = { totalCases, opsOwned, opsPendingDocs, allPendingDocs, customerId, opsCases, adminCases };

  const overview = (session, label, query = "") => call(session, label, "GET", `/api/v1/reports/overview${query}`);
  const delays = (session, label, query = "") => call(session, label, "GET", `/api/v1/reports/delays${query}`);
  const csv = (session, label, query = "") => call(session, label, "GET", `/api/v1/exports/csv${query}`);
  const dashboard = (session, label) => call(session, label, "GET", "/api/v1/dashboard");
  const csvRows = (response) => String(response.text ?? "").replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(Boolean).length - 1;

  const adminOverview = await overview(adminSession, "g2-overview-admin");
  const adminDelays = await delays(adminSession, "g2-delays-admin");
  const adminCsv = await csv(adminSession, "g2-csv-admin");
  assertion("g2-admin-sees-all-overview", Number(adminOverview.json?.data?.counts?.total_cases) === Number(totalCases), `total=${adminOverview.json?.data?.counts?.total_cases} db=${totalCases}`);
  assertion("g2-admin-sees-all-csv", csvRows(adminCsv) === Number(totalCases), `rows=${csvRows(adminCsv)} db=${totalCases}`);
  assertion(
    "g2-admin-delays-all",
    Number(adminDelays.json?.data?.incompleteRequiredDocuments) === Number(allPendingDocs),
    `docs=${adminDelays.json?.data?.incompleteRequiredDocuments} all=${allPendingDocs}`,
  );

  const opsOverview = await overview(ops.session, "g2-overview-ops");
  const opsOverviewParam = await overview(ops.session, "g2-overview-ops-params", "?scope=all&assignedTo=&page=1&sort=case_reference");
  const opsDelays = await delays(ops.session, "g2-delays-ops", "?scope=all");
  const opsCsv = await csv(ops.session, "g2-csv-ops", "?scope=all&assignedTo=");
  const opsDashboard = await dashboard(ops.session, "g2-dashboard-ops");
  result.g2Ops = {
    ownedInDb: Number(opsOwned),
    overviewTotal: Number(opsOverview.json?.data?.counts?.total_cases ?? -1),
    overviewParamTotal: Number(opsOverviewParam.json?.data?.counts?.total_cases ?? -1),
    incompleteRequiredDocs: Number(opsDelays.json?.data?.incompleteRequiredDocuments ?? -1),
    csvRows: csvRows(opsCsv),
    dashboardTotal: Number(opsDashboard.json?.data?.counts?.total_cases ?? -1),
  };
  assertion("g2-ops-overview-scoped", Number(opsOverview.json?.data?.counts?.total_cases) === Number(opsOwned), `total=${result.g2Ops.overviewTotal} owned=${opsOwned}`);
  assertion("g2-ops-query-params-ignored", Number(opsOverviewParam.json?.data?.counts?.total_cases) === Number(opsOwned), `total=${result.g2Ops.overviewParamTotal}`);
  assertion(
    "g2-ops-delays-scoped",
    Number(opsDelays.json?.data?.incompleteRequiredDocuments) === Number(opsPendingDocs),
    `docs=${result.g2Ops.incompleteRequiredDocs} expected=${opsPendingDocs} all=${allPendingDocs}`,
  );
  assertion("g2-ops-csv-scoped", csvRows(opsCsv) === Number(opsOwned), `rows=${result.g2Ops.csvRows} owned=${opsOwned}`);
  // The case-visibility entitlement still governs the operational dashboard.
  assertion("g2-ops-dashboard-unchanged", Number(opsDashboard.json?.data?.counts?.total_cases) === Number(totalCases), `dashboard=${result.g2Ops.dashboardTotal} total=${totalCases}`);

  const viewerOverview = await overview(viewer.session, "g2-overview-viewer");
  const viewerCsv = await csv(viewer.session, "g2-csv-viewer");
  const officerDelays = await delays(officer.session, "g2-delays-officer");
  assertion("g2-viewer-overview-zero", Number(viewerOverview.json?.data?.counts?.total_cases) === 0, `total=${viewerOverview.json?.data?.counts?.total_cases}`);
  assertion("g2-viewer-csv-403", viewerCsv.status === 403, `status=${viewerCsv.status}`);
  assertion("g2-officer-reports-403", officerDelays.status === 403, `status=${officerDelays.status}`);

  // Explicit grant of the independent report entitlement widens exactly the
  // report ports; revoking it narrows them again.
  const grant = await call(adminSession, "g2-grant-ops", "POST", `/api/v1/users/${ops.id}/overrides`, {
    body: { overrides: [{ permissionKey: "reports.view_all", effect: "GRANT" }] },
  });
  result.g2GrantStatus = { status: grant.status, code: grant.json?.error?.code ?? null, fieldErrors: grant.json?.error?.fieldErrors ?? null };
  assertion("g2-grant-reports-view-all", grant.status === 200, `status=${grant.status} code=${grant.json?.error?.code ?? null}`);

  if (grant.status === 200) {
    const grantedOverview = await overview(ops.session, "g2-overview-ops-granted");
    const grantedCsv = await csv(ops.session, "g2-csv-ops-granted");
    assertion("g2-granted-overview-all", Number(grantedOverview.json?.data?.counts?.total_cases) === Number(totalCases), `total=${grantedOverview.json?.data?.counts?.total_cases} db=${totalCases}`);
    assertion("g2-granted-csv-all", csvRows(grantedCsv) === Number(totalCases), `rows=${csvRows(grantedCsv)} db=${totalCases}`);
    const grantedDelays = await delays(ops.session, "g2-delays-ops-granted");
    assertion(
      "g2-granted-delays-all",
      Number(grantedDelays.json?.data?.incompleteRequiredDocuments) === Number(allPendingDocs),
      `docs=${grantedDelays.json?.data?.incompleteRequiredDocuments} all=${allPendingDocs}`,
    );
    const grantedDashboard = await dashboard(ops.session, "g2-dashboard-ops-granted");
    assertion(
      "g2-granted-dashboard-unchanged",
      Number(grantedDashboard.json?.data?.counts?.total_cases) === Number(totalCases),
      `dashboard=${grantedDashboard.json?.data?.counts?.total_cases} total=${totalCases}`,
    );

    const revoke = await call(adminSession, "g2-deny-ops", "POST", `/api/v1/users/${ops.id}/overrides`, {
      body: { overrides: [{ permissionKey: "reports.view_all", effect: "DENY" }] },
    });
    assertion("g2-deny-reports-view-all", revoke.status === 200, `status=${revoke.status}`);
    const revokedOverview = await overview(ops.session, "g2-overview-ops-revoked");
    const revokedCsv = await csv(ops.session, "g2-csv-ops-revoked");
    assertion("g2-revoked-overview-scoped", Number(revokedOverview.json?.data?.counts?.total_cases) === Number(opsOwned), `total=${revokedOverview.json?.data?.counts?.total_cases} owned=${opsOwned}`);
    assertion("g2-revoked-csv-scoped", csvRows(revokedCsv) === Number(opsOwned), `rows=${csvRows(revokedCsv)} owned=${opsOwned}`);
    const revokedDelays = await delays(ops.session, "g2-delays-ops-revoked");
    assertion(
      "g2-revoked-delays-scoped",
      Number(revokedDelays.json?.data?.incompleteRequiredDocuments) === Number(opsPendingDocs),
      `docs=${revokedDelays.json?.data?.incompleteRequiredDocuments} expected=${opsPendingDocs}`,
    );
    result.g2Grant = { granted: true, revoked: true };
  } else {
    result.g2Grant = { granted: false };
  }

  const permissionRow = sql("SELECT key FROM permissions WHERE key = 'reports.view_all'");
  const adminRoleRow = sql("SELECT COUNT(*) AS n FROM role_permissions WHERE permission_key = 'reports.view_all' AND role_id = (SELECT id FROM roles WHERE key = 'administrator')");
  const opsRoleRow = sql("SELECT COUNT(*) AS n FROM role_permissions WHERE permission_key = 'reports.view_all' AND role_id = (SELECT id FROM roles WHERE key = 'operations_manager')");
  result.g2Permission = {
    catalogRow: permissionRow.rows?.length ?? 0,
    administratorGrant: adminRoleRow.rows?.[0]?.n ?? null,
    operationsManagerGrant: opsRoleRow.rows?.[0]?.n ?? null,
  };
  assertion("g2-permission-catalog-row", (permissionRow.rows?.length ?? 0) === 1, `rows=${permissionRow.rows?.length ?? 0}`);
  assertion("g2-administrator-granted", Number(adminRoleRow.rows?.[0]?.n ?? 0) === 1, `n=${adminRoleRow.rows?.[0]?.n}`);
  assertion("g2-operations-manager-not-granted", Number(opsRoleRow.rows?.[0]?.n ?? 0) === 0, `n=${opsRoleRow.rows?.[0]?.n}`);
  assertion("g2-viewer-is-not-ops", viewer.id !== ops.id, "distinct users");
}

/* ------------------------------------------------------------------------- */
/* G3 — document review/upload races + GAP-10 synthetic proof                */
/* ------------------------------------------------------------------------- */
async function runG3({ call, sql, sqlFile, createUser, adminSession, assertion, result, runRoot }) {
  const uploader = await createUser(adminSession, ["export_officer"], "g3-uploader");
  const customer = await call(uploader.session, "g3-customer", "POST", "/api/v1/customers", {
    body: { legalName: `W1F Documents Customer ${Date.now()}`, countryCode: "EG" },
  });
  assertion("g3-customer-created", customer.status === 201, `status=${customer.status}`);
  const customerId = customer.json?.data?.id;
  // An unknown template id yields no checklist rows, so each requirement in
  // this scenario is created explicitly through the real endpoint.
  const exportCase = await call(uploader.session, "g3-case", "POST", "/api/v1/export-cases", {
    body: { customerId, documentRoute: "DIRECT", destinationCountry: "SA", templateId: "tpl-w1f-none" },
  });
  assertion("g3-case-created", exportCase.status === 201, `status=${exportCase.status}`);
  const caseId = exportCase.json?.data?.id;

  const addRequirement = async (label, documentTypeId = "dt-ci") => {
    const response = await call(uploader.session, label, "POST", `/api/v1/export-cases/${caseId}/document-requirements`, {
      body: { documentTypeId, required: true },
    });
    if (response.status !== 201) throw new Error(`ADD_REQUIREMENT_FAILED:${label}:${response.status}:${response.text.slice(0, 200)}`);
    return response.json?.data?.id;
  };

  const seedSql = (label, text) => {
    const file = path.join(runRoot, `seed-${label}.sql`);
    writeFileSync(file, `${text}\n`);
    const out = sqlFile(file, `seed-${label}`);
    if (out.exit !== 0) throw new Error(`SEED_FAILED:${label}:${out.stderr.slice(-500)}`);
  };

  const seedUploadSession = (requirementId, key) => {
    seedSql(
      key,
      `INSERT INTO upload_sessions (id, object_key, parent_type, parent_id, owner_user_id, filename, expected_bytes, mime, upload_id, state, expires_at, finalized_at, created_at)
       VALUES ('us-${key}', 'synthetic/${key}.pdf', 'document_requirement', '${requirementId}', '${uploader.id}', 'version.pdf', 12, 'application/pdf', NULL, 'COMPLETED', datetime('now', '+1 day'), datetime('now'), datetime('now'));`,
    );
    return `synthetic/${key}.pdf`;
  };

  const seedVersion = (requirementId, version, state) => {
    const id = `dv-${randomBytes(6).toString("hex")}`;
    seedSql(
      `version-${requirementId}-${version}`,
      `INSERT INTO document_versions (id, requirement_id, version, r2_key, original_name, content_type, byte_size, checksum, uploaded_by, review_state, created_at)
       VALUES ('${id}', '${requirementId}', ${version}, 'synthetic/v${version}.pdf', 'version.pdf', 'application/pdf', 12, NULL, '${uploader.id}', '${state}', datetime('now'));
       UPDATE operation_document_requirements SET status = 'UNDER_REVIEW', updated_at = datetime('now') WHERE id = '${requirementId}';`,
    );
    return id;
  };

  const requirementState = (requirementId) =>
    sql(`SELECT r.status AS req_status,
      (SELECT COUNT(*) FROM document_versions v WHERE v.requirement_id = r.id) AS versions,
      (SELECT MAX(v.version) FROM document_versions v WHERE v.requirement_id = r.id) AS max_version,
      (SELECT v.version FROM document_versions v JOIN document_reviews dr ON dr.version_id = v.id WHERE v.requirement_id = r.id ORDER BY dr.created_at DESC LIMIT 1) AS reviewed_version,
      (SELECT v.review_state FROM document_versions v WHERE v.requirement_id = r.id AND v.version = (SELECT MAX(version) FROM document_versions WHERE requirement_id = r.id)) AS latest_state,
      (SELECT COUNT(*) FROM document_reviews dr JOIN document_versions v ON v.id = dr.version_id WHERE v.requirement_id = r.id) AS reviews
      FROM operation_document_requirements r WHERE r.id = ${sqlString(requirementId)}`).rows?.[0] ?? null;

  // --- Test 1: review reads v1, uploader adds v2 before the review writes ---
  const req1 = await addRequirement("g3-req-1", "dt-ci");
  seedVersion(req1, 1, "UNDER_REVIEW");
  const session1 = seedUploadSession(req1, "race-1");
  const reviewPromise = call(adminSession, "g3-review-v1-during-v2-upload", "POST", `/api/v1/document-requirements/${req1}/review`, {
    body: { decision: "APPROVED" },
  });
  await sleep(180);
  const upload1 = await call(uploader.session, "g3-upload-v2", "POST", `/api/v1/document-requirements/${req1}/versions`, {
    body: { r2Key: session1, originalName: "version.pdf", contentType: "application/pdf", byteSize: 12 },
  });
  const review1 = await reviewPromise;
  const state1 = requirementState(req1);
  const staleApproval = state1?.req_status === "APPROVED" && Number(state1?.max_version) > Number(state1?.reviewed_version ?? 0) && state1?.latest_state === "UPLOADED";
  result.g3Race1 = { uploadStatus: upload1.status, reviewStatus: review1.status, reviewCode: review1.json?.error?.code ?? null, state: state1, staleApproval };
  assertion("g3-upload-v2-created", upload1.status === 201, `status=${upload1.status}`);
  assertion("g3-review-v1-vs-v2-no-stale-approval", !staleApproval, JSON.stringify(state1));
  assertion("g3-review-v1-vs-v2-rejected-or-consistent", review1.status === 409 || review1.status === 200, `status=${review1.status} code=${review1.json?.error?.code ?? null}`);

  // --- Test 2: upload v2 first, then review: the decision must target v2 -----
  const req2 = await addRequirement("g3-req-2", "dt-pl");
  seedVersion(req2, 1, "UNDER_REVIEW");
  const session2 = seedUploadSession(req2, "race-2");
  const upload2 = await call(uploader.session, "g3-upload-v2-second", "POST", `/api/v1/document-requirements/${req2}/versions`, {
    body: { r2Key: session2, originalName: "version.pdf", contentType: "application/pdf", byteSize: 12 },
  });
  const markUnderReview = await call(adminSession, "g3-mark-under-review", "POST", `/api/v1/document-requirements/${req2}/review`, { body: { decision: "UNDER_REVIEW" } });
  const review2 = await call(adminSession, "g3-review-after-v2", "POST", `/api/v1/document-requirements/${req2}/review`, { body: { decision: "APPROVED" } });
  const state2 = requirementState(req2);
  result.g3Race2 = { uploadStatus: upload2.status, underReviewStatus: markUnderReview.status, reviewStatus: review2.status, state: state2 };
  assertion("g3-upload-v2-second-created", upload2.status === 201, `status=${upload2.status}`);
  assertion("g3-review-targets-latest", state2?.req_status === "APPROVED" && Number(state2?.reviewed_version) === Number(state2?.max_version) && state2?.latest_state === "APPROVED", JSON.stringify(state2));

  // --- Test 3: NEEDS_CORRECTION on the current version ----------------------
  const req3 = await addRequirement("g3-req-3", "dt-coo");
  seedVersion(req3, 1, "UNDER_REVIEW");
  const correction = await call(adminSession, "g3-needs-correction", "POST", `/api/v1/document-requirements/${req3}/review`, { body: { decision: "NEEDS_CORRECTION", comment: "Rescan" } });
  const state3 = requirementState(req3);
  result.g3Correction = { status: correction.status, state: state3 };
  assertion("g3-needs-correction", correction.status === 200 && state3?.req_status === "NEEDS_CORRECTION" && state3?.latest_state === "NEEDS_CORRECTION", JSON.stringify({ status: correction.status, state: state3 }));

  // --- Test 4: WAIVED without a version ------------------------------------
  const req4 = await addRequirement("g3-req-4", "dt-bl");
  const waivedNoVersion = await call(adminSession, "g3-waived", "POST", `/api/v1/document-requirements/${req4}/review`, { body: { decision: "WAIVED", reason: "Not applicable to this shipment" } });
  const state4 = requirementState(req4);
  result.g3Waived = { status: waivedNoVersion.status, state: state4 };
  assertion("g3-waived-without-version", waivedNoVersion.status === 200 && state4?.req_status === "WAIVED" && Number(state4?.reviews) === 0, JSON.stringify({ status: waivedNoVersion.status, state: state4 }));

  // --- Test 5: duplicate identical decision is a no-op ---------------------
  const req5 = await addRequirement("g3-req-5", "dt-pc");
  seedVersion(req5, 1, "UNDER_REVIEW");
  const first = await call(adminSession, "g3-review-once", "POST", `/api/v1/document-requirements/${req5}/review`, { body: { decision: "APPROVED" } });
  const second = await call(adminSession, "g3-review-duplicate", "POST", `/api/v1/document-requirements/${req5}/review`, { body: { decision: "APPROVED" } });
  const state5 = requirementState(req5);
  result.g3Duplicate = { first: first.status, second: second.status, reviews: state5?.reviews };
  assertion("g3-duplicate-no-second-review", second.status === 200 && Number(state5?.reviews) === 1, JSON.stringify({ first: first.status, second: second.status, state: state5 }));

  // --- Test 6: unauthorized reviewer --------------------------------------
  const req6 = await addRequirement("g3-req-6", "dt-bcl");
  seedVersion(req6, 1, "UNDER_REVIEW");
  const unauthorized = await call(uploader.session, "g3-review-unauthorized", "POST", `/api/v1/document-requirements/${req6}/review`, { body: { decision: "APPROVED" } });
  const state6 = requirementState(req6);
  assertion("g3-unauthorized-review-403", unauthorized.status === 403 && state6?.req_status === "UNDER_REVIEW", `status=${unauthorized.status} req=${state6?.req_status}`);

  // --- Test 7: removeRequirement vs attachVersion -------------------------
  const req7 = await addRequirement("g3-req-7", "dt-bc");
  const session7 = seedUploadSession(req7, "race-7");
  const target7 = Date.now() + 350;
  const burst7 = await Promise.all([
    (async () => {
      while (Date.now() < target7) await sleep(2);
      return call(adminSession, "g3-remove-during-attach", "DELETE", `/api/v1/document-requirements/${req7}`);
    })(),
    (async () => {
      while (Date.now() < target7) await sleep(2);
      return call(uploader.session, "g3-attach-during-remove", "POST", `/api/v1/document-requirements/${req7}/versions`, {
        body: { r2Key: session7, originalName: "version.pdf", contentType: "application/pdf", byteSize: 12 },
      });
    })(),
  ]);
  const requirementExists = sql(`SELECT COUNT(*) AS n FROM operation_document_requirements WHERE id = ${sqlString(req7)}`).rows?.[0]?.n;
  const orphanVersions = sql(`SELECT COUNT(*) AS n FROM document_versions WHERE requirement_id = ${sqlString(req7)}`).rows?.[0]?.n;
  result.g3RemoveRace = {
    statuses: burst7.map((item) => item.status),
    codes: burst7.map((item) => item.json?.error?.code ?? null),
    requirementExists: Number(requirementExists ?? 0),
    versions: Number(orphanVersions ?? 0),
  };
  assertion("g3-remove-race-no-5xx", burst7.every((item) => item.status < 500), JSON.stringify(burst7.map((item) => item.status)));
  assertion(
    "g3-remove-race-consistent",
    (Number(requirementExists) === 0 && Number(orphanVersions) === 0) || (Number(requirementExists) === 1 && Number(orphanVersions) === 1),
    JSON.stringify(result.g3RemoveRace),
  );

  // --- GAP-10: idempotency witness survives user deletion? --------------
  const witnessUser = await createUser(adminSession, ["operations_manager"], "g3-witness");
  const witnessKey = `w1f-gap10-${randomBytes(8).toString("hex")}`;
  const witnessRequirement = await call(witnessUser.session, "g3-witness-effect", "POST", `/api/v1/export-cases/${caseId}/document-requirements`, {
    body: { documentTypeId: "dt-tc", required: false },
    headers: { "idempotency-key": witnessKey },
  });
  const witnessBefore = sql(`SELECT COUNT(*) AS n FROM idempotency_keys WHERE actor_id = '${witnessUser.id}'`).rows?.[0]?.n;
  const deleteUser = sql(`DELETE FROM user WHERE id = '${witnessUser.id}';`);
  const witnessAfter = sql(`SELECT COUNT(*) AS n FROM idempotency_keys WHERE actor_id = '${witnessUser.id}'`).rows?.[0]?.n;
  const userGone = sql(`SELECT COUNT(*) AS n FROM user WHERE id = '${witnessUser.id}'`).rows?.[0]?.n;
  const supportedDeleteRoutes = readFileSync(path.join(projectRoot, "server", "http", "app.ts"), "utf8").match(/api\.delete\(\s*"\/users/g) ?? [];
  result.gap10 = {
    witnessStatus: witnessRequirement.status,
    witnessBefore: Number(witnessBefore ?? 0),
    witnessAfterOutOfBandUserDelete: Number(witnessAfter ?? 0),
    userRowAfterDelete: Number(userGone ?? 0),
    supportedUserDeleteRoutes: supportedDeleteRoutes.length,
    deleteExit: deleteUser.exit,
    deleteStderr: String(deleteUser.stderr ?? "").slice(-300),
  };
  assertion("gap10-witness-created", witnessRequirement.status === 201 && Number(witnessBefore ?? 0) === 1, JSON.stringify(result.gap10));
  assertion("gap10-out-of-band-user-delete-succeeds", Number(userGone ?? 0) === 0, `deleteExit=${deleteUser.exit}`);
  assertion("gap10-cascade-erases-witness", Number(witnessAfter ?? 0) === 0, `after=${witnessAfter}`);
  assertion("gap10-no-supported-delete-route", supportedDeleteRoutes.length === 0, `routes=${supportedDeleteRoutes.length}`);
}

/* ------------------------------------------------------------------------- */
/* G1-PROOF — production SQL truth table, atomic UPDATE, stale-actor bypass  */
/* ------------------------------------------------------------------------- */
async function runG1Proof({
  call,
  sql,
  sqlFile,
  createUser,
  userRow,
  assertion,
  result,
  scenario,
  adminSession,
  adminId,
  probe,
  probeRootIds,
  probeRootCount,
  probeRootFlags,
  runRoot,
}) {
  const code = (response) => response.json?.error?.code ?? null;
  const seed = (label, text) => {
    const file = path.join(runRoot, `proof-${label}.sql`);
    writeFileSync(file, `${text}\n`);
    const out = sqlFile(file, `proof-${label}`);
    if (out.exit !== 0) throw new Error(`PROOF_SEED_FAILED:${label}:${out.stderr.slice(-500)}`);
  };
  const userInsert = ({ id, label, active }) => {
    const at = Date.now();
    return `INSERT INTO user (id, name, email, email_verified, created_at, updated_at, must_change_password, is_active, disabled_at)
      VALUES (${sqlString(id)}, ${sqlString(label)}, ${sqlString(`${id}@example.invalid`)}, 1, ${at}, ${at}, 0, ${active ? 1 : 0}, ${active ? "NULL" : at});`;
  };
  const roleInsert = (id, roleId) =>
    `INSERT INTO user_roles (user_id, role_id) VALUES (${sqlString(id)}, ${sqlString(roleId)});`;
  const overrideInsert = (id, key, effect) =>
    `INSERT INTO user_permission_overrides (user_id, permission_key, effect) VALUES (${sqlString(id)}, ${sqlString(key)}, ${sqlString(effect)});`;
  const flagsOf = async (label, ids) => probeRootFlags(label, ids);
  const rootFlag = async (label, id) => Number((await flagsOf(label, [id]))[id] ?? 0);
  const rolesOf = (id) =>
    sql(`SELECT role_id FROM user_roles WHERE user_id = ${sqlString(id)} ORDER BY role_id`).rows ?? [];
  const overridesOf = (id) =>
    sql(`SELECT permission_key, effect FROM user_permission_overrides WHERE user_id = ${sqlString(id)} ORDER BY permission_key`).rows ?? [];

  /* --- 10+ case truth table against the real production definition -------- */
  if (scenario === "truth") {
    const sqlProbe = await probe("proof-root-sql", "/__w1/root-sql");
    const compact = String(sqlProbe.sql ?? "").replace(/\s+/g, " ").trim();
    const grantExists = (compact.match(/EXISTS \(SELECT 1 FROM \(/g) ?? []).length;
    const notExists = (compact.match(/NOT EXISTS \(/g) ?? []).length;
    const unions = (compact.match(/UNION/g) ?? []).length;
    result.rootSqlProof = {
      compact,
      grantExists,
      notExists,
      unions,
      startsWithParen: compact.startsWith("(u.is_active = 1 AND "),
      endsWithParen: compact.endsWith(")"),
      containsOr: compact.includes(" OR "),
    };
    assertion(
      "proof-sql-top-level-is-and-only",
      compact.startsWith("(u.is_active = 1 AND ") &&
        compact.endsWith(")") &&
        !compact.includes(" OR ") &&
        grantExists === 2 &&
        notExists === 2 &&
        unions === 2,
      JSON.stringify(result.rootSqlProof),
    );

    // Each row is a real user in the real D1 schema. GRANT and DENY cannot
    // coexist for the same permission key (primary key), so rows that set both
    // bits use GRANT on one root permission and DENY on the other; the notes
    // state exactly which key carries which effect.
    const truthCases = [
      { id: "w1-truth-01", role: false, grantUsers: false, grantRoles: false, denyUsers: false, denyRoles: false, active: true, expected: 0, note: "ROLE=0 GRANT=0 DENY=0 ACTIVE=1" },
      { id: "w1-truth-02", role: true, grantUsers: false, grantRoles: false, denyUsers: false, denyRoles: false, active: true, expected: 1, note: "ROLE=1 GRANT=0 DENY=0 ACTIVE=1" },
      { id: "w1-truth-03", role: false, grantUsers: true, grantRoles: true, denyUsers: false, denyRoles: false, active: true, expected: 1, note: "ROLE=0 GRANT=1 (both keys) DENY=0 ACTIVE=1" },
      { id: "w1-truth-04", role: true, grantUsers: true, grantRoles: true, denyUsers: false, denyRoles: false, active: true, expected: 1, note: "ROLE=1 GRANT=1 (redundant) DENY=0 ACTIVE=1" },
      { id: "w1-truth-05", role: true, grantUsers: false, grantRoles: false, denyUsers: true, denyRoles: false, active: true, expected: 0, note: "ROLE=1 DENY users.manage ACTIVE=1" },
      { id: "w1-truth-06", role: false, grantUsers: true, grantRoles: false, denyUsers: false, denyRoles: true, active: true, expected: 0, note: "GRANT users.manage, DENY roles.manage ACTIVE=1" },
      { id: "w1-truth-07", role: true, grantUsers: false, grantRoles: false, denyUsers: false, denyRoles: false, active: false, expected: 0, note: "ROLE=1 GRANT=0 DENY=0 ACTIVE=0" },
      { id: "w1-truth-08", role: false, grantUsers: true, grantRoles: true, denyUsers: false, denyRoles: false, active: false, expected: 0, note: "ROLE=0 GRANT=1 DENY=0 ACTIVE=0" },
      { id: "w1-truth-09", role: true, grantUsers: true, grantRoles: false, denyUsers: false, denyRoles: true, active: false, expected: 0, note: "ROLE=1 GRANT users.manage, DENY roles.manage ACTIVE=0" },
      { id: "w1-truth-10", role: false, grantUsers: false, grantRoles: false, denyUsers: true, denyRoles: false, active: true, expected: 0, note: "ROLE=0 GRANT=0 DENY users.manage ACTIVE=1" },
      { id: "w1-truth-11", role: true, grantUsers: false, grantRoles: false, denyUsers: false, denyRoles: true, active: true, expected: 0, note: "ROLE=1 DENY roles.manage ACTIVE=1 (extra)" },
      { id: "w1-truth-12", role: false, grantUsers: true, grantRoles: false, denyUsers: false, denyRoles: false, active: true, expected: 0, note: "GRANT users.manage only ACTIVE=1 (extra, missing roles.manage)" },
      { id: "w1-truth-13", role: true, grantUsers: true, grantRoles: false, denyUsers: false, denyRoles: true, active: true, expected: 0, note: "ROLE=1 GRANT users.manage, DENY roles.manage ACTIVE=1 (extra)" },
    ];
    let text = "";
    for (const item of truthCases) {
      text += userInsert({ id: item.id, label: `Truth ${item.id}`, active: item.active });
      if (item.role) text += roleInsert(item.id, "role-admin");
      if (item.grantUsers) text += overrideInsert(item.id, "users.manage", "GRANT");
      if (item.grantRoles) text += overrideInsert(item.id, "roles.manage", "GRANT");
      if (item.denyUsers) text += overrideInsert(item.id, "users.manage", "DENY");
      if (item.denyRoles) text += overrideInsert(item.id, "roles.manage", "DENY");
    }
    seed("truth-table", text);

    const flags = await flagsOf("proof-truth-flags", truthCases.map((item) => item.id));
    const rows = truthCases.map((item) => {
      const actual = Number(flags[item.id] ?? -1);
      return { ...item, actual, pass: actual === item.expected };
    });
    result.truthTable = rows;
    for (const row of rows) {
      assertion(
        `truth-${row.id}-${row.expected === 1 ? "root" : "not-root"}`,
        row.pass,
        `actual=${row.actual} expected=${row.expected} note=${row.note}`,
      );
    }

    const rootIds = await probeRootIds("proof-truth-root-ids");
    const expectedRootIds = [adminId, ...truthCases.filter((item) => item.expected === 1).map((item) => item.id)].sort();
    const actualRootIds = [...rootIds].sort();
    const count = await probeRootCount("proof-truth-root-count");
    result.truthRoots = { expectedRootIds, actualRootIds, count };
    assertion(
      "proof-truth-root-set",
      JSON.stringify(actualRootIds) === JSON.stringify(expectedRootIds),
      JSON.stringify(result.truthRoots),
    );
    assertion("proof-truth-count", count === expectedRootIds.length, `count=${count} expected=${expectedRootIds.length}`);
    return;
  }

  /* --- atomic UPDATE through the real API --------------------------------- */
  if (scenario === "atomic") {
    const baselineIds = await probeRootIds("proof-atomic-baseline-ids");
    assertion(
      "proof-atomic-baseline-single-root",
      baselineIds.length === 1 && baselineIds[0] === adminId,
      JSON.stringify(baselineIds),
    );
    const lastRoot = await call(adminSession, "proof-atomic-last-root-self-disable", "POST", `/api/v1/users/${adminId}/active`, {
      body: { active: false },
    });
    const afterLast = await probeRootCount("proof-atomic-last-root-count");
    result.atomicLastRoot = { status: lastRoot.status, code: code(lastRoot), rootsAfter: afterLast };
    assertion(
      "proof-atomic-last-root-refused",
      lastRoot.status === 409 && code(lastRoot) === "LAST_ADMIN" && afterLast === 1,
      JSON.stringify(result.atomicLastRoot),
    );

    const grant = "w1-atomic-grant";
    const deny = "w1-atomic-deny";
    const inactive = "w1-atomic-inactive";
    seed(
      "atomic-users",
      userInsert({ id: grant, label: "Atomic grant", active: true }) +
        overrideInsert(grant, "users.manage", "GRANT") +
        overrideInsert(grant, "roles.manage", "GRANT") +
        userInsert({ id: deny, label: "Atomic deny", active: true }) +
        roleInsert(deny, "role-admin") +
        overrideInsert(deny, "users.manage", "DENY") +
        userInsert({ id: inactive, label: "Atomic inactive", active: false }) +
        roleInsert(inactive, "role-admin"),
    );
    const before = await flagsOf("proof-atomic-before-flags", [grant, deny, inactive]);
    const countBefore = await probeRootCount("proof-atomic-before-count");
    result.atomicBefore = { flags: before, count: countBefore };
    assertion(
      "proof-atomic-seed-states",
      Number(before[grant]) === 1 && Number(before[deny]) === 0 && Number(before[inactive]) === 0 && countBefore === 2,
      JSON.stringify(result.atomicBefore),
    );

    const deactivateGrant = await call(adminSession, "proof-atomic-deactivate-grant-root", "POST", `/api/v1/users/${grant}/active`, {
      body: { active: false },
    });
    const afterGrant = await probeRootCount("proof-atomic-after-grant");
    const grantRow = userRow(grant);
    result.atomicGrant = { status: deactivateGrant.status, roots: afterGrant, active: grantRow?.is_active ?? null };
    assertion(
      "proof-atomic-deactivate-grant-root-allowed",
      deactivateGrant.status === 200 && afterGrant === 1 && Number(grantRow?.is_active) === 0,
      JSON.stringify(result.atomicGrant),
    );

    const deactivateDeny = await call(adminSession, "proof-atomic-deactivate-deny-target", "POST", `/api/v1/users/${deny}/active`, {
      body: { active: false },
    });
    const afterDeny = await probeRootCount("proof-atomic-after-deny");
    const denyRow = userRow(deny);
    result.atomicDeny = { status: deactivateDeny.status, roots: afterDeny, active: denyRow?.is_active ?? null };
    assertion(
      "proof-atomic-deactivate-nonroot-allowed",
      deactivateDeny.status === 200 && afterDeny === 1 && Number(denyRow?.is_active) === 0,
      JSON.stringify(result.atomicDeny),
    );

    const activateInactive = await call(adminSession, "proof-atomic-activate-inactive-root", "POST", `/api/v1/users/${inactive}/active`, {
      body: { active: true },
    });
    const afterActivate = await probeRootCount("proof-atomic-after-activate");
    const inactiveFlags = await flagsOf("proof-atomic-inactive-flags", [inactive]);
    const inactiveRow = userRow(inactive);
    result.atomicActivate = {
      status: activateInactive.status,
      roots: afterActivate,
      active: inactiveRow?.is_active ?? null,
      flags: inactiveFlags,
    };
    assertion(
      "proof-atomic-activate-inactive-root-allowed",
      activateInactive.status === 200 &&
        afterActivate === 2 &&
        Number(inactiveRow?.is_active) === 1 &&
        Number(inactiveFlags[inactive]) === 1,
      JSON.stringify(result.atomicActivate),
    );

    const deactivateAgain = await call(adminSession, "proof-atomic-deactivate-inactive-again", "POST", `/api/v1/users/${inactive}/active`, {
      body: { active: false },
    });
    const afterAgain = await probeRootCount("proof-atomic-after-again");
    result.atomicDeactivateAgain = { status: deactivateAgain.status, roots: afterAgain };
    assertion(
      "proof-atomic-deactivate-again-allowed",
      deactivateAgain.status === 200 && afterAgain === 1,
      JSON.stringify(result.atomicDeactivateAgain),
    );
    return;
  }

  /* --- stale actor: authorization read before a concurrent DENY ----------- */
  const a = await createUser(adminSession, ["administrator"], `proof-a-${scenario}`);
  const b = await createUser(adminSession, ["administrator"], `proof-b-${scenario}`);
  const rootsBefore = await probeRootIds("proof-stale-roots-before");
  assertion(
    `${scenario}-two-roots-before`,
    rootsBefore.includes(a.id) && rootsBefore.includes(b.id) && rootsBefore.includes(adminId),
    JSON.stringify(rootsBefore),
  );

  const denyActor = async () => {
    const denied = await call(b.session, `${scenario}-deny-a`, "POST", `/api/v1/users/${a.id}/overrides`, {
      body: { overrides: [{ permissionKey: "users.manage", effect: "DENY" }] },
    });
    assertion(`${scenario}-deny-applied`, denied.status === 200, `status=${denied.status} code=${code(denied)}`);
    return denied;
  };
  const actorRootAfter = async () => rootFlag(`${scenario}-actor-root`, a.id);

  if (scenario === "stale-roles") {
    const target = "w1-proof-d";
    seed("stale-roles-target", userInsert({ id: target, label: "Stale roles target", active: true }) + roleInsert(target, "role-officer"));
    const pending = call(a.session, "stale-roles-grant-root", "POST", `/api/v1/users/${target}/roles`, {
      body: { roleKeys: ["administrator"] },
    });
    await sleep(400);
    await denyActor();
    const response = await pending;
    const targetFlag = await rootFlag("stale-roles-target-root", target);
    const targetRoles = rolesOf(target).map((row) => row.role_id);
    result.stale = {
      scenario,
      status: response.status,
      code: code(response),
      actorRoot: await actorRootAfter(),
      targetRoot: targetFlag,
      targetRoles,
    };
    assertion(`${scenario}-actor-lost-root`, result.stale.actorRoot === 0, JSON.stringify(result.stale));
    assertion(`${scenario}-write-refused`, response.status === 403, JSON.stringify(result.stale));
    assertion(
      `${scenario}-target-unchanged`,
      targetFlag === 0 && !targetRoles.includes("role-admin") && targetRoles.includes("role-officer"),
      JSON.stringify(result.stale),
    );
    return;
  }

  if (scenario === "stale-overrides") {
    const target = "w1-proof-d";
    seed("stale-overrides-target", userInsert({ id: target, label: "Stale overrides target", active: true }));
    const pending = call(a.session, "stale-overrides-grant-root", "POST", `/api/v1/users/${target}/overrides`, {
      body: {
        overrides: [
          { permissionKey: "users.manage", effect: "GRANT" },
          { permissionKey: "roles.manage", effect: "GRANT" },
        ],
      },
    });
    await sleep(400);
    await denyActor();
    const response = await pending;
    const targetFlag = await rootFlag("stale-overrides-target-root", target);
    const targetOverrides = overridesOf(target);
    result.stale = {
      scenario,
      status: response.status,
      code: code(response),
      actorRoot: await actorRootAfter(),
      targetRoot: targetFlag,
      targetOverrides,
    };
    assertion(`${scenario}-actor-lost-root`, result.stale.actorRoot === 0, JSON.stringify(result.stale));
    assertion(`${scenario}-write-refused`, response.status === 403, JSON.stringify(result.stale));
    assertion(
      `${scenario}-target-unchanged`,
      targetFlag === 0 && targetOverrides.length === 0,
      JSON.stringify(result.stale),
    );
    return;
  }

  if (scenario === "stale-active") {
    const target = "w1-proof-e";
    seed(
      "stale-active-target",
      userInsert({ id: target, label: "Stale active target", active: false }) + roleInsert(target, "role-admin"),
    );
    const pending = call(a.session, "stale-active-reactivate-root", "POST", `/api/v1/users/${target}/active`, {
      body: { active: true },
    });
    await sleep(400);
    await denyActor();
    const response = await pending;
    const targetFlag = await rootFlag("stale-active-target-root", target);
    const targetRow = userRow(target);
    result.stale = {
      scenario,
      status: response.status,
      code: code(response),
      actorRoot: await actorRootAfter(),
      targetRoot: targetFlag,
      targetActive: targetRow?.is_active ?? null,
    };
    assertion(`${scenario}-actor-lost-root`, result.stale.actorRoot === 0, JSON.stringify(result.stale));
    assertion(`${scenario}-write-refused`, response.status === 403, JSON.stringify(result.stale));
    assertion(
      `${scenario}-target-unchanged`,
      targetFlag === 0 && Number(targetRow?.is_active) === 0,
      JSON.stringify(result.stale),
    );
    return;
  }

  if (scenario === "stale-roleperm") {
    const roleId = "role-viewer";
    const pending = call(a.session, "stale-roleperm-elevate-role", "PUT", `/api/v1/roles/${roleId}/permissions`, {
      body: { permissions: ["dashboard.view", "users.manage", "roles.manage"] },
    });
    await sleep(400);
    await denyActor();
    const response = await pending;
    const permissions = (sql(`SELECT permission_key FROM role_permissions WHERE role_id = ${sqlString(roleId)} ORDER BY permission_key`).rows ?? []).map(
      (row) => row.permission_key,
    );
    result.stale = {
      scenario,
      status: response.status,
      code: code(response),
      actorRoot: await actorRootAfter(),
      permissions,
    };
    assertion(`${scenario}-actor-lost-root`, result.stale.actorRoot === 0, JSON.stringify(result.stale));
    assertion(`${scenario}-write-refused`, response.status === 403, JSON.stringify(result.stale));
    assertion(
      `${scenario}-role-unchanged`,
      !permissions.includes("users.manage") && !permissions.includes("roles.manage"),
      JSON.stringify(result.stale),
    );
    return;
  }

  if (scenario === "stale-create-user") {
    const email = `w1f.stale.create.${randomBytes(6).toString("hex")}@example.invalid`;
    const pending = call(a.session, "stale-create-user", "POST", "/api/v1/users", {
      body: {
        email,
        password: `W1f-Stale-${randomBytes(9).toString("base64url")}`,
        name: "Stale Create",
        roleKeys: ["export_officer"],
      },
    });
    await sleep(400);
    await denyActor();
    const response = await pending;
    const userCount = Number(
      sql(`SELECT COUNT(*) AS n FROM user WHERE lower(email) = lower(${sqlString(email)})`).rows?.[0]?.n ?? -1,
    );
    const accountCount = Number(
      sql(`SELECT COUNT(*) AS n FROM account a JOIN user u ON u.id = a.user_id WHERE lower(u.email) = lower(${sqlString(email)})`)
        .rows?.[0]?.n ?? -1,
    );
    result.stale = {
      scenario,
      status: response.status,
      code: code(response),
      actorRoot: await actorRootAfter(),
      userCount,
      accountCount,
    };
    assertion(`${scenario}-actor-lost-root`, result.stale.actorRoot === 0, JSON.stringify(result.stale));
    assertion(`${scenario}-write-refused`, response.status === 403, JSON.stringify(result.stale));
    assertion(
      `${scenario}-no-half-user`,
      userCount === 0 && accountCount === 0,
      JSON.stringify(result.stale),
    );
    return;
  }

  if (scenario === "stale-create-role") {
    const roleKey = "proof_stale_role";
    const pending = call(a.session, "stale-create-role", "POST", "/api/v1/roles", {
      body: { key: roleKey, nameEn: "Proof Stale", nameAr: "Proof Stale", permissions: ["dashboard.view"] },
    });
    await sleep(400);
    await denyActor();
    const response = await pending;
    const roleRow = sql(`SELECT id FROM roles WHERE key = ${sqlString(roleKey)}`).rows?.[0] ?? null;
    const permissions = roleRow
      ? (sql(`SELECT permission_key FROM role_permissions WHERE role_id = ${sqlString(roleRow.id)}`).rows ?? []).map(
          (row) => row.permission_key,
        )
      : [];
    result.stale = {
      scenario,
      status: response.status,
      code: code(response),
      actorRoot: await actorRootAfter(),
      roleExists: Boolean(roleRow),
      permissions,
    };
    assertion(`${scenario}-actor-lost-root`, result.stale.actorRoot === 0, JSON.stringify(result.stale));
    assertion(`${scenario}-write-refused`, response.status === 403, JSON.stringify(result.stale));
    assertion(`${scenario}-no-half-role`, !roleRow && permissions.length === 0, JSON.stringify(result.stale));
    return;
  }

  throw new Error(`G1PROOF_SCENARIO_UNHANDLED:${scenario}`);
}

main().then(
  (result) => {
    console.log(
      JSON.stringify(
        {
          mode: result?.mode,
          outcome: result?.outcome,
          failed: (result?.checks ?? []).filter((item) => !item.ok),
          checks: (result?.checks ?? []).length,
        },
        null,
        2,
      ),
    );
    process.exitCode = result?.outcome === "PASS" ? 0 : 1;
  },
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
