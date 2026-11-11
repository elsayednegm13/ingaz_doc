# AGANT.MD — ExportFlow Standing AI Engineering Charter

> **Version:** 2026-10-23 | **Status:** OWNER-REQUESTED PROJECT MEMORY DOCUMENT | **Location to install:** repository root `I:\WORK\InjazDocs\AGANT.MD`  
> **Companion:** `HANDOFF.MD` — mandatory current-state handoff, decision register, blockers and next-step gates.  
> **Auto-discovery companion:** `AGENTS.md` points here and to `HANDOFF.MD` for agents that automatically read that conventional filename.  
> **Language:** instructions in English for agent precision; final reports and owner-facing decisions in comprehensive Arabic.

## 0. Non-negotiable entry instruction

**YOU ARE WORKING ON AN EXISTING, BUSINESS-CRITICAL SYSTEM. YOU ARE NOT CREATING A NEW APP.**

Before a source edit, installation, local server start, database operation, test run that starts Workers, build, or configuration change:

1. Read this file **and the entire `HANDOFF.MD`**.
2. Confirm the actual current repository root, current date, branch/HEAD/dirty status, active processes, scripts, configuration and migrations **without reading secret values or SQLite developer databases**.
3. Reconcile every statement in these documents against actual current source, migrations and available runtime evidence. Reports record claims and historical observations, not automatic proof of today’s filesystem.
4. Read the owner's **specific authorization for this turn**. Creating these memory files is **not** permission to execute the proposed next checkpoint.
5. Create a scope/evidence ledger and describe the exact intended delta. Stop on ambiguity that could alter data, authorizations, external resources or business invariants.
6. Never advance to another checkpoint automatically. Produce an accurate Arabic report, explicit GO/NO-GO, and **STOP**.

**Current handoff status (2026-10-23):** D-1, D-2 and D-3 were **implemented and passed 53/53 tests only in isolated `node:sqlite` + fake-auth harness**. Real Worker/Better Auth/Miniflare E2E regression was **not run after these changes**. Migration `0008` was introduced but **NOT applied to developer or remote D1**. Project deployment and design approval remain **NO-GO/PENDING**. Read `HANDOFF.MD` for authoritative detail.

---

## 1. Your job and engineering standard

Act as a Principal/Staff Software Engineer, Backend Engineer, Frontend Engineer, Product Engineer, AppSec/QA engineer and Release Engineer. Optimize for **business correctness, verifiable safety, data integrity, minimal diffs, accessibility, and reversible change**.

**Mission:** Maintain and extend ExportFlow's existing export-operations application. Preserve the agreed roadmap and business model. Investigate evidence before proposing or implementing changes. Do not recast it as a generic CRM/ERP, accounting suite, shipping marketplace, full carrier integration, multi-tenant SaaS product, or new architecture. Do not interpret mockups as API contracts.

### Source-of-truth hierarchy

1. Current explicit owner authorization and frozen business decisions.
2. Existing owner-approved project architecture/ADRs and dated decisions, unless superseded by later explicit owner decision.
3. Current real code/schema/config/runtime **for what is implemented**, not for redefining what the owner wants.
4. Reproducible tests, logs and evidence with known environment and execution date.
5. Historical checkpoint and audit reports, tagged `PRIOR_REPORT` until validated.
6. Agent recommendations, tagged `PROPOSED_NOT_APPROVED`.

If sources conflict, **record the discrepancy**; do not silently choose whichever unlocks your plan. Qualify evidence as `OBSERVED_SOURCE`, `OBSERVED_TEST`, `PRIOR_REPORT`, `INFERENCE`, `UNVERIFIED`, or `PROPOSED_NOT_APPLIED`.

---

## 2. What ExportFlow actually is

ExportFlow / InjazDoc (`I:\WORK\InjazDocs` is the **last reported** root) is a **bilingual Arabic/English internal export operations and documentation system** for an exporter managing multiple customers and internal employees. Its original operational problem was fragmented Excel sheets, invoices, original paper documents, bank reviews, DHL document shipments, ocean bookings, individual containers, scheduled dates, reminders, and customer status updates.

The **core object is an export case with an `EF-…` identifier**. Users must always be able to answer:

- Which case is this, for which buyer, and who is authorized/responsible?
- What is blocked or due next for documentation, bank/direct handoff, cargo and vessel?
- Which evidence and document version backs a status?
- What was planned, what actually happened, and when?
- What can the external customer safely see via a revocable tracking link?

### 2.1 Frozen commercial model (do not break)

**Customers and case identity**

- Customers have identities, addresses, contacts, tax/bank details and configurable custom fields; case creation snapshots historically relevant customer data. Subsequent customer edits **must not silently rewrite case snapshots**.
- One exporter with internal staff and external buyers. Do not invent separate tenants or expand into a generic ERP.
- Roles and permissions are dynamic and may include overrides; case scoping is enforced **server-side**, not just by hiding controls.

**Invoices and owner-approved Rule C**

- FOB/CFR invoices maintain goods value, freight value and **explicit grand total entered as its own field**. NEVER silently derive/override `grand_total = goods + freight`.
- A completed parent export case locks ordinary invoice and relevant custom-field edits.
- Exceptional correction requires `invoices.correct_completed`, a reason of **3–500 characters**, optimistic version validation, immutable before/after revision and audit trail (`invoice_revisions` introduced in `0004`).
- Ordinary create/edit must not bypass completed-case locks. Protect historical invoice snapshots and corrections.

**Documents and shipment of originals**

- Per-case dynamic required-document checklist with versioned private PDFs, review states and authorization.
- Physical originals must be scanned before bank handoff where applicable; documentary process is distinct from cargo process.
- BANK and DIRECT are mutually meaningful document routes: **DIRECT must not be forced through BANK-only stages**.
- DHL/document courier tracking is **MANUAL status recording**; do not present it as a live carrier feed or cargo delivery.

**Bookings, vessel, containers and delivery**

- Booking confirmation document, booking number, optional UCR, loading/ETD/ETA planned and actual dates.
- Planned container slots and actual ISO container numbers are **separate**. A slot without a real number stays unnumbered; do not generate fake identifiers.
- Containers may differ in status; port arrival is **not** final delivery to customer.
- Final case completion must be validated on the backend against required business conditions; document handoff/courier status and cargo/final delivery remain independent.

**Reminders and notifications**

- Configurable rule families, relative date offsets, recipient visibility, deduplication by cycle/generation, snooze and resolution. Respect repeat caps and do-not-repeat-once semantics.
- Regenerate appropriate ETA-dependent reminders when dates change while cancelling/reconciling stale generations. Auto-resolve eligible document reminders upon approvals.
- No email reminders were approved. `CUSTOM_FOLLOWUP` is an enum/future family **NOT OWNER-DEFINED and NOT IMPLEMENTED**; do not invent behavior.
- Scheduler/cron races, Cairo time semantics, high-load efficiency and batch size remain **open risks**; do not mark them fixed based on unrelated successes.

**Public tracking**

- Tokenized customer-facing link without account, revocable, deliberately restricted view. NEVER expose private documents, financial details, internal users/bank information or privileged notes.

**Custom fields and reporting**

- Custom fields cover customers, cases, invoices, bookings and containers; preserve definitions and historical values.
- CSV exports/imports must preserve authorization, formula-injection mitigation and explicitly approved partial-resume semantics.

### 2.2 UX is part of safety

- The two high-fidelity images for **Premium Operations Workspace** are approved as **visual redesign reference**, not approved as accurate data/logic nor as final UI acceptance. Look for `docs/design-references/exportflow-premium-workspace-0671/` and corresponding reference metadata in repo. Verify files exist.
- Keep coherent navy/teal/light-paper identity, restrained Lucide React icons, clear AR/EN RTL/LTR, dense-but-scannable tables, visible next actions, independent document and cargo paths.
- Do not copy illustrative KPIs (e.g., 74, +12%, donut chart percentages, synthetic customer names) into production. Display metrics only when backed by existing authorized API data.
- Responsive visual acceptance **remains pending**. Reported 136/136 no-page-overflow checks **do not prove** zero overlap, accessible labels, correct alignment or fidelity to the reference images.
- Avoid unlicensed Tailwind Plus/commercial templates. Use Tailwind CSS v4 `@theme` and existing Lucide/Radix first; do not install libraries without concrete need and license validation.

---

## 3. Baseline architecture — verify, do not rewrite

**Last reported stack** (confirm against `package.json`, lockfile and actual source):

| Layer | Current reported implementation |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, React Router 7, TanStack React Query, Tailwind CSS v4, Sonner, Lucide React; Radix where already installed |
| Backend | Cloudflare Worker using Hono, `server/http/app.ts`, services in `server/services/`, state transitions in `server/domain/transitions.ts` |
| Auth | Better Auth, HTTP-only cookie sessions, CSRF/Origin validation, dynamic RBAC and per-case authorization |
| Data | Cloudflare D1/SQLite, migrations `drizzle/migrations/0001...0008` now reported on disk |
| Files | Private R2 with presigned/validated uploads, local test emulation; real remote R2 NOT verified |
| Scheduled | Worker Cron for reminder due/recompute/cleanup |
| Shared | `shared/` enums/contracts/permissions/transition support |
| Tests | Vitest, Playwright E2E, SQLite isolated transition probes |
| Source control | Git **exists**, last reported branch `main`, HEAD `d9106ee`; working tree very dirty (457 status entries as reported). Reconfirm before use. |

`server/services/cases.ts` was historically **RECONSTRUCTED_AND_CONTRACT_VERIFIED** after loss of the original source. Do not claim original source recovered. Preserve verified behavior.

Do not casually replace this with Next.js, Prisma, Supabase, another ORM, a new auth system or another cloud architecture.

### 3.1 Migrations and data states

- `0001` core tables; `0002` seed rules/roles; `0003` bootstrap/tax/rate-limit; `0004` invoice revisions; `0005` idempotency ledger; `0006` resumable customer import; `0007` performance indexes; **`0008` response witness/import fingerprint/auth-compensation/schema readiness**.
- `0008` exists in the last reported source and passed tests from scratch using an isolated `node:sqlite` shim, **not** a populated `0007→0008` upgrade on real D1/Miniflare.
- Developer database current migration version is **NOT VERIFIED**. Historical snapshots showed `0004`; do not assume it stays at `0004` or has advanced.
- Code built against `0008` should fail closed with `SCHEMA_UPGRADE_REQUIRED` on outdated schema, rather than attempt a remote/developer migration or return an unexplained 500.
- **NO developer/local persistent D1 migration or seeding** except under a separate owner approval for that exact database and plan.
- Do not modify migration files `0001–0008` retroactively; new additive migrations need a dedicated explicit scoped change and test plan.

---

## 4. Critical environment/data isolation rules

### 4.1 Protected assets — all untouched by default

**Absolute protection:** `.wrangler/state/**`, `.dev.vars*` contents, developer SQLite WAL/SHM, existing `.wrangler-e2e/**`, `.wrangler-perf/**`, `.wrangler-reliability-b/**`, all prior `.wrangler-transition-audit-*`, real credentials, remote D1/R2/KV/cloud environments, user/customer business records, other projects, unrelated Docker resources.

**Even a read-only-looking `wrangler dev` or process shutdown may alter or checkpoint WAL/SHM of default `.wrangler/state`.** A prior transition audit unintentionally removed developer WAL/SHM files by a checkpoint during teardown. A newer report also saw a foreign process change protected-path mtimes; attribution was not independently proven. Do not repeat this.

Never start Wrangler, Vite, Playwright, test harnesses, build plugin, local D1 inspection, migration tools or cleanup without first proving **from actual source/config and process launch arguments** that the operation's entire lifecycle—including shutdown—cannot open a protected path.

**Blocking rule:** If isolation is unproven, **STOP runtime/build/E2E and report `BLOCKED_ISOLATION`**. Static analysis, content inspection (excluding secrets/protected DB) and tests proven to use `os.tmpdir()` + `node:sqlite` remain possible.

- Use a **new** unique isolated temporary state root for each authorized run, and verify that every entry point and subprocess honors it; no reuse/reset of earlier test roots without owner decision.
- Guard all paths with `path.resolve/realpath`, canonical path containment checks and Windows drive semantics. Reject symlinks/reparse redirects and unsafe default current working directories.
- Check isolation **before spawn** and again before cleanup. Test cleanup must target **only newly created resources** whose ownership is proven. Never use broad `Remove-Item .wrangler*`, `git clean`, process-wide kill, or unscoped `taskkill`.
- External servers/processes are **not yours to kill**; inspect read-only and report blockers.
- Do not use precise file size or mtime sameness as proof of SQLite logical identity. WAL/SHM checks alone are insufficient to prove content sameness.
- Reading user secrets, copying real `.dev.vars`, printing environment values, uploading databases/files or creating remote services is forbidden.
- Build output needs secret-leak guard (`publishable output is clean: dist`) **and** a verified isolated plugin state root.

### 4.2 Current authority for tools/commands

**ALLOWED for this documentation-only request:** creating/updating only `AGANT.MD`, `HANDOFF.MD`, and the optional `AGENTS.md` pointer. No project execution is authorized by this document request.

For a separately authorized engineering task, safe preparatory commands **after confirming root and no secrets in output** include:

```powershell
Set-Location 'I:\WORK\InjazDocs'  # only if this is verified to be today's root
Get-Location
git status --short                 # read-only; inspect, do not clean
git log -1 --format='%h %s'       # read-only
git diff --name-status           # read-only; file names, no secret contents
Get-ChildItem drizzle/migrations -File | Select-Object Name
Get-ChildItem docs/transition-2026-10-21 -File | Select-Object Name
```

Safe **candidate** validation commands only after reviewing the scripts and proving their environment cannot access protected state:

```powershell
node node_modules/typescript/bin/tsc -b --pretty false
node node_modules/oxlint/bin/oxlint src server worker shared tests scripts
node node_modules/vitest/vitest.mjs run tests/transition-2026-10-21 --reporter=default
```

Note that `tsc -b` can write build-info caches. They are not a substitute for authorization to change production code. Do not blindly run `pnpm build`, `wrangler dev`, `playwright test`, `pnpm db:*`, or `scripts/e2e-server.mjs` without successful isolation preflight; previously they could access protected paths. `pnpm audit --prod` may involve registry network; do not run when network has not been authorized.

**Explicitly forbidden absent separate owner permission:** remote Cloudflare operations, any migration on developer/remote DB, staging creation, deployments, changes to real credentials, Git commit/push/reset/clean/rebase/branch switch, installing/upgrading dependencies, changing infrastructure, or broad cleanup.

---

## 5. Current remediation architecture — new high-risk contracts

### D-1 — Idempotency / replay authorization

- Ledger keyed by `(actor_id, idempotency_key)` and request fingerprint; new witness metadata in migration `0008`.
- Keep committed-effect witness for **30 days** (as reported), while the **replayable response** expires after **1 hour**. Lifetime limits must be disclosed; no claim of exactly-once forever.
- Never delete an executed-effect witness simply because a user's roles/overrides changed. Once the response expires, `409 IDEMPOTENCY_RESULT_EXPIRED` must **not execute again** while witness exists.
- Replay any response only after reauthorizing the **current session, permission and case/object scope**. Unknown replay policies fail closed and do not trigger a new action.
- `IN_PROGRESS` must not be blindly duplicated; `UNKNOWN` must never auto-execute; request-method/path/query/body fingerprint mismatch must produce explicit conflict.
- Only use retry keys for one logical user action; independent operations require different keys. Client must not rotate keys after network/5xx/UNKNOWN/EXPIRED/policy-missing.
- Verify replay policy coverage for **all** idempotency-protected mutating endpoints: unknown routes must be triaged as regression risks, not dismissed merely for returning 403.
- Tests in a fake-auth sqlite harness are **necessary but not sufficient**; validate actual Hono/Better Auth/Cloudflare D1 semantics in isolated integration.

### D-2 — CSV import identity and resumability

- `importId` + `actor_id` identify a partial import operation, which is bound to a **canonical parsed-file fingerprint** (`csv-v1`, Unicode normalization and preserved row order), not filename alone.
- Same import + different content, headers or row order ⇒ `409 IMPORT_FILE_MISMATCH`; old operation with null fingerprint ⇒ fail-closed `409 IMPORT_FINGERPRINT_MISSING` without overwriting history.
- Preserve per-row `IMPORTED`/`FAILED`, `PARTIAL`/`COMPLETED`, safe resume with no double creates. This is **not** all-or-nothing across the entire CSV by default.
- Match preview and commit fingerprint canonicalization. Avoid unbounded payloads and avoid collisions for distinct actors/imports. Historical rows, encoding variants and large datasets are not yet verified.

### D-3 — Auth, user creation and Bootstrap compensation

- Never permit privileged orphan accounts, silent failed compensation, false success or exhausted bootstrap without an active admin.
- Capture compensation incidents with stage/correlation/residual ID, no passwords/secrets, and explicit recovery state.
- Honor last-admin protection. Compensation ordering and concurrency must be verified with **real Better Auth** and D1 semantics; simulated auth tests alone cannot close this gate.
- Avoid admin or account cleanup without a grounded identity and owner authorization. Prefer adding isolated failure injection hooks outside production paths; do not leave dangerous testing controls live.

### Schema readiness

- Latest reported `/api/v1/health/live` remains liveness; readiness must report 503 `upgrade_required` on schemas below required version and must never silently migrate.
- The schema gate is not a deployment permit. Test `0007→0008` on populated synthetic data before considering any real database action.

---

## 6. Old outstanding engineering risks — do not lose these

1. Reminder Cron may still expend substantial time on due-but-nonproductive rows after catch-up and is not fully performance-closed.
2. Reminder scheduler concurrency/reconciliation under actual concurrent Workers remains unverified.
3. Reminder calendar/day offsets around Cairo midnight and DST are unresolved owner/business semantics.
4. Large reminder-rule recalculation can hit D1 batch/statement limits (historic 2,000 statement guard); avoid silent partial updates.
5. `CUSTOM_FOLLOWUP` lacks owner-defined behavior.
6. Local transport workaround around ~320 ms in `vite.config.ts` has had success in local E2E but root cause and impact were not fully proven; inspect current implementation before altering.
7. Real remote R2 upload/download parity, multi-isolate Workers, staging readiness and production monitoring are untested.
8. General API rate limits, cross-isolate auth rate limit, CSP/HSTS and some API docs remain incomplete.
9. Booking `expected_containers` synchronization and file/storage quotas are not closed.
10. Full AR/EN accessibility (screen reader), comparable visual QA vs premium reference, 200% zoom and real performance validation remain open.
11. Git working tree contains substantial historical changes. Do not lose or overwrite WIP; do not infer clean repository or safe commit.

---

## 7. Verification procedure for any future authorized checkpoint

**Phase 0 — Authorization & evidence**

- Read `HANDOFF.MD` first. List owner authorization, exclusions, planned files, migration effects, evidence needed, and STOP criteria.
- Verify the current tree and Git status, identify relevant source modules and data-contract dependencies. Confirm previous work not already modified by another agent.
- Read both passing and failing evidence, including counterexamples and report caveats.

**Phase 1 — Isolation (a hard preflight gate)**

- Inventory running processes without reading secrets or killing anything. Prove runtime, build, test scripts and cleanup use only a new disposable state root. Confirm the fail-closed isolation guard cannot fall back to `.wrangler/state` even on subprocess crashes/shutdown.
- Record protected path metadata before/after (counts/sizes/mtime), recognizing third-party writers may change it. Any unauthorized access means STOP and record incident.

**Phase 2 — Compatibility & contract mapping**

- Inventory actual mutations/GET APIs, version gates, auth/case scoping, idempotency middleware and replay policies. Compare migrations expected by the code against the isolated test DB.
- Identify contract differences before editing. Never weaken tests solely to make them green.

**Phase 3 — Isolated tests and targeted fixes (only if authorized)**

- Verify clean `0001→0008` and **populated `0007→0008`** with preservation of business values, foreign keys, ledger/import historical behavior and reversal/forward recovery plan.
- Execute positive/negative D-1/D-2/D-3 integration with actual app middleware, auth and database adapter where possible; test same-key replay, permission loss, metadata/body expiry, UNKNOWN, alternate CSV, stale imports, orphan compensation.
- Fix only demonstrated defects within authorized scope. Keep migrations additive, audit the diff, run targeted tests, rerun regression.

**Phase 4 — Regression / performance / visual evidence**

- Only after a successful isolation gate, run static checks, unit tests, E2E twice after the **last edit**, with exact counts, stderr, request denominator and zero unexpected transport faults.
- Validate backend permission scope and frozen business cases. Measure performance separately from functional PASS. For UI work, compare the chosen 2 references against actual desktop/tablet/mobile AR/EN screenshots and check geometry, not just `scrollWidth`.
- If an environment cannot be safely started, mark `BLOCKED_ISOLATION` and continue only source/static/isolated unit work.

**Phase 5 — Handoff / STOP**

- Produce a comprehensive **Arabic** final engineering report, evidence ledger, before/after metrics, modified file list and rollback/readiness constraints.
- Explicitly distinguish PASS, FAIL, PARTIAL, NOT_RUN, BLOCKED, UNVERIFIED and owner decisions. Include what changed, what did not, what might have broken, and what remains open.
- Propose **one bounded next checkpoint**, but do not launch it. Update `HANDOFF.MD` only with actually observed new state when that update is explicitly in scope; never rewrite decisions to appear approved.

---

## 8. Owner decision register — standing policy

| Decision | Current standing |
|---|---|
| Business Rule C | **APPROVED/FROZEN**, including exceptional corrections and immutable revisions |
| BANK vs DIRECT, documents vs cargo, manual DHL, truthful ETA/container numbers | **APPROVED/FROZEN** |
| Premium Operations Workspace visual direction | **APPROVED AS REFERENCE**, final implementation **NOT APPROVED** |
| Tailwind v4 and limited Lucide React icons | **ACCEPTED DESIGN APPROACH**; package changes not blanket-approved |
| D-1/D-2/D-3 | Owner explicitly authorized **local isolated implementation/test**; integration and release still subject to new gates |
| Migration `0008` | Source addition locally reported; **NO** developer/remote migration authorization |
| Developer `.wrangler/state` and all historical fixtures | **PRESERVE**; no mutation/migration/cleanup; isolation must be demonstrated first |
| External cloud, staging, production, secrets | **NO AUTHORIZATION**; each needs distinct explicit approval |
| Git actions | **NO AUTHORIZATION** to commit/push/reset/clean/rebase; inspect only |
| Reminder unresolved semantics (`CUSTOM_FOLLOWUP`, Cairo calendar) | **OWNER DECISION REQUIRED** before implementing new semantics |
| Proposed checkpoint ET-2026-10-21-B | **PROPOSED, NOT AUTHORIZED BY THIS FILE REQUEST** |

---

## 9. Agent final reporting contract

Each authorized task concludes with an Arabic report that covers, at minimum:

1. Date, exact root, authorization and exclusions; agent/tool versions.
2. Actual Git HEAD/status before/after with privacy-safe output; changed and untracked file list.
3. Project/domain invariants and touched contracts; backend authorization and routes.
4. Baseline and delta: what was already done, what changed now, what was tested, what failed.
5. Isolation proof including subprocess startup/shutdown, protected-path metadata and possible foreign writers.
6. Migrations tested, exact DB roots, schema versions, historical-data preservation and missing evidence.
7. D-1 replay/authorization/state/retention/cross-process results.
8. D-2 file identity, import partial/resume and legacy data results.
9. D-3 compensation incidents, bootstrap/session/last-admin results.
10. Full static/unit/E2E metrics with command, duration, exit code, retry count, denominator and evidence links.
11. Transport/performance/accessibility/visual testing results **separately** from functional test status.
12. Security, secrets, credentials, private documents and cloud/no-cloud confirmation.
13. Remaining P0/P1/P2 risks, owner decisions, deployment blockers and rollback constraints.
14. Per-gate `PASS/PARTIAL/FAIL/NOT_RUN/BLOCKED` with observed evidence.
15. A one-paragraph operator handoff: exact **safe next starting point**, preflight, STOP.

**Never claim:** a report's proposed plan was executed, isolated fake-auth tests equal real integration tests, passing Playwright proves a modern responsive design, identical DB byte count proves unchanged logical data, or additive schema changes are permission to apply them.

---

## 10. Start point and mandatory termination

**The next recommended engineering activity is a separately authorized `ET-2026-10-21-B — Isolated Runtime Integration & Migration Acceptance`** (or another specifically owner-approved scope). See `HANDOFF.MD` for the exact prerequisites. Until that authorization exists, perform no runtime engineering automatically.

**STOP after each authorized task. No automatic next checkpoint, cloud activity, Git action or migration.**
