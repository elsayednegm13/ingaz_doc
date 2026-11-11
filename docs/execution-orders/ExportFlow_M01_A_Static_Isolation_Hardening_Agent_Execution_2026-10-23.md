# ExportFlow / InjazDoc — M01-A STATIC ISOLATION AUDIT, GUARD HARDENING & SYNTHETIC GUARD TESTS

**Execution instruction to the coding agent | Owner-authorized bounded checkpoint | 2026-10-23**

> **STATUS: OWNER AUTHORIZED FOR M01-A ONLY.** This document is an execution authorization for the strictly limited work described below, **not** authorization for M01-B, the full M01 gate, M02, runtime integration, application tests, migrations, release, or deployment.
>
> **Project root (last reported):** `I:\WORK\InjazDocs` — use only after verifying the path by a non-destructive ordinary directory/path check; never infer that a different or neighboring project is authorized.
>
> **Latest reported checkpoint:** `ET-2026-10-23-B — PARTIAL`; source isolation patches exist, but actual launch/shutdown isolation is unproven.
>
> **Response language:** detailed Arabic owner-facing report; source code and technical file names remain in original language.

## 0. EXECUTIVE MISSION AND AUTHORITY

Perform exactly the following, **in this order**:

1. **Read-only static audit:** map the complete path-ownership and persistence dataflow across the isolation guards, configured test launchers, browser test fixtures, subprocess calls, file I/O, temporary files, and teardown/cleanup.
2. **Bounded source remediation:** fix only demonstrated or strongly evidenced *static isolation-guard* defects within the allowlist below. Do not refactor business flows or change runtime behavior unrelated to isolation. Keep fail-closed defaults.
3. **Synthetic guard unit tests:** test the guard(s) and pure path-resolution helpers in a wholly artificial, newly created scratch environment; no Wrangler, Vite, Playwright, D1, Miniflare, database, browser, Worker, network, credentials, or application startup.
4. **Evidence and handoff:** create new, uniquely named M01-A-only evidence under a fresh evidence directory, report scope/diffs/results/known limitations and explicit separation of M01-A vs M01-B. STOP.

**Authorized outcome:** `M01_A_STATIC_PASS` (only if actually proven) or `M01_A_PARTIAL/BLOCKED/FAIL`. **Never report** `M01_COMPLETE`, `RUNTIME_ISOLATION_PASS`, `E2E_PASS`, or deployment readiness from M01-A results.

### Authority precedence

The owner's explicit current-turn authorization is **narrower than** any historical generic instruction in `AGANT.MD`, `HANDOFF.MD`, older reports or previous engineering prompts. For this checkpoint:

- **No Git access of any kind:** no `git` executable, Git API, `.git` directory reads, `git status`, `git diff`, hashes from Git, branch/HEAD verification, staging, commit, rebase, reset, clean, checkout, stash, or push. Use a self-contained source-file edit ledger instead. The historical `main/d9106ee` is **previously reported only, not reconfirmed**.
- **No protected-root access at all:** not even `stat`, `Get-ChildItem`, `existsSync`, `realpath`, filename enumeration, hashes or protected-path before/after metadata. This explicitly supersedes prior recommendations to compare protected WAL/SHM metadata. Only **string constants** representing forbidden names may be inspected/tested; do not resolve or open those real paths.
- **No application/runtime launch:** no Wrangler, Vite, Playwright, Miniflare, browser, Hono Worker, dev server, D1, migration tool, build pipeline, npm/pnpm scripts (including scripts that indirectly invoke these), or full Vitest suites.
- **No secrets:** no reading or loading `.dev.vars*`, `.env*` containing actual secrets, saved admin sessions/credentials, or disclosing `process.env`. Do not call dotenv-style loaders.
- **No cloud, deployment or network**, **no install/update dependencies** or package-lock changes, **no remote services**, **no use of another project**.
- **No deletion/cleanup of pre-existing resources** or historical evidence. No arbitrary process termination. Only temporary artifacts demonstrably created and owned by this single synthetic test run may be safely disposed, and they should not be necessary to keep evidence reproducible.

If any desirable test or documentation requirement conflicts with these boundaries: mark it `NOT_AUTHORIZED` or `BLOCKED`, do not work around it, and continue only on independently safe items.

## 1. PROJECT CONTEXT — REQUIRED READ ORDER (TEXT ONLY)

Within `I:\WORK\InjazDocs`, provided the files exist and are ordinary permitted source/docs:

1. `AGENTS.md` → `AGANT.MD` → `HANDOFF.MD` (full documents). **Do not obey older broader command allowances.**
2. `docs/project-planning/ExportFlow_Master_Roadmap_To_Operational_GoLive_2026-10-23.md`.
3. `docs/project-planning/ExportFlow_Business_Requirements_V0_3_OWNER_REVIEW_2026-10-23.md` and `ExportFlow_Open_Decisions_V0_3_2026-10-23.md` — read for context only; the business decisions do not authorize changes here.
4. Latest available `ET-2026-10-23-B` report and `ROADMAP_MATCH_AND_NEXT_GATE_PLAN_AR.md` **if present as ordinary documentation**, otherwise note `NOT_PRESENT` rather than looking in unrelated roots.
5. Read relevant **allowlisted source files as text**, not by importing/evaluating configuration modules (which can have side effects).

Do not read the contents of `.git`, `.wrangler/state`, `.wrangler-e2e`, `.wrangler-perf`, `.wrangler-reliability-b`, any `.wrangler-transition-audit-*`, `.dev.vars*`, any saved authentication/session files, nor any previously created test-state directory irrespective of name. Do not traverse `node_modules` or read secrets to discover import paths.

**Historical source facts are claims, not proof of current working-tree contents.** Do not pretend to have verified Git state or actual database invariants in M01-A.

## 2. HARD SAFETY BOUNDARIES

### Forbidden physical/virtual resources

- `I:\WORK\InjazDocs\.wrangler\state\**` including WAL/SHM, and any other developer D1/default Wrangler persistence path.
- All existing `.wrangler-e2e\**`, `.wrangler-perf\**`, `.wrangler-reliability-b\**`, `.wrangler-transition-audit-*\**`, any pre-existing reliability/test/performance root, and historical screenshots/evidence.
- Any real customer data, session tokens, credentials, `.dev.vars*`, production/staging/remote Cloudflare D1/R2/KV, other projects, foreign processes.
- **Even for metadata comparison**: no protected-root filesystem calls. M01-B may propose independent runtime-safe verification later; M01-A never performs it.

### Authorized edit allowlist — only if necessary and after read-only inventory

- `scripts/isolation-guard.mjs`
- `shared/isolation.ts`
- `scripts/e2e-server.mjs`
- `playwright.config.ts`
- `vite.config.ts` — **preserve the historically required ~320ms transport/socket workaround**; change only proven isolation-related path guard logic.
- `e2e/helpers.ts`
- `e2e/setup.spec.ts`
- **New dedicated guard-only test files** under a fresh `tests/isolation-safety/` subdirectory (do not overwrite existing tests).
- **New evidence and reports** under a uniquely named `docs/transition-2026-10-23-m01a-<unique-id>/` directory created by this checkpoint alone.

**No other file is writable without a new, explicit owner decision.** If fixing an actual guard needs any other file, document the blocker with exact file:line and stop that subtask. In particular, do not modify `AGANT.MD`, `HANDOFF.MD`, roadmap files, business specifications, database schema/migrations `0001`–`0008`, package files, `.gitignore`, worker/business/auth/invoice/reminder services, app UI, CI config, or production deploy config.

Do not overwrite prior copies/evidence. For an already modified allowlisted file, make the **smallest targeted change** preserving unrelated code; no formatting sweep, no fallback to a replacement baseline, no mass refactors.

## 3. M01-A TASKS — MANDATORY ORDERED GATES

### M01-A.0 — Scope verification (NO WRITES before this)

- Confirm the intended root exists and the docs are the actual ExportFlow project by reading permitted project marker text (`AGENTS.md`, `AGANT.MD`, `HANDOFF.MD`) and the specified path only. **No Git**.
- Record the existing source claims vs what is currently seen in read-allowed files. Note that ET-2026-10-23-B reportedly patched some isolation paths; **do not assume those patches are absent or reimplement them blindly**.
- State source file paths to be examined, planned edits and allowed test command. If a planned command imports/starts the application or traverses a protected path, remove it from the plan.
- Decide a unique evidence folder name that does not coincide with any old evidence folder, without enumerating forbidden trees; check existence only for that candidate under the permitted `docs` tree.

**Stop if** the root is ambiguous, the source is incompatible with these assumptions, files require secret reads, or you need Git to proceed.

### M01-A.1 — Exhaustive static path-consumer matrix

Read, without evaluating, the seven isolation-relevant files named in the allowlist. Trace every relevant dependency **by inspecting references in these permitted files only**. Record at least:

- Entry point → resolved configuration → persistence/state root → all child processes/arguments/environment → test authentication files → storage state → stamp files → temporary fixtures → teardown/cleanup.
- Where `EXPORTFLOW_E2E_ROOT` (or equivalent) comes from; whether it is required, normalized, validated **before side effects**, propagated to child processes, and reused consistently.
- Any implicit `cwd`-based or CLI default fallback that would select `./.wrangler/state`, `.wrangler-e2e`, or other protected roots.
- Any mismatch between where the server writes admin credentials and where Playwright or helpers read them; classify **static** only, do not attempt login.
- How pre-existing paths, trailing separators, parent traversal (`..`), Windows path case, relative paths, drive/UNC/extended-length spellings, prefix collision (`safe` versus `safe-old`), junctions/symlinks, and non-existent path segments are handled.
- How attempts to spawn when the root is absent, unsafe or ambiguous fail **closed before side effects**.
- What every cleanup routine is *allowed* to delete; require its own marker/run ID and ownership verification. If ownership is not proven, do not delete.
- Static treatment of failures/timeouts/teardown: note which behaviors are source-evident and which require M01-B runtime proof.

**Critical distinction:** finding a protected-root name as a *guard denylist literal* is legitimate. The error is a code path that would **access, select, derive, or fall back to** that forbidden location, not merely the literal text appearing in source.

Deliver `01_SOURCE_PATH_AND_SPAWN_MATRIX_AR.md` with `OBSERVED_SOURCE`, file:line, ownership decision, candidate correction, and M01-B-required items. For unresolved imports outside the edit allowlist, cite the exact reference and mark `UNVERIFIED` rather than browsing protected files or running code.

### M01-A.2 — Guard hardening (minimal changes only)

For proven guard gaps, apply minimal targeted changes in the authorized edit allowlist. Requirements:

1. All launch entry points must derive their test-state path from **one explicit unique synthetic root provided for that run**. Missing/blank root or invalid ownership marker must **throw/fail closed**; no default to historical or developer roots.
2. Canonicalize comparisons using appropriate `path.win32` semantics on Windows; prevent absolute/relative drive confusion, traversal and simple string-prefix bypasses. Do **not** use `startsWith` alone for containment; require a genuine directory boundary / relative-path containment proof.
3. To avoid filesystem access to forbidden paths: perform **pure lexical denylist checks first**. Only after proving a candidate is within the newly owned synthetic scratch area can the guard consider canonical filesystem resolution of **that scratch area**. Never `stat`, `realpath`, `access`, read, or enumerate an actual forbidden candidate simply to reject it.
4. Symlink/junction handling must fail closed when a path might escape ownership. Synthetic tests may simulate a redirect **only between two fresh dummy directories owned by the test**. No link, junction, or probe may target a real forbidden path. Where actual reparse semantics cannot be verified without runtime permissions, report that limitation.
5. Explicitly propagate the validated root to config, server launcher, e2e helpers, storageState and stamps; no stale hardcoded `.wrangler-e2e` paths. Reading/writing old test credentials is forbidden.
6. The common isolation guard must enforce the **same historical-root denylist** as the strong guard, or rely on a single shared, testable policy with demonstrably identical protection. Do not weaken a guard to make tests pass.
7. Guard must run before launching child processes or opening writable paths. Cleanup must refuse unowned/pre-existing roots, never wipe a parent or sibling, never use broad globs.
8. Do not alter network/transport workarounds, application behavior, auth/roles, invoicing, document contracts, migration logic, or production environment behavior except to fail closed on test-state isolation violations.
9. Keep public signatures compatible where possible; any unavoidable compatibility change must be recorded and **not** silently wired into production runtime without an acceptance gate.

**STOP / BLOCK** if any guarantee cannot be established without running Wrangler/Vite/Playwright, reading a protected filesystem path, touching another file, or an actual D1 database. Static safety improvements may be recorded as `PARTIAL`, never claimed as complete runtime proof.

### M01-A.3 — Allowed synthetic guard-only tests

You may run **only a deliberately standalone, explicitly scoped Node.js native test command** against new test files that you have inspected to confirm they import **guard/path helpers only** and do not import Vite, Playwright, Worker, app bootstrap, Wrangler, DB, package scripts or any existing broad suite. Example **only if safe on this actual source tree**:

```powershell
# Use only if these are the new guard-only files and have no risky imports.
node --test 'tests/isolation-safety/*.test.mjs'
```

If Windows shell glob expansion or module format makes that ambiguous, invoke individual **exact new filenames**; never invoke `npm test`, `pnpm test`, `vitest run`, `playwright test`, or a script alias. Never auto-install test runners or dependencies. If `node` is unavailable or tests require a banned startup, record `TESTS_BLOCKED`, do not improvise a wider test command.

All real fixture writes must be under a newly created temporary synthetic directory owned by that run, separate from the project and from protected/historical test roots. Test string-path comparisons can use imaginary Windows paths **without touching those real locations**.

Required test matrix (record actual case names/results, not an invented count):

**Positive:** valid unique owned root; valid child path within it; propagation from root to synthetic credentials/storage/stamps; safe cleanup decision on a run-owned dummy root (cleanup behavior may be simulated if importing cleanup would spawn application modules).

**Negative:** missing/empty root; invalid/unrecognized root marker; direct protected-root string; parent traversal to a protected sibling; protected root with mixed case/trailing separator; prefix collision; alternate drive; UNC and extended-prefix paths; relative `cwd` fallback; redirect to a fresh synthetic *unowned* dummy sibling; stale `.wrangler-e2e` admin/storage/stamp paths; cleanup request for a parent or unowned dummy folder; relevant ambiguous/nonexistent path components.

Use **mock/injected resolution** when needed to verify guard behavior without actual OS path access. Test failure must leave prior evidence and all protected resources untouched. Where a physical junction test is not possible without privilege, mark it `NOT_RUN` and do not represent mock coverage as operating-system-level junction proof.

Record a machine-readable manifest (`evidence/guard-synthetic-tests.json`) with executed command(s), Node version, test IDs, pass/fail/skip, stderr summary, exact test limitations and whether fixtures were purely synthetic. Avoid printing secrets or raw environment variables.

### M01-A.4 — Additional permitted static checks (with strict limits)

- Manual review of the final changed files and targeted import/call-site mapping is required.
- An explicit parser/transpiler **syntax-only check** is permitted only if you first establish that it **cannot write caches, evaluate config or import the application**. Otherwise mark `NOT_RUN`.
- **Do not use `tsc -b`**, generic `build`, application lint scripts or a project-wide test runner; some write caches or import plugins. If targeted typecheck cannot be proved side-effect free within the allowed scope, don't run it and disclose the limitation.
- Check that the change preserves the local transport/socket workaround in `vite.config.ts` without executing Vite.
- To capture changes without Git, use a manual source-file edit ledger with **sha256 before/after only for directly edited allowlisted ordinary source files** (computed by a scoped Node helper or equivalent, not whole-tree scanning), permitted exact file path and a short semantic delta. Never hash `.git` or protected files.

### M01-A.5 — Evidence & Arabic report

Create **new** evidence only under `docs/transition-2026-10-23-m01a-<unique-id>/` with these deliverables:

1. `00_SCOPE_AND_AUTHORIZATION_AR.md` — copied authorization boundaries, root identity from safe docs, allowlist, banned operations, planned and actual commands.
2. `01_SOURCE_PATH_AND_SPAWN_MATRIX_AR.md` — exhaustive readable call graph of isolation paths, file:line evidence, remaining gaps, assumptions.
3. `02_STATIC_FIX_REGISTER_AR.md` — individual defect → minimal file/line patch → reason → observed static effect → regression risk.
4. `03_SYNTHETIC_GUARD_TESTS_AR.md` — real pass/fail counts, detailed negative matrix and limitations; do not reuse `53/53` as proof of this work.
5. `04_M01_A_DECISION_AND_M01_B_BOUNDARY_AR.md` — acceptance verdict and **precise M01-B runtime preflight proposal**, marked `NOT_AUTHORIZED`.
6. `evidence/guard-synthetic-tests.json` — real executed synthetic cases; omit if no execution but record `NOT_RUN` explicitly.
7. `evidence/edited-file-sha256.json` — only authorized edited-file before/after digests, if collected.
8. `evidence/executed-commands.txt` — full exact allowed commands + results; no Git commands.

Before creating evidence, ensure the proposed unique folder is not already present. No overwriting older artifacts. Do not modify `HANDOFF.MD`/`AGANT.MD`: include a **proposed handoff paragraph** inside item 5 only for owner review.

## 4. ACCEPTANCE GATES AND STRICT STATUS SEMANTICS

| Gate | `M01_A_STATIC_PASS` requires | Otherwise |
|---|---|---|
| A0 Scope | Verified permitted ExportFlow root via safe docs; no forbidden operations | STOP / BLOCKED |
| A1 Inventory | Every reviewed path consumer and spawn entry mapped with source citations; unknowns explicit | PARTIAL |
| A2 Isolation policy | Fail-closed invalid/missing root, no unsafe defaults, denylist consistent, no unsafe cleanup in inspected code | FAIL/PARTIAL |
| A3 Synthetic tests | All mandatory **runnable and safe** positive/negative tests pass; skips justified and precisely limit claims | PARTIAL/BLOCKED if essential coverage missing |
| A4 Changes | Edits only in allowlist, no unrelated regressions introduced by inspection, before/after ledger | FAIL |
| A5 Evidence | New evidence folder, command ledger, traceable Arabic report, no secrets | PARTIAL |

**Even if all A0–A5 pass:**

```
M01_A_STATIC: PASS
M01_B_RUNTIME: NOT_AUTHORIZED / NOT_RUN
M01_OVERALL: PARTIAL / NO_GO
REAL_WORKER_D1_INTEGRATION: NOT_RUN
OFFICIAL_D1_0007_TO_0008: NOT_RUN
PLAYWRIGHT_E2E: NOT_RUN
STAGING: NO_GO
PRODUCTION: NO_GO
```

### Hard STOP events

- A command, import or function may start Wrangler, Vite, Playwright, browser, Worker, migration, background server or a cloud request.
- Any attempted filesystem access (including stat/metadata) to real `.wrangler/state`, historical test roots or `.dev.vars*`.
- Any proposed use of Git, DB, network, secrets, dependency installation, deployment, or existing dataset reset.
- A necessary patch extends outside edit allowlist or violates an unresolved owner business decision.
- Non-owned path deletion, accidental symlink/junction outside synthetic sandbox, inability to determine safe test entrypoint, unexpected changes to unrelated files.

Stop the affected operation immediately, leave resources intact, identify exact evidence and whether a **forbidden access actually happened vs was detected before occurrence**, and report incident/severity in Arabic. Never fabricate "no access" from an absence of observed modified timestamps.

## 5. REPORT FORMAT — MUST END WITH MACHINE-READABLE BLOCK

Final Arabic response must contain: executive findings; permission compliance; source-backed path matrix summary; list of changed source files (or `NONE`); synthetic test results with precise counts; observed vs inferred vs unverified; any rollback discussion **as a proposal only** (no Git or broad cleanup); remaining M01-B proof obligations; whether the pre-existing P1 defects are still untested; stop/go for M01-A **only**. Do not conflate a source-level fix with runtime acceptance.

End with exactly the following keys, values reflecting reality (example placeholders are *not* default PASS):

```text
CHECKPOINT: ExportFlow-M01-A-2026-10-23
EXECUTION_SCOPE: STATIC_ISOLATION_AUDIT_GUARD_FIX_AND_SYNTHETIC_TESTS_ONLY
M01_A_STATIC_STATUS: PASS|PARTIAL|BLOCKED|FAIL
M01_B_RUNTIME_STATUS: NOT_AUTHORIZED_NOT_RUN
M01_OVERALL_STATUS: PARTIAL_NO_GO
SYNTHETIC_GUARD_TESTS: <actual_pass>/<actual_total>; failures=<N>; skipped=<N> OR NOT_RUN
FILES_MODIFIED: <exact_allowlisted_paths_or_NONE>
NEW_EVIDENCE_ROOT: <unique_project_relative_path_or_NONE>
WRANGLER_EXECUTED: NO
VITE_EXECUTED: NO
PLAYWRIGHT_EXECUTED: NO
DATABASE_OR_MIGRATION_EXECUTED: NO
PROTECTED_ROOT_ACCESS: NONE_OBSERVED|INCIDENT_REPORTED
GIT_ACCESS: NO
SECRETS_ACCESSED: NO
NETWORK_OR_CLOUD_ACCESS: NO
STAGING: NO_GO
PRODUCTION: NO_GO
NEXT_STEP: M01_B_ONLY_AFTER_SEPARATE_OWNER_AUTHORIZATION
STOP
```

If any prohibited operation has occurred, do **not** falsely output a clean `NO`/`NONE_OBSERVED`: report the incident explicitly. Also distinguish declared command intent, observed tool execution and unverified OS-level behavior.

**FINAL INSTRUCTION:** Complete only M01-A in the current agent session. Do not proceed to M01-B, M02, business feature changes, quotation implementation, runtime proof, E2E, migration, Git actions, cloud, or deployment even if all M01-A tests pass.
