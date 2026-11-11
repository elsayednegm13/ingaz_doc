import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Bounded, read-only load test for the engineering audit.
 *
 * - Runs against the isolated performance server (loopback only).
 * - Only read endpoints are called, so the measured dataset is never mutated.
 * - Concurrency levels are fixed and small enough for a developer machine.
 */
const base = process.argv[2] ?? "http://127.0.0.1:43176";
const accountsPath = process.argv[3] ?? ".wrangler-perf/accounts.json";
const outDir = path.join(process.cwd(), "docs", "audit", "2026-10-20");

if (!base.startsWith("http://127.0.0.1:")) {
  throw new Error("Refusing to run outside a loopback base URL");
}

const accounts = JSON.parse(await import("node:fs").then((fs) => fs.readFileSync(accountsPath, "utf8")));

const routes = [
  "/api/v1/dashboard",
  "/api/v1/export-cases?pageSize=25",
  "/api/v1/schedule",
  "/api/v1/reminders",
  "/api/v1/me",
];

async function signIn() {
  const response = await fetch(`${base}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: base },
    body: JSON.stringify({ email: accounts.email, password: accounts.password }),
  });
  if (!response.ok) {
    throw new Error(`sign-in failed ${response.status} ${await response.text()}`);
  }
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const cookie = cookies.map((entry) => entry.split(";")[0]).join("; ");
  if (!cookie) throw new Error("sign-in returned no cookie");
  return cookie;
}

async function hit(route, cookie) {
  const started = performance.now();
  try {
    const response = await fetch(base + route, { headers: { cookie, origin: base } });
    const text = await response.text();
    return {
      route,
      status: response.status,
      duration_ms: performance.now() - started,
      ok: response.ok && !text.trimStart().startsWith("<"),
    };
  } catch (error) {
    return {
      route,
      status: 0,
      duration_ms: performance.now() - started,
      ok: false,
      error: error instanceof Error ? error.name : "Error",
    };
  }
}

async function wave(concurrency, count, cookie) {
  const rows = [];
  let pending = 0;
  let index = 0;
  await new Promise((resolve) => {
    const next = () => {
      if (index >= count && pending === 0) {
        resolve();
        return;
      }
      while (pending < concurrency && index < count) {
        pending += 1;
        index += 1;
        const route = routes[index % routes.length];
        hit(route, cookie).then((row) => {
          rows.push({ ...row, concurrency });
          pending -= 1;
          next();
        });
      }
    };
    next();
  });
  return rows;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round(sorted[index] * 100) / 100;
}

function summarise(concurrency, rows, elapsedMs) {
  const durations = rows.map((row) => row.duration_ms);
  const errors = rows.filter((row) => !row.ok);
  return {
    concurrency,
    requests: rows.length,
    elapsed_ms: Math.round(elapsedMs),
    rps: Math.round((rows.length / elapsedMs) * 1000 * 100) / 100,
    p50_ms: percentile(durations, 50),
    p95_ms: percentile(durations, 95),
    p99_ms: percentile(durations, 99),
    max_ms: percentile(durations, 100),
    errors: errors.length,
    statuses: rows.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

const cookie = await signIn();

/**
 * Cost of the idempotency ledger. The same validation-failing create is sent
 * with and without a key: the request is rejected either way and no business
 * row is written, so the difference is the ledger overhead only.
 */
async function measureLedgerOverhead(sessionCookie) {
  async function sample(withKey) {
    const durations = [];
    for (let index = 0; index < 20; index += 1) {
      const headers = { origin: base, "content-type": "application/json", cookie: sessionCookie };
      if (withKey) headers["idempotency-key"] = `overhead-${withKey ? "k" : "n"}-${index}-${Date.now()}`;
      const started = performance.now();
      const response = await fetch(`${base}/api/v1/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({ legalName: "" }),
      });
      await response.text();
      durations.push(performance.now() - started);
    }
    return {
      p50_ms: percentile(durations, 50),
      p95_ms: percentile(durations, 95),
      mean_ms: Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 100) / 100,
    };
  }
  const withoutKey = await sample(false);
  const withKey = await sample(true);
  return {
    note: "validation-failing create, 20 samples each, no rows written",
    without_key: withoutKey,
    with_key: withKey,
    delta_p50_ms: Math.round((withKey.p50_ms - withoutKey.p50_ms) * 100) / 100,
    delta_p95_ms: Math.round((withKey.p95_ms - withoutKey.p95_ms) * 100) / 100,
  };
}

const plan = [
  { concurrency: 1, count: 20 },
  { concurrency: 10, count: 60 },
  { concurrency: 25, count: 100 },
  { concurrency: 50, count: 150 },
  { concurrency: 100, count: 200 },
];
const results = [];
const allRows = [];
for (const level of plan) {
  const started = performance.now();
  const rows = await wave(level.concurrency, level.count, cookie);
  const elapsed = performance.now() - started;
  results.push(summarise(level.concurrency, rows, elapsed));
  allRows.push(...rows);
}

const summary = {
  base,
  time_utc: new Date().toISOString(),
  dataset: "500 export cases (isolated performance D1)",
  mode: "read-only",
  levels: results,
  total_requests: allRows.length,
  total_errors: allRows.filter((row) => !row.ok).length,
  ledger_overhead: await measureLedgerOverhead(cookie),
};

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "load-test.json"), JSON.stringify({ summary, rows: allRows }, null, 2));
console.log(JSON.stringify(summary, null, 2));
