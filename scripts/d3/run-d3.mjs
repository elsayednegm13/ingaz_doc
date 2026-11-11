#!/usr/bin/env node
/**
 * W1-CLOSE / A1 — D-3 real-path runner.
 *
 * Runs the REAL Worker runtime (workerd via `wrangler dev`), the REAL Hono app,
 * REAL Better Auth and a fresh synthetic D1 database. The only fault injection
 * is a test-only Worker entry (`tests/w1/d3-worker.ts`) selected by a Worker
 * var inside this run's generated config. No production file, public endpoint,
 * header, cookie or request body can enable it.
 *
 * Each invocation owns one fresh `.wrangler-safety-20261021-*` root, one port,
 * one D1 store and one evidence directory. The server is stopped with
 * `taskkill /T` on the owned PID only, then the D1 rows are read back with the
 * same generated config.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertIsolatedPersist } from "../isolation-guard.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const wranglerBin = path.join(projectRoot, "node_modules/wrangler/bin/wrangler.js");

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

const MODES = {
  control: "CONTROL",
  r1: "LINK_FAIL",
  r2: "COMPENSATION_FAIL",
  r3: "INCIDENT_FAIL",
};

const FAIL_EMAILS = {
  control: "",
  r1: "d3.fail.r1@example.invalid",
  r2: "d3.fail.r2@example.invalid",
  r3: "d3.fail.r3@example.invalid",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const out = { scenario: "", runRoot: "", evidence: "", port: "" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--scenario") out.scenario = argv[++i];
    else if (argv[i] === "--run-root") out.runRoot = argv[++i];
    else if (argv[i] === "--evidence") out.evidence = argv[++i];
    else if (argv[i] === "--port") out.port = argv[++i];
  }
  if (!(out.scenario in MODES)) throw new Error("SCENARIO_INVALID");
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
  // `wrangler dev` loads secrets from `<configDir>/.dev.vars`; it does not
  // select a CLOUDFLARE_ENV suffix unless `--env` is passed. The config and
  // cwd are both inside the run root, so this resolves to the synthetic file
  // written below and can never reach the project-root `.dev.vars`.
  env.TMP = path.join(runRoot, "tmp");
  env.TEMP = env.TMP;
  return env;
}

function generatedConfig({ mode, failEmail }) {
  return {
    name: "exportflow-d3",
    compatibility_date: "2026-10-11",
    compatibility_flags: ["nodejs_compat"],
    main: path.resolve(projectRoot, "tests", "w1", "d3-worker.ts"),
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
      D3_MODE: mode,
      D3_FAIL_EMAIL: failEmail,
    },
  };
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scenario = args.scenario;
  const mode = MODES[scenario];
  const failEmail = FAIL_EMAILS[scenario];
  const port = Number(args.port);
  const base = `http://127.0.0.1:${port}`;

  const runRoot = assertIsolatedPersist(args.runRoot, { root: projectRoot });
  mkdirSync(runRoot, { recursive: true });
  if (readdirSync(runRoot).length > 0) throw new Error("RUN_ROOT_NOT_FRESH");
  const persist = assertIsolatedPersist(path.join(runRoot, "state"), { root: projectRoot });
  const evidence = path.resolve(args.evidence);
  mkdirSync(evidence, { recursive: true });
  mkdirSync(path.join(runRoot, "tmp"), { recursive: true });

  const configPath = path.join(runRoot, "wrangler.d3.generated.jsonc");
  assertIsolatedPersist(configPath, { root: projectRoot });
  const devVarsPath = path.join(runRoot, ".dev.vars");
  assertIsolatedPersist(devVarsPath, { root: projectRoot });

  const bootstrapSecret = randomBytes(24).toString("base64url");
  const authSecret = randomBytes(32).toString("base64url");
  const admin = {
    email: "d3-admin@example.invalid",
    password: `D3-Admin-${randomBytes(12).toString("base64url")}`,
    newPassword: `D3-Admin2-${randomBytes(12).toString("base64url")}`,
    bootstrapSecret,
    base,
  };
  const userPassword = `D3-User-${randomBytes(12).toString("base64url")}`;

  const config = generatedConfig({ mode, failEmail });
  if (path.resolve(config.main) !== path.resolve(projectRoot, "tests", "w1", "d3-worker.ts")) {
    throw new Error("HARNESS_ENTRY_MISMATCH");
  }
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  writeFileSync(devVarsPath, `BETTER_AUTH_SECRET=${authSecret}\nBETTER_AUTH_URL=${base}\nBOOTSTRAP_SECRET=${bootstrapSecret}\n`);
  writeFileSync(path.join(runRoot, "admin.json"), JSON.stringify(admin, null, 2));
  writeFileSync(
    path.join(runRoot, "run.json"),
    JSON.stringify({ runRoot, persist, port, scenario, mode, configPath, createdAt: new Date().toISOString() }, null, 2),
  );

  const env = childEnv(runRoot);
  const commandLine = [
    "node",
    "scripts/d3/run-d3.mjs",
    "--scenario",
    scenario,
    "--run-root",
    runRoot,
    "--evidence",
    evidence,
    "--port",
    String(port),
  ].join(" ");
  writeFileSync(path.join(evidence, "command.txt"), `${commandLine}\n`);

  const result = {
    scenario,
    mode,
    failEmail: failEmail || null,
    runRoot,
    evidence,
    port,
    startedAt: new Date().toISOString(),
    negativeProof: {
      productionEntry: "worker/index.ts",
      productionEntryContainsBareCreateApp: readFileSync(path.join(projectRoot, "worker", "index.ts"), "utf8").includes("const app = createApp();"),
      productionConfigMain: JSON.parse(readFileSync(path.join(projectRoot, "wrangler.jsonc"), "utf8")).main,
      harnessEntry: "tests/w1/d3-worker.ts",
      harnessEntryReferencedByLauncher: true,
      modeSource: "Worker var in run-owned generated config",
      clientCanSelectMode: false,
    },
    startup: null,
    http: [],
    acl: null,
    leakScan: null,
    db: null,
    cleanup: null,
    assertions: [],
    outcome: "FAIL",
  };
  const assertion = (name, ok, detail = "") => {
    result.assertions.push({ name, ok: Boolean(ok), detail });
  };
  const save = () => writeFileSync(path.join(evidence, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  save();

  // --- 1. Migrations on the fresh synthetic store --------------------------
  const migrate = spawnSync(
    process.execPath,
    [wranglerBin, "d1", "migrations", "apply", "exportflow-local", "--local", "--persist-to", persist, "--config", configPath],
    { cwd: runRoot, env, encoding: "utf8", timeout: 180_000 },
  );
  writeFileSync(path.join(evidence, "migrate.log"), `EXIT=${migrate.status}\n--- stdout ---\n${migrate.stdout}\n--- stderr ---\n${migrate.stderr}\n`);
  if (migrate.status !== 0) {
    result.migrate = { exit: migrate.status, stderr: migrate.stderr.slice(-2000) };
    save();
    throw new Error(`MIGRATE_FAILED:${migrate.status}`);
  }
  result.migrate = { exit: 0 };

  // --- 2. Real workerd server ---------------------------------------------
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

  let cookie = "";
  const call = async (label, method, url, { body, headers = {}, useCookie = true } = {}) => {
    const requestHeaders = { origin: base, ...headers };
    if (body !== undefined) requestHeaders["content-type"] = "application/json";
    if (useCookie && cookie) requestHeaders.cookie = cookie;
    const started = Date.now();
    let response;
    let text = "";
    let error = null;
    try {
      response = await fetch(`${base}${url}`, {
        method,
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "manual",
        signal: AbortSignal.timeout(45_000),
      });
      text = await response.text();
      const setCookie = response.headers.getSetCookie?.() ?? [];
      if (setCookie.length) cookie = setCookie.map((value) => value.split(";")[0]).join("; ");
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }
    const elapsedMs = Date.now() - started;
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    const entry = {
      label,
      method,
      path: url,
      status: response?.status ?? 0,
      requestId: response?.headers.get("x-request-id") ?? null,
      elapsedMs,
      bodySha256: sha256(text),
      bodyBytes: Buffer.byteLength(text),
      body: text.slice(0, 4000),
      error,
    };
    result.http.push(entry);
    save();
    return { ...entry, json, text, headers: response?.headers };
  };

  try {
    const startedAt = Date.now();
    let attempts = 0;
    let health = null;
    let firstAttempt = null;
    while (Date.now() - startedAt < 180_000) {
      if (server.exitCode !== null) break;
      attempts += 1;
      try {
        const response = await fetch(`${base}/api/v1/health`, { signal: AbortSignal.timeout(5000) });
        const text = await response.text();
        health = { status: response.status, body: text.slice(0, 2000), attempts, elapsedMs: Date.now() - startedAt };
        if (response.status === 200) break;
      } catch (caught) {
        health = {
          status: 0,
          error: caught instanceof Error ? caught.message : String(caught),
          attempts,
          elapsedMs: Date.now() - startedAt,
        };
      }
      if (!firstAttempt) firstAttempt = { ...health };
      await sleep(750);
    }
    result.startup = { health, firstAttempt, serverExitCode: server.exitCode };
    save();
    assertion("health", health?.status === 200, `status=${health?.status ?? 0} attempts=${attempts}`);
    if (health?.status !== 200) throw new Error("HEALTH_FAILED");

    const bootStatus = await call("bootstrap-status", "GET", "/api/v1/auth/bootstrap-status", { useCookie: false });
    assertion("bootstrap-required", bootStatus.status === 200 && bootStatus.json?.data?.required === true, `status=${bootStatus.status}`);

    const bootstrap = await call("bootstrap", "POST", "/api/v1/auth/bootstrap", {
      body: { email: admin.email, password: admin.password, name: "D3 Admin" },
      headers: { "x-bootstrap-secret": admin.bootstrapSecret },
      useCookie: false,
    });
    assertion("bootstrap", bootstrap.status === 201, `status=${bootstrap.status}`);

    const signin = await call("sign-in", "POST", "/api/auth/sign-in/email", {
      body: { email: admin.email, password: admin.password },
      useCookie: false,
    });
    assertion("sign-in", signin.status === 200, `status=${signin.status}`);

    const me = await call("me-temporary-password", "GET", "/api/v1/me");
    assertion(
      "temporary-password-gate",
      me.status === 200 && me.json?.data?.mustChangePassword === true,
      `status=${me.status} mustChange=${me.json?.data?.mustChangePassword}`,
    );

    const changed = await call("change-password", "POST", "/api/v1/me/password", {
      body: { currentPassword: admin.password, newPassword: admin.newPassword },
    });
    assertion("change-password", changed.status === 200, `status=${changed.status}`);

    const resignin = await call("sign-in-new-password", "POST", "/api/auth/sign-in/email", {
      body: { email: admin.email, password: admin.newPassword },
      useCookie: false,
    });
    assertion("sign-in-new-password", resignin.status === 200, `status=${resignin.status}`);

    const me2 = await call("me-ready", "GET", "/api/v1/me");
    assertion("me-ready", me2.status === 200 && me2.json?.data?.mustChangePassword === false, `status=${me2.status}`);

    const usersBefore = await call("users-before", "GET", "/api/v1/users");
    assertion("users-before", usersBefore.status === 200, `status=${usersBefore.status}`);

    const createEmail = scenario === "control" ? "d3.control@example.invalid" : failEmail;
    const create = await call("create-user", "POST", "/api/v1/users", {
      body: { email: createEmail, password: userPassword, name: "D3 Target", roleKeys: ["export_officer"] },
    });

    const errorCode = create.json?.error?.code ?? null;
    const reference = create.json?.error?.fieldErrors?.reference ?? null;
    const errorRequestId = create.json?.error?.requestId ?? null;
    result.createUser = {
      email: createEmail,
      status: create.status,
      errorCode,
      reference,
      errorRequestId,
      responseRequestIdHeader: create.requestId,
    };

    if (scenario === "control") {
      assertion("create-control-201", create.status === 201, `status=${create.status}`);
      assertion("create-control-id", Boolean(create.json?.data?.id), `idPresent=${Boolean(create.json?.data?.id)}`);
    } else if (scenario === "r1") {
      assertion("r1-status-500", create.status === 500, `status=${create.status}`);
      assertion("r1-generic-code", errorCode === "SERVER_TEMPORARILY_UNAVAILABLE", `code=${errorCode}`);
      assertion("r1-no-recovery-code", errorCode !== "USER_RECOVERY_REQUIRED", `code=${errorCode}`);
    } else {
      assertion("recovery-status-500", create.status === 500, `status=${create.status}`);
      assertion("recovery-code", errorCode === "USER_RECOVERY_REQUIRED", `code=${errorCode}`);
      assertion("recovery-reference", typeof reference === "string" && reference.length > 0, `referencePresent=${Boolean(reference)}`);
      // Error responses carry the request id in the JSON body. The middleware's
      // x-request-id header is not present on a replacement error Response; that
      // is recorded as an observation, not treated as a missing request id.
      assertion("error-request-id", Boolean(errorRequestId), `body=${errorRequestId} header=${create.requestId}`);
    }

    const secrets = [admin.password, admin.newPassword, userPassword, admin.bootstrapSecret, authSecret];
    const leakPattern = /SQLITE_|D1_|CONSTRAINT|TypeError|fetch failed|stack|wrangler|cloudflare-internal|at Object\./i;
    const leakedSecret = secrets.some((secret) => create.text.includes(secret));
    const leakedStack = leakPattern.test(create.text);
    result.leakScan = { leakedSecret, leakedStack, bodySample: create.text.slice(0, 600) };
    assertion("no-secret-leak", !leakedSecret, `leakedSecret=${leakedSecret}`);
    assertion("no-stack-or-sql-leak", !leakedStack, `leakedStack=${leakedStack}`);

    const usersWithSession = await call("acl-users-with-session", "GET", "/api/v1/users");
    const usersWithoutSession = await call("acl-users-without-session", "GET", "/api/v1/users", { useCookie: false });
    const meWithoutSession = await call("acl-me-without-session", "GET", "/api/v1/me", { useCookie: false });
    result.acl = {
      withSession: usersWithSession.status,
      withoutSession: usersWithoutSession.status,
      withoutSessionCode: usersWithoutSession.json?.error?.code ?? null,
      meWithoutSession: meWithoutSession.status,
    };
    assertion("acl-with-session", usersWithSession.status === 200, `status=${usersWithSession.status}`);
    assertion("acl-without-session-401", usersWithoutSession.status === 401, `status=${usersWithoutSession.status}`);
    assertion("me-without-session-401", meWithoutSession.status === 401, `status=${meWithoutSession.status}`);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    // --- 3. Owned-child teardown ------------------------------------------
    let kill = { status: null, stdout: "", stderr: "" };
    if (server.pid) {
      kill = spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { encoding: "utf8" });
    }
    await sleep(2000);
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
      taskkillStdout: String(kill.stdout ?? "").trim().slice(0, 2000),
      taskkillStderr: String(kill.stderr ?? "").trim().slice(0, 2000),
      portClosed,
      processGone,
      tasklistStdout: String(tasklist.stdout ?? "").trim().slice(0, 500),
    };
    writeFileSync(path.join(evidence, "server-stdout.log"), stdout.join(""));
    writeFileSync(path.join(evidence, "server-stderr.log"), stderr.join(""));
    assertion("teardown-port-closed", portClosed, `portClosed=${portClosed}`);
    assertion("teardown-process-gone", processGone, `processGone=${processGone}`);

    // --- 4. D1 read-back with the same generated config -------------------
    const sql = (command) => {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const out = spawnSync(
          process.execPath,
          [
            wranglerBin,
            "d1",
            "execute",
            "exportflow-local",
            "--local",
            "--persist-to",
            persist,
            "--config",
            configPath,
            "--json",
            "--command",
            command,
          ],
          { cwd: runRoot, env, encoding: "utf8", timeout: 120_000 },
        );
        if (out.status === 0) {
          try {
            return { rows: JSON.parse(out.stdout)?.[0]?.results ?? [], exit: 0, attempts: attempt };
          } catch {
            return { rows: [], exit: 0, parseError: out.stdout.slice(0, 500), attempts: attempt };
          }
        }
        if (attempt === 3) return { rows: [], exit: out.status, stderr: out.stderr.slice(-1500), attempts: attempt };
      }
      return { rows: [], exit: -1, attempts: 0 };
    };

    const allUsers = sql("SELECT id, email, is_active, must_change_password FROM user ORDER BY email");
    const accounts = sql("SELECT u.email, COUNT(a.id) AS n FROM user u LEFT JOIN account a ON a.user_id = u.id GROUP BY u.id ORDER BY u.email");
    const roles = sql("SELECT u.email, r.key AS role_key FROM user_roles ur JOIN user u ON u.id = ur.user_id JOIN roles r ON r.id = ur.role_id ORDER BY u.email, r.key");
    const incidents = sql("SELECT correlation_id, operation, stage, residual_user_id, detail, resolved_at FROM auth_compensation_incidents ORDER BY created_at");
    const sessions = sql("SELECT COUNT(*) AS n FROM session");
    result.db = {
      users: allUsers,
      accounts,
      roles,
      incidents,
      sessions,
      raw: {
        users: allUsers.rows,
        accounts: accounts.rows,
        roles: roles.rows,
        incidents: incidents.rows,
        sessions: sessions.rows,
      },
    };
    writeFileSync(path.join(evidence, "db-after.json"), `${JSON.stringify(result.db, null, 2)}\n`);

    const targetUsers = allUsers.rows.filter((row) => row.email === (scenario === "control" ? "d3.control@example.invalid" : failEmail));
    const targetAccounts = accounts.rows.find((row) => row.email === (scenario === "control" ? "d3.control@example.invalid" : failEmail));
    const targetRoles = roles.rows.filter((row) => row.email === (scenario === "control" ? "d3.control@example.invalid" : failEmail));
    const incidentRows = incidents.rows;

    if (scenario === "control") {
      assertion("db-control-user", targetUsers.length === 1, `rows=${targetUsers.length}`);
      assertion("db-control-account", Number(targetAccounts?.n ?? 0) === 1, `accounts=${targetAccounts?.n}`);
      assertion("db-control-role", targetRoles.length === 1 && targetRoles[0].role_key === "export_officer", JSON.stringify(targetRoles));
      assertion("db-control-no-incident", incidentRows.length === 0, `incidents=${incidentRows.length}`);
    } else if (scenario === "r1") {
      assertion("db-r1-user-removed", targetUsers.length === 0, `rows=${targetUsers.length}`);
      assertion("db-r1-account-removed", Number(targetAccounts?.n ?? 0) === 0, `accounts=${targetAccounts?.n}`);
      assertion("db-r1-no-incident", incidentRows.length === 0, `incidents=${incidentRows.length}`);
    } else if (scenario === "r2") {
      assertion("db-r2-residual-user", targetUsers.length === 1, `rows=${targetUsers.length}`);
      assertion("db-r2-no-credential", Number(targetAccounts?.n ?? 0) === 0, `accounts=${targetAccounts?.n}`);
      assertion("db-r2-incident", incidentRows.length === 1, `incidents=${incidentRows.length}`);
      assertion(
        "db-r2-incident-stage",
        incidentRows[0]?.operation === "USER_CREATE" && incidentRows[0]?.stage === "INDUCED_COMPENSATION_FAILURE",
        JSON.stringify(incidentRows[0] ?? null),
      );
      assertion(
        "db-r2-correlation-matches",
        Boolean(result.createUser?.reference) && incidentRows[0]?.correlation_id === result.createUser.reference,
        `db=${incidentRows[0]?.correlation_id} response=${result.createUser?.reference}`,
      );
    } else {
      assertion("db-r3-residual-user", targetUsers.length === 1, `rows=${targetUsers.length}`);
      assertion("db-r3-no-credential", Number(targetAccounts?.n ?? 0) === 0, `accounts=${targetAccounts?.n}`);
      assertion("db-r3-no-incident-row", incidentRows.length === 0, `incidents=${incidentRows.length}`);
      const logs = `${stdout.join("")}\n${stderr.join("")}`;
      assertion(
        "r3-incident-store-log",
        logs.includes("[auth-compensation] incident store unavailable") &&
          Boolean(result.createUser?.reference) &&
          logs.includes(result.createUser.reference),
        "log contains failure marker and correlation id",
      );
    }

    // Admin itself must remain usable after the failure path.
    const adminRow = allUsers.rows.find((row) => row.email === admin.email);
    assertion("admin-intact", Boolean(adminRow) && Number(adminRow?.is_active) === 1, JSON.stringify(adminRow ?? null));
    assertion("migrate-applied", result.migrate?.exit === 0, `exit=${result.migrate?.exit}`);

    result.finishedAt = new Date().toISOString();
    result.outcome = result.assertions.every((item) => item.ok) ? "PASS" : "FAIL";
    save();
  }
  return result;
}

main().then(
  (result) => {
    console.log(
      JSON.stringify(
        {
          scenario: result?.scenario,
          outcome: result?.outcome,
          failed: (result?.assertions ?? []).filter((item) => !item.ok),
          assertions: (result?.assertions ?? []).length,
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
