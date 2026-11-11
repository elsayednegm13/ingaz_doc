#!/usr/bin/env node
/**
 * W1-G2: real Worker / Hono / Better Auth / D1 integration on a fresh run root.
 *
 * The server is started by the M01 launcher (scripts/e2e-server.mjs) so the
 * accepted isolation contract is exercised unchanged: generated run-owned
 * Worker config, synthetic .dev.vars.e2e, sanitized child environment,
 * migrations applied to an owned D1 store, no remote binding.
 *
 * Evidence is captured per request: actor, method, path, HTTP status, body
 * (sanitized) and the D1 delta read back through wrangler with the same
 * generated config.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertIsolatedPersist } from "../isolation-guard.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const wranglerBin = path.join(projectRoot, "node_modules/wrangler/bin/wrangler.js");

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
];

function parseArgs(argv) {
  const out = { runRoot: "", evidence: "", port: "43219" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--run-root") out.runRoot = argv[++i];
    else if (argv[i] === "--evidence") out.evidence = argv[++i];
    else if (argv[i] === "--port") out.port = argv[++i];
  }
  if (!out.runRoot) throw new Error("RUN_ROOT_REQUIRED");
  if (!out.evidence) throw new Error("EVIDENCE_REQUIRED");
  return out;
}

function launcherEnv(runRoot, port) {
  const env = {};
  for (const key of ALLOWED_OS_ENV) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  env.EXPORTFLOW_E2E_ROOT = runRoot;
  env.EXPORTFLOW_PORT = String(port);
  env.WRANGLER_SEND_METRICS = "false";
  return env;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const runRoot = assertIsolatedPersist(args.runRoot, { root: projectRoot });
  mkdirSync(args.evidence, { recursive: true });
  const base = `http://127.0.0.1:${args.port}`;
  const evidence = [];
  const record = (step, data) => {
    evidence.push({ step, at: new Date().toISOString(), ...data });
    writeFileSync(path.join(args.evidence, "g2-integration.json"), JSON.stringify(evidence, null, 2));
  };

  const stdout = [];
  const stderr = [];
  const server = spawn(process.execPath, ["scripts/e2e-server.mjs"], {
    cwd: projectRoot,
    env: launcherEnv(runRoot, args.port),
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => stdout.push(String(chunk)));
  server.stderr.on("data", (chunk) => stderr.push(String(chunk)));

  let cookie = "";
  const call = async (label, method, url, { body, headers = {}, key } = {}) => {
    const requestHeaders = { origin: base, ...headers };
    if (body !== undefined) requestHeaders["content-type"] = "application/json";
    if (key) requestHeaders["idempotency-key"] = key;
    if (cookie) requestHeaders.cookie = cookie;
    const response = await fetch(`${base}${url}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    const text = await response.text();
    const setCookie = response.headers.getSetCookie?.() ?? [];
    if (setCookie.length) cookie = setCookie.map((value) => value.split(";")[0]).join("; ");
    record(label, {
      method,
      path: url,
      status: response.status,
      requestBodySha256: body === undefined ? null : createHash("sha256").update(JSON.stringify(body)).digest("hex"),
      responseBody: text.slice(0, 4000),
      sessionCookieCaptured: setCookie.length > 0,
    });
    return { status: response.status, text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
  };

  try {
    // 1. Health with an explicit startup retry log (R-TRANSPORT-STARTUP).
    let health = null;
    let firstAttempt = null;
    const startedAt = Date.now();
    let attempts = 0;
    while (Date.now() - startedAt < 240_000) {
      attempts += 1;
      try {
        const response = await fetch(`${base}/api/v1/health`, { headers: { origin: base } });
        if (response.ok) {
          health = { status: response.status, body: await response.text(), attempts, elapsedMs: Date.now() - startedAt };
          break;
        }
        health = { status: response.status, body: await response.text(), attempts, elapsedMs: Date.now() - startedAt };
      } catch (error) {
        health = { status: 0, error: error instanceof Error ? error.message : String(error), attempts, elapsedMs: Date.now() - startedAt };
      }
      if (!firstAttempt) firstAttempt = { ...health };
      await sleep(500);
    }
    record("health", { ...(health ?? { status: 0, attempts }), firstAttempt });
    if (!health || health.status !== 200) throw new Error(`HEALTH_FAILED:${JSON.stringify(health)}`);

    const admin = JSON.parse(readFileSync(path.join(runRoot, "admin.json"), "utf8"));
    const run = JSON.parse(readFileSync(path.join(runRoot, "run.json"), "utf8"));

    // 2. One-shot bootstrap (real Better Auth user + credential + admin role).
    const bootstrapBody = { email: admin.email, password: admin.password, name: "W1 Real Admin" };
    const bootstrap = await call("bootstrap", "POST", "/api/v1/auth/bootstrap", {
      body: bootstrapBody,
      headers: { "x-bootstrap-secret": admin.bootstrapSecret },
    });
    if (bootstrap.status !== 201) throw new Error(`BOOTSTRAP_FAILED:${bootstrap.status}`);
    const secondBootstrap = await call("bootstrap-second", "POST", "/api/v1/auth/bootstrap", {
      body: bootstrapBody,
      headers: { "x-bootstrap-secret": admin.bootstrapSecret },
    });

    // 3. Real sign-in.
    const signin = await call("sign-in", "POST", "/api/auth/sign-in/email", {
      body: { email: admin.email, password: admin.password },
    });
    if (signin.status !== 200) throw new Error(`SIGNIN_FAILED:${signin.status}`);
    const me = await call("me", "GET", "/api/v1/me");

    // 4. Real password change through Better Auth.
    const newPassword = `W1-${randomUUID()}-pass`;
    const changed = await call("change-password", "POST", "/api/v1/me/password", {
      body: { currentPassword: admin.password, newPassword },
    });
    const resignin = await call("sign-in-new-password", "POST", "/api/auth/sign-in/email", {
      body: { email: admin.email, password: newPassword },
    });

    // 5. D-1 idempotency / replay on a real endpoint.
    const key1 = `w1-${randomUUID()}`;
    const customerBody = { legalName: "W1 Runtime Customer Alpha" };
    const first = await call("d1-first", "POST", "/api/v1/customers", { body: customerBody, key: key1 });
    const replay = await call("d1-replay", "POST", "/api/v1/customers", { body: customerBody, key: key1 });
    const differentBody = await call("d1-different-body", "POST", "/api/v1/customers", {
      body: { legalName: "W1 Runtime Customer Beta" },
      key: key1,
    });
    const key2 = `w1-${randomUUID()}`;
    const concurrentBody = { legalName: "W1 Runtime Customer Gamma" };
    const [c1, c2] = await Promise.all([
      call("d1-concurrent-a", "POST", "/api/v1/customers", { body: concurrentBody, key: key2 }),
      call("d1-concurrent-b", "POST", "/api/v1/customers", { body: concurrentBody, key: key2 }),
    ]);

    // 6. D-2 CSV identity / import resume on the real endpoint.
    const importId = `w1-import-${randomUUID()}`;
    const rows = [
      { legal_name: "W1 Import One", country_code: "EG" },
      { legal_name: "W1 Import Two", country_code: "NL" },
      { legal_name: "", country_code: "DE" },
    ];
    const preview = await call("d2-preview", "POST", "/api/v1/imports/customers/preview", { body: { rows } });
    const commit1 = await call("d2-commit", "POST", "/api/v1/imports/customers/commit", { body: { rows, importId } });
    const commit2 = await call("d2-commit-resume", "POST", "/api/v1/imports/customers/commit", { body: { rows, importId } });
    const commitDifferent = await call("d2-commit-different-file", "POST", "/api/v1/imports/customers/commit", {
      body: { rows: [{ legal_name: "W1 Import Changed", country_code: "EG" }], importId },
    });

    // 7. Read the real D1 state back with the generated config.
    const sql = (command) =>
      spawnSync(
        process.execPath,
        [wranglerBin, "d1", "execute", "exportflow-local", "--local", "--persist-to", run.persist, "--config", run.workerConfigPath, "--json", "--command", command],
        { cwd: projectRoot, encoding: "utf8", env: launcherEnv(runRoot, args.port), timeout: 120_000 },
      );
    const countResult = sql("SELECT COUNT(*) AS n FROM customers WHERE legal_name LIKE 'W1 Runtime%' OR legal_name LIKE 'W1 Import%'");
    const idemResult = sql("SELECT idempotency_key, state, status_code FROM idempotency_keys ORDER BY created_at");
    const importResult = sql("SELECT id, status, total_rows, imported_rows, failed_rows, file_fingerprint IS NOT NULL AS has_fp FROM customer_import_operations");
    const rowResult = sql("SELECT legal_name, status, customer_id IS NOT NULL AS linked FROM customer_import_rows ORDER BY row_index");
    record("d1-state", {
      customersExit: countResult.status,
      customers: countResult.stdout,
      idempotency: idemResult.stdout,
      imports: importResult.stdout,
      importRows: rowResult.stdout,
      stderr: countResult.stderr.slice(-2000),
    });

    const parseCount = (result) => {
      try {
        return JSON.parse(result.stdout)[0].results[0].n;
      } catch {
        return null;
      }
    };
    const dbCounts = {
      customers: parseCount(countResult),
      idempotencyRows: (() => {
        try {
          return JSON.parse(idemResult.stdout)[0].results.length;
        } catch {
          return null;
        }
      })(),
      importOperations: (() => {
        try {
          return JSON.parse(importResult.stdout)[0].results.length;
        } catch {
          return null;
        }
      })(),
      importRows: (() => {
        try {
          return JSON.parse(rowResult.stdout)[0].results.length;
        } catch {
          return null;
        }
      })(),
    };

    const summary = {
      outcome:
        health.status === 200 &&
        bootstrap.status === 201 &&
        secondBootstrap.status === 409 &&
        signin.status === 200 &&
        me.status === 200 &&
        changed.status === 200 &&
        resignin.status === 200 &&
        first.status === 201 &&
        replay.status === first.status &&
        replay.text === first.text &&
        differentBody.status === 422 &&
        c1.status === c2.status &&
        preview.status === 200 &&
        commit1.status === 200 &&
        commitDifferent.status === 409 &&
        dbCounts.customers === 4 &&
        dbCounts.idempotencyRows === 2 &&
        dbCounts.importOperations === 1 &&
        dbCounts.importRows === 3
          ? "PASS"
          : "FAIL",
      health,
      firstHealthAttempt: firstAttempt,
      bootstrapStatus: bootstrap.status,
      secondBootstrapStatus: secondBootstrap.status,
      signinStatus: signin.status,
      meStatus: me.status,
      changePasswordStatus: changed.status,
      resigninStatus: resignin.status,
      d1: {
        first: first.status,
        replay: replay.status,
        replayBodyIdentical: replay.text === first.text,
        differentBody: differentBody.status,
        differentBodyCode: differentBody.json?.error?.code ?? null,
        concurrent: [c1.status, c2.status],
        concurrentBodiesIdentical: c1.text === c2.text,
      },
      d2: {
        preview: preview.status,
        previewFingerprint: preview.json?.data?.fingerprint ?? null,
        commit: commit1.status,
        resume: commit2.status,
        differentFile: commitDifferent.status,
        differentFileCode: commitDifferent.json?.error?.code ?? null,
      },
      dbCounts,
    };
    record("summary", summary);
    writeFileSync(path.join(args.evidence, "g2-server-stdout.log"), stdout.join(""));
    writeFileSync(path.join(args.evidence, "g2-server-stderr.log"), stderr.join(""));
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = summary.outcome === "PASS" ? 0 : 1;
  } catch (error) {
    record("error", { message: error instanceof Error ? error.message : String(error) });
    writeFileSync(path.join(args.evidence, "g2-server-stdout.log"), stdout.join(""));
    writeFileSync(path.join(args.evidence, "g2-server-stderr.log"), stderr.join(""));
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (!server.killed) {
      spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { encoding: "utf8" });
    }
    await sleep(1500);
    let portClosed = false;
    try {
      await fetch(`${base}/api/v1/health`, { signal: AbortSignal.timeout(1500) });
      portClosed = false;
    } catch {
      portClosed = true;
    }
    record("teardown", { pid: server.pid, portClosed });
  }
}

main();
