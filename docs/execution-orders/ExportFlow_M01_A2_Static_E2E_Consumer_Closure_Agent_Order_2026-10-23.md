# ExportFlow / InjazDoc — M01-A.2 STATIC E2E CONSUMER CLOSURE & ISOLATION CONTRACT ALIGNMENT

**Bounded execution order for the coding agent | Owner instruction: "ابدأ" in direct response to the proposed M01-A.2 checkpoint | 2026-10-23**

> **AUTHORIZATION: M01-A.2 ONLY.** This order authorizes **source-level changes to the eight specifically identified existing test files**, optional new dedicated synthetic safety tests, and **new** checkpoint evidence. It does **not** authorize M01-B, Wrangler/Vite/Playwright/Miniflare execution, complete E2E, databases or migrations, business-logic development, Git, cloud, or deployment.
>
> **Project root (previously reported):** `I:\WORK\InjazDocs`.
>
> **Previous checkpoint:** `ExportFlow-M01-A-2026-10-23 — PARTIAL` after **45/45** reported standalone synthetic guard tests. The previous pass is *historical evidence*, not a pass for the new source until explicitly rerun. The last agent report identified **B-01a...B-01g, B-02, B-03** as remaining blockers. There is no substantiated B-04 description in that report; **do not invent one**.
>
> **Owner-facing outputs: Arabic.** Source names, error codes, and test IDs should retain their exact spelling.

---

## 0. OUTCOME AND ORDER OF WORK

Your mission is to remove **only the remaining static isolation-contract defects in test consumers** identified by the prior M01-A report, without weakening any safety guard:

1. Read project instructions and the actual M01-A report/evidence as ordinary source/docs (read-only).
2. Inspect the specified test consumers as **text**, trace their approved dependency chain back to the existing guard/root contract, and create a complete source-anchored inventory.
3. Apply minimal source fixes **only** to the eight existing files in the write allowlist below.
4. Update the two obsolete assertions inside the single existing isolation unit test file while retaining or strengthening their protective semantics.
5. Add narrow, synthetic, **standalone Node** tests only as needed; run only those safely inspected tests, using artificial strings/temp fixtures without starting a test server or touching a protected root.
6. Re-run the previously reported 45-test guard suites **on the final changed source**, if and only if their exact imports, I/O, and startup effects remain safe. Record actual results, not assumed 45/45.
7. Create new, clearly timestamped evidence under an unused M01-A.2 directory, write an Arabic transition report with the exact GO/PARTIAL/BLOCKED criteria, and **STOP**.

**Not in scope:** actual source integration using live Wrangler/D1, proof of startup/shutdown, overall product tests, `0007→0008`, `M01-B`, `M02`, quotation, Proforma/Invoice/UCR/Booking or any other business feature.

**Precedence:** these current owner-approved narrower instructions override any older generic execution guidance in `AGENT` files or roadmap. They do **not** override the owner's standing prohibition on touching live developer/historical states or real secrets.

---

## 1. HARD PROHIBITIONS (INCLUDING READ OPERATIONS)

**Absolutely prohibited in M01-A.2:**

- **Git:** do not invoke `git` in any form, check `.git`, use Git APIs or status/diff/hash/commit/clean/reset/checkout/stash/branch/push; don't infer the current HEAD from historical reports.
- **Developer or historical state:** never open, enumerate, stat, resolve a realpath, hash, copy, delete, backup, or access `.wrangler/state` (including WAL/SHM), `.wrangler-e2e`, `.wrangler-perf`, `.wrangler-reliability-b`, `.wrangler-transition-audit-*`, or any historical/perf/reliability test root. **No metadata-before/after reading of these roots.** Strings containing these names may be analyzed/tested in artificial path cases, but do not resolve these real filesystem objects.
- **Secrets:** no `.dev.vars*`, `.env*` containing real credentials, saved auth/admin-state files, session cookies, tokens, or environment dumps. Do not load dotenv or inspect the caller's live credentials. Test code may inspect the **name** `EXPORTFLOW_E2E_ROOT` without disclosing env contents; ensure test harness never connects to real state.
- **No runtime:** do not execute/import/evaluate Wrangler, Vite, Playwright, Miniflare, Workers/Hono app, browser, DB clients, migration scripts, server bootstraps, production/staging services. This includes calling `playwright test`, `vite`, `wrangler`, `vitest run`, `npm test`, `pnpm test`, generic `build`, `tsc -b`, dependency installation or scripts that could transitively start them.
- **No database**, even a synthetic D1/SQLite migration. No network/cloud, CI, publishing, process termination, global cleanup, or changes in another project.
- Do not read or modify protected/historical evidence and screenshots or unapproved existing files. Do not purge temp roots owned by earlier runs. Only your own brand-new disposable synthetic test fixtures can be cleaned, and only with exact ownership proof.

**Fail closed:** If any file import or proposed test could trigger a forbidden action, don't execute it. Mark `BLOCKED` with the specific file/line and continue only on independent safe, authorized work.

---

## 2. READ ORDER / SOURCE VERIFICATION

From the reported project root, verify its identity by reading *ordinary permitted text* (not `.git`):

1. `AGENTS.md`, `AGANT.MD`, `HANDOFF.MD`.
2. `docs/project-planning/ExportFlow_Master_Roadmap_To_Operational_GoLive_2026-10-23.md`, `ExportFlow_Business_Requirements_V0_3_OWNER_REVIEW_2026-10-23.md`, `ExportFlow_Open_Decisions_V0_3_2026-10-23.md` **if present**. These are business context, not execution orders for this checkpoint.
3. Actual earlier M01-A Arabic report (e.g. `docs/transition-2026-10-23-m01a-20261023-01/04_M01_A_DECISION_AND_M01_B_BOUNDARY_AR.md`) and its `01_SOURCE_PATH_AND_SPAWN_MATRIX_AR.md` and synthetics evidence, **if they exist at these ordinary documentation paths**. Do not fabricate absent evidence.
4. Read the **eight writable existing test files** listed below as plain source text.
5. Read, for reference **only**, `shared/isolation.ts`, `scripts/isolation-guard.mjs`, `scripts/e2e-server.mjs`, `playwright.config.ts`, `vite.config.ts`, `e2e/helpers.ts`, and `e2e/setup.spec.ts` as normal text. Do not import configuration modules to "inspect" them.
6. Read the two standalone previous guard tests in `tests/isolation-safety/` as text to vet allowed imports before running them. You may inspect directly imported **pure guard helpers** if absolutely required; do not traverse the whole repository or dependencies using unbounded recursive scans.

Report the source's **observed** facts separately from claims made by prior reports. If the current code differs from what the report described, preserve the current unrelated work and reassess rather than blindly patching.

---

## 3. STRICT EDIT ALLOWLIST

### 3.1 Exactly these eight **existing** files may be edited (minimal relevant lines only)

| Defect | Existing file | Reported fault | Required direction |
|---|---|---|---|
| B-01a | `e2e/atomicity.spec.ts` | `const persist = ".wrangler-e2e/state"` near line 6 | Derive test state from the **validated explicitly provided** run root. |
| B-01b | `e2e/duplicates.spec.ts` | `.wrangler-e2e/admin-state.json` + `.wrangler-e2e/state` near lines 7–8 | Session state and persistence must use the same validated run root and child paths. |
| B-01c | `e2e/dossier-grid.spec.ts` | hardcoded `wranglerSql(".wrangler-e2e/state", …)` near lines 57, 82, 83 | Only isolated run-owned persistence, never historic path. |
| B-01d | `e2e/invoice-lock.spec.ts` | hardcoded persist + `storageState` near lines 58, 110 | Resolve both via current run root. |
| B-01e | `e2e/security.spec.ts` | hardcoded `wranglerSql(".wrangler-e2e/state", …)` near line 9 | Resolve run-scoped persistence. |
| B-01f | `e2e/shell-grid.spec.ts` | hardcoded `wranglerSql(".wrangler-e2e/state", …)` near lines 56–57 | Resolve run-scoped persistence. |
| B-01g | `e2e/operations.spec.ts` | outdated expected error code and hardcoded `.wrangler-e2e/state` near lines 495–496 | Assert correct deny error **without weakening the negative assertion**; replace runtime historical state source. |
| B-02/B-03 | `tests/isolation-guard.test.ts` | test expects historic persist accepted; test expects `e2e-server` source still mentions historical path | Assert **historic-root rejection** and **no silent fallback**, not stale acceptance/text assertions. |

**Specific source locations are last reported, not independently verified in this chat.** Reidentify actual locations in the existing source without opening any real protected paths.

### 3.2 Optional new files, strictly limited

- **New**, non-overwriting `tests/isolation-safety/m01a2-*.test.mjs` dedicated standalone Node tests against pure guard/path-resolution logic and safe **static text** invariants of these eight consumers. If safe testing would require Playwright imports or real persisted data, write a blocked test matrix in evidence instead of running it.
- **New, unique** `docs/transition-2026-10-23-m01a2-<new-run-id>/` with Arabic reports and plain JSON/text evidence. Create only if that candidate path is currently absent under permitted docs. Never overwrite/rename historical checkpoint evidence.

**All other existing files are READ-ONLY.** In particular, do **not** change: `shared/isolation.ts`, `scripts/isolation-guard.mjs`, `scripts/e2e-server.mjs`, `playwright.config.ts`, `vite.config.ts` (including the ~320 ms transport/socket workaround), `e2e/helpers.ts`, `e2e/setup.spec.ts`, `AGANT.MD`, `HANDOFF.MD`, roadmap, package manifests/locks, schema/migrations, app/server/auth/financial code, CI/deployment files or other tests. If a newly discovered active consumer outside these eight files needs a change, record `OUT_OF_ALLOWLIST_BLOCKER` with the file:line **without editing it**.

No source formatting sweep, broad rename, package install, generic codemod, or replacement by reconstructed old versions. Preserve all unrelated user WIP.

---

## 4. REQUIRED SAFE ENGINEERING CONTRACT

**Do not assume the actual currently exported helper API:** inspect the text of `e2e/helpers.ts`, `shared/isolation.ts`, and strong guard first. Prefer an existing, stable **pure helper** from the current code; do not invent an import or alter the helper's API in an unapproved file.

For every active E2E consumer you change, establish the same contract:

1. A **single explicit** `EXPORTFLOW_E2E_ROOT` is required. No fallback to `.wrangler-e2e` or `.wrangler/state`, no silent `mkdtemp`, no automatic legacy root, and no path re-rooting based on a different default CWD.
2. Missing, empty, invalid, reused, or protected roots fail closed *before any read/write/spawn*. Reuse the existing guard's actual safety logic whenever possible. **No new realpath/stat calls against forbidden paths** on either positive or negative branches.
3. Exactly one canonical run-owned persistence **child** path is used consistently by E2E scripts, SQL helpers and spawned tool arguments. Use source-observed layout; do not assume `runRoot/state` vs `runRoot/.wrangler/state` until confirmed.
4. `admin-state.json`, admin credential filenames, stamp, `run.json`, and test persistence paths are derived only from that same validated run root where appropriate. **Reading a file inside a validated new run root during future E2E is distinct from reading a saved historical root; but do not read either in this static phase.**
5. If an import uses a test-level `test.use({storageState: ...})`, or `wranglerSql`/`wranglerRows`, update it so the state path is consistent with the current `playwright.config.ts` and `e2e-server.mjs` contract. Do not bypass `assertIsolatedPersist` or move the persistence argument into an unguarded shell string.
6. Preserve all original assertions of the business, security, atomicity, invoice locking, and operational scenarios. Do not delete tests, skip them, change business expectations or reduce protections merely to allow old tests to pass.
7. **Negative tests must still inspect forbidden *string values*,** but must not open, stat, realpath, hash, or accidentally start a subprocess against the forbidden filesystem path. `DEVELOPER_STATE_FORBIDDEN` belongs to developer `.wrangler/state`; `PROTECTED_STATE_FORBIDDEN` belongs to historical `.wrangler-e2e` and other historic roots, as reported by M01-A. Check exact current behavior before adjusting assertions.
8. For the existing isolation unit test, replace obsolete textual assumptions with meaningful tests: explicit rejection of historical-root strings; explicit rejection of missing root or forbidden default; positive acceptance only for an artificial owned root; no access to real protected paths. If standalone execution of this existing test requires a forbidden runner/import, update assertions as source only, mark its execution `NOT_RUN`, and cover behavior safely in new standalone tests.
9. Ensure all relevant active accesses in these eight files are addressed, not just the lines in the report. **Do not broaden editing to other files** if a new issue is detected; log and stop the affected subtask.
10. Windows behavior: relative vs absolute path, trailing slashes, drive letter case, UNC, extended path prefixes, path containment (`foo` != `foo-old`), traversal, symlink/junction mismatch, shell quoting/space-containing roots. Use artificial examples in tests, with no forbidden FS calls. Do not claim runtime behavior was proven by synthetic tests.

### Caveat on pure/static inspection

You may grep or inspect the **eight known source files and named allowed read-only files** directly. Do not recursively search the project including `.wrangler` or `.git`. Do not import/evaluate `playwright.config.ts` or test spec files in a guard-only Node run: loading these can initialize Playwright or otherwise violate this phase's no-runtime guarantee.

---

## 5. ORDERED EXECUTION GATES

### A2.0 — Authorization / baseline (read-only)

- Verify the **permitted project root** by approved text markers, not Git.
- Record the 45/45 previous test figure as `PREVIOUSLY_REPORTED` until rerun.
- Inventory every path expression/read/write/spawn-related call in the eight editable files and relevant helper definitions, with actual `file:line`, call target, role (server/Playwright/SQL/storage/admin/stamp), source of root and potential side effect.
- List all planned changes and any out-of-allowlist discovery in a source-backed matrix **before** editing.
- Establish an unused evidence directory without enumerating protected locations.

### A2.1 — Minimum static consumer repairs

- Apply only the eight-file scoped changes from section 3.1.
- Keep the existing `EXPORTFLOW_E2E_ROOT` enforcement from M01-A.
- Do not fall back to a supposedly private but shared directory, or to another existing test run's root.
- Ensure the old historical path is not used by any **active consumer** in the eight files. It is permissible in a **pure negative-test string literal** whose purpose is verifying rejection without filesystem I/O. Explain any such literals explicitly.
- Preserve old error-code distinction and strengthen obsolete test assertions. Never change a rejection expectation to an acceptance expectation.
- Perform manual read-back of the exact edited files. Maintain before/after file SHA-256 with no Git; any unknown preimage must be recorded as such, not fabricated.

### A2.2 — Targeted standalone synthetic tests (NOT Playwright)

Before running, inspect every test's entire import graph to the **pure** guard/path helpers; test files MUST NOT import Playwright/Vite/Wrangler/app bootstrap/database or evaluate the actual E2E spec files.

Allowed examples **only if the actual source has been vetted**:

```powershell
node --test tests/isolation-safety/guard-path.test.mjs tests/isolation-safety/strong-guard-path.test.mjs
node --test tests/isolation-safety/m01a2-<actual-name>.test.mjs
```

- Use exact filenames; do not rely on wildcard expansion; don't run them blindly if dependencies have changed.
- Tests exercising string recognition must use mock/artificial path values only; if a test needs real symlinks/junctions, it may use only a brand-new run-owned sandbox in the OS temp directory, never the project or a protected root.
- Test coverage must include **all eight source consumers** using static text/read-only checks plus path helper unit tests. Check that all runtime E2E roots are rooted in the same explicit source, without evaluating Playwright.
- Add negative tests: absent env/root; implicit fallback; historical-root denial by guards; legacy session/state/stamp strings; stale `DEVELOPER_STATE_FORBIDDEN` for historic path; Windows path-edge cases; unsafe non-owned cleanup; root path propagation contract.
- Add positive tests: valid artificial root; consistent server, fixture, SQL, session, and stamp derivation at the function level. If these require real Playwright execution, mark the case `STATIC_ONLY` / `NOT_RUN` instead of guessing.
- Record each test result and compare to the prior reported 45/45. If either previous safe suite cannot be executed, record why.
- Only **syntax-only** checks are allowed if proven not to evaluate config or start a service. No `tsc -b`, `oxlint` project-wide, `vitest run`, `npm test`, generic build, application or browser runtime.

### A2.3 — Acceptance evidence and controlled stop

Produce only new artifacts in `docs/transition-2026-10-23-m01a2-<new-run-id>/`:

1. `00_AUTHORITY_AND_SCOPE_AR.md` — owner authorization, exact allowlist, excluded tools/root paths, actual commands.
2. `01_E2E_CONSUMER_SOURCE_MATRIX_AR.md` — eight-file callsite matrix and propagation chain with `file:line` proof; distinguish active consumer from negative-test literals.
3. `02_MINIMAL_PATCH_REGISTER_AR.md` — per-file minimal change and what behavior it is expected to influence, regression notes, no business assertion removal.
4. `03_SYNTHETIC_ISOLATION_TEST_REPORT_AR.md` — actual final-source results, negative and positive matrix; count `PASS/FAIL/SKIP/NOT_RUN` honestly.
5. `04_M01_A2_FINAL_GATE_AND_M01_B_PROPOSAL_AR.md` — Arabic verdict and **proposal** for M01-B, clearly marked `NOT_AUTHORIZED`.
6. `evidence/executed-commands.txt` — exact actual commands and exit statuses; no commands to forbidden tools.
7. `evidence/edited-source-hashes.json` — source-only SHA-256 before/after, known limits; do not touch Git or protected roots.
8. `evidence/standalone-node-tests.json` — machine-readable actual test cases/summary and Node version; do not invent runtime evidence.
9. `evidence/remaining-blockers.json` — exact file:line of any unpatched consumers, missing test proof, or need for out-of-allowlist work.

Update **neither** `HANDOFF.MD` nor `AGANT.MD` nor any business spec. Provide proposed handoff text only *inside* the new M01-A.2 report.

If any hard-stop occurs, record the attempted operation vs actual effect accurately; do not continue just to produce a green report.

---

## 6. GATE DECISION RULES

`M01_A2_STATIC_PASS` requires **all** of:

- All B-01a...g, B-02 and B-03 corrected in the actual current source without out-of-scope modifications or changed business expectations.
- No active historical E2E state/session/SQL path in the eight existing files. Literal protected names used only by negative safety tests, with no FS access.
- Root/path propagation is statically consistent between the eight consumers and the current read-only helper/config/server contracts, with missing and invalid roots failing closed.
- All safely runnable synthetic guard tests pass **on final source**, including the previous guard suites if they remain safe to run, and all mandatory synthetic consumer assertions pass; every skipped/blocked assertion is explicitly scoped. If critical tests are unsafe/unexecutable, verdict is `PARTIAL` or `BLOCKED`, not `PASS`.
- All edited files lie within the allowlist, before/after digests and exact commands exist, and new evidence does not overwrite older evidence.

If all conditions are met, **only** M01-A.2 *static* is PASS; never conflate it with full environment acceptance.

| Gate | Allowed outcome after this order |
|---|---|
| M01-A.2 static consumer closure | PASS / PARTIAL / BLOCKED / FAIL |
| M01-A historical full static acceptance | MAY BE PROPOSED based on combined evidence; do not silently rewrite prior checkpoint |
| M01-B isolated runtime | NOT_AUTHORIZED / NOT_RUN |
| M01 overall | PARTIAL / NO_GO (until M01-B is proven) |
| M02 P1 fixes/0008 | PREVIOUSLY PARTIAL / NOT_RUN, not retested |
| Quotation/Invoice business features | NOT_STARTED / NOT_AUTHORIZED |
| Staging / Production | NO_GO |

### Immediate STOP / incident conditions

- Any code/test run would actually open/stat/resolve/copy real developer or historical state.
- Any runtime server, Wrangler/Vite/Playwright process, database, migration, `.dev.vars`, Git, network/cloud is invoked.
- A necessary patch expands beyond eight current test files or new synthetic/evidence files; do not request side-effecting Git or widening access.
- Any user data/auth secrets might be logged or read, any foreign process would be stopped, or any non-owned path would be deleted.
- Current source contains conflicting unreviewed changes that make minimal guarded edits unsafe.

When blocked, stop the affected operation, preserve existing files, write a report from safe evidence only and request a new explicit owner decision for the missing scope.

---

## 7. ARABIC REPORT CONTRACT — EXACT FINAL STATE KEYS

At the end of your user-facing Arabic report, include these status keys **with actual outcomes** (template, not default success):

```text
CHECKPOINT: ExportFlow-M01-A.2-2026-10-23
AUTHORIZATION: OWNER_AUTHORIZED_M01_A2_ONLY
EXECUTION_SCOPE: E2E_CONSUMER_STATIC_CLOSURE_GUARD_ONLY_SYNTHETIC_TESTS
M01_A2_STATIC_STATUS: PASS|PARTIAL|BLOCKED|FAIL
B01_E2E_SEVEN_FILES: PASS|PARTIAL|BLOCKED|FAIL
B02_B03_LEGACY_GUARD_TEST: PASS|PARTIAL|BLOCKED|FAIL
FINAL_SOURCE_GUARD_TESTS: <actual_pass>/<actual_total>; failed=<n>; skipped=<n> OR NOT_RUN
FINAL_SOURCE_CONSUMER_STATIC_TESTS: <actual_pass>/<actual_total>; failed=<n>; skipped=<n> OR NOT_RUN
EDITED_EXISTING_FILES: <exact_list_or_NONE>
CREATED_SYNTHETIC_TEST_FILES: <exact_list_or_NONE>
EVIDENCE_ROOT: <new_unique_path_or_NONE>
GIT_ACCESSED: NO|INCIDENT_REPORTED
DEVELOPER_OR_HISTORIC_ROOT_ACCESSED: NONE_OBSERVED|INCIDENT_REPORTED
SECRETS_ACCESSED: NO|INCIDENT_REPORTED
WRANGLER_EXECUTED: NO|INCIDENT_REPORTED
VITE_EXECUTED: NO|INCIDENT_REPORTED
PLAYWRIGHT_EXECUTED: NO|INCIDENT_REPORTED
DATABASE_OR_MIGRATION_EXECUTED: NO|INCIDENT_REPORTED
NETWORK_OR_CLOUD_ACCESS: NO|INCIDENT_REPORTED
M01_B_RUNTIME_STATUS: NOT_AUTHORIZED_NOT_RUN
M01_OVERALL_STATUS: PARTIAL_NO_GO
STAGING: NO_GO
PRODUCTION: NO_GO
NEXT_REQUIRED_STEP: OWNER_REVIEW_OF_M01_A2_BEFORE_ANY_M01_B_AUTHORIZATION
STOP
```

If any incident is real, don't output an unqualified `NO` or `NONE_OBSERVED`. A pass on static source / synthetic guard tests **does not establish** safe Windows process start/teardown or test-suite parity.

**TERMINAL RULE: STOP at this checkpoint. Never continue into M01-B, M02, D1 official migrations, full E2E, quotations, financial changes, staging or production, even if every synthetic test passes.**
