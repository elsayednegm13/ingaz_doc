# ExportFlow — New AI Engineering Agent Handoff & Controlled Development Prompt

> Version: 2026-10-12 | Prompt language: English | Final report language: Arabic

> **Execution instruction:** Read this document in full and follow the numbered phases. Respect all authorization and STOP gates.

---

**Execution target:** ANY competent coding agent (Cursor replacement, Claude Code, Codex, Windsurf, Cline, etc.)

**Project:** ExportFlow / InjazDocs — export operations, bank-document and container tracking

---

## 0. OPERATING DIRECTIVE — READ THIS IN FULL BEFORE TOUCHING THE PROJECT

You are the incoming engineering team. Work at the standard of:
  - Principal Software Engineer / Software Architect
  - Staff Backend Engineer (Cloudflare Workers, Hono, D1, R2, Better Auth)
  - Staff Frontend Engineer (React, TypeScript, Vite, enterprise UI, AR/EN RTL)
  - Staff Product Engineer (export/shipping domain correctness)
  - Staff QA, Application Security and Release Engineer

### Mission

(1) Thoroughly understand the EXISTING application, its actual code, architecture,
    business workflows, tests, data, previous architectural choices and known gaps.
(2) Reconstruct and preserve the owner's agreed ExportFlow product and workflow.
(3) Produce persistent, evidence-backed architectural documentation and a concise
    project memory so any future AI coding agent can resume safely.
(4) Start improving the existing project with ONE focused, high-value, locally
    verified vertical slice, not a rewrite, subject to the safety gates below.
(5) Produce an honest final Arabic report and STOP. Never silently start the next
    checkpoint or deploy to a remote service.

This is an EXECUTION prompt, not merely a request to propose a solution.
However, do not confuse authorization to edit LOCAL application code with
permission to create cloud resources, deploy, mutate production, remove data,
change Git history, or purchase services. Those are NOT authorized.

The prior agent's reports are evidence of what that agent SAID it did, NOT
independent proof of the current filesystem, runtime or product quality.

IMPORTANT: The actual repository and its instructions are the only proof of
what is IMPLEMENTED. The OWNER'S explicit product decisions in this prompt
control what SHOULD be implemented. Reconcile differences transparently.

---

## 1. READ-FIRST PROTOCOL: INVESTIGATE BEFORE EDITING

**A. Locate the real workspace.** A previous report mentioned:
      I:\WORK\InjazDocs
   This is a historical clue, NOT a hardcoded assumption. Confirm the current
   working directory and discover project root. Do not traverse unrelated
   folders or access other clients' repositories.

**B.** Read all relevant first-party project material BEFORE proposing changes:
   - README*, package.json, lockfile, pnpm-workspace.yaml, tsconfig*, vite config,
     wrangler config, build/test/lint configuration, .gitignore, .env.example and
     .dev.vars.example (do NOT print or copy real secret values).
   - Any actual AGENTS.md, custom instructions, agent rules, ADRs, relevant
     workspace guidance, without treating pasted past prompts as guaranteed facts.
   - All first-party source under src/, server/, shared/, worker*, scripts/,
     drizzle/, migrations/, tests/, e2e/, and related definitions/services.
   - All current docs/ files; in particular architecture, workflows, data model,
     requirements, reminders, security, release, status, implementation matrix,
     QA reports, and previous checkpoints if present.
   - Schema, migrations, routes, validators, authorization checks, UI states,
     locale dictionaries, CSS/tokens, test fixtures and test infrastructure.
   - Public assets necessary to inspect actual product UI and branding.

   Read first-party source comprehensively with a practical method: inventory
   every module/file and inspect its interfaces and behavior. Skip generated
   dependencies, caches, dist/, node_modules/, .wrangler* contents, binary blobs,
   secret file bodies, and temporary files. If context is limited, walk by module
   and persist a coverage ledger. Never claim 'read the whole project' if files
   or major modules were omitted. Use search/indexing to map the entire codebase;
   then deep-read high-risk or high-value files instead of superficial sampling.

**C.** Read previous checkpoint files IF AVAILABLE, but verify claims in code:
   docs/ARCHITECTURE.md
   docs/DATA_MODEL.md
   docs/WORKFLOWS.md
   docs/REMINDERS.md
   docs/SECURITY.md
   docs/REQUIREMENTS_MATRIX.md
   docs/IMPLEMENTATION_STATUS.md
   docs/CHECKPOINT_02_FINAL_REPORT.md
   docs/CHECKPOINT_02_1_FINAL_REPORT.md
   docs/CHECKPOINT_02_2_FINAL_REPORT.md
   docs/CHECKPOINT_02_2_PLAN_ALIGNMENT.md
   docs/CHECKPOINT_03_FINAL_REPORT.md
   docs/CHECKPOINT_03_REQUIREMENTS_RECONCILIATION.md
   docs/CHECKPOINT_03_1_FINAL_REPORT.md
   docs/CHECKPOINT_03_1_OWNER_APPROVAL_REQUEST.md
   docs/CLOUDFLARE_STAGING_VERIFICATION_PLAN.md
   Search for equivalent filenames. Do not invent missing files or assume
   Checkpoint 03.1 ever ran; as of the last user-supplied report, the user
   repeatedly provided Checkpoint 03 rather than a verified 03.1 result.

**D.** Baseline: collect only safe metadata and evidence:
   - Current stack and exact versions from package manifests and installed deps.
   - Scripts, API route inventory, auth implementation, DB bindings/migrations.
   - What local data environment exists, without opening or changing user data.
   - Git status if Git exists. A previous report said Git was absent; verify.
   - Presence/absence and NAMES of secret variables, never their values.
   - Local/E2E data isolation; detect persistent .wrangler/state, .wrangler-e2e.
   - Existing unit/API/E2E tests and screenshot reports.
   - Current local ports and whether a service is already running.

**E.** Do not reset, regenerate, reseed or overwrite local D1/R2 state, fixtures,
   .dev.vars, or an existing credential. Create new isolated test state only.
   Never open unrelated projects' credentials, schemas or files.

**F.** No Git init/commit/push/branch reset/rebase or remote repo creation without
   separate owner authorization. A proposed commit command is not a commit.

**G.** If access to the filesystem, browser or test runner is missing, say which
   step is BLOCKED; continue with whatever evidence you DO have. No fake proof.

---

## 2. SOURCE-OF-TRUTH HIERARCHY AND CHANGE CONTROL

Use this priority order when documents or implementations disagree:
1. The owner's explicit product decisions and safety constraints contained in
   THIS handoff, supplemented by verifiable later owner instructions.
2. Explicit approved architecture decisions in actual project docs, unless
   contradicted by the owner; maintain a decision log of conflicts.
3. Executable current code/schema and real runtime evidence for IMPLEMENTED
   behavior — not as authority to redefine product requirements.
4. Existing requirements matrices and historical checkpoint reports, labeled
   as unverified until correlated to code and tests.
5. Your own engineering recommendations, clearly labeled PROPOSAL; do not
   silently make new business rules or invent external integrations.

For each business requirement, distinguish:
AGREED / IMPLEMENTED / VERIFIED LOCALLY / VERIFIED REMOTELY / PARTIAL /
MISSING / DEFERRED BY OWNER / BLOCKED / NEEDS OWNER DECISION.
Do NOT mark a requirement DONE merely because a UI exists or an old report says PASS.

Protect accepted architecture. Favor narrow, testable changes preserving API,
data and workflow compatibility. No rewriting in another framework simply
because you prefer it. No broad library upgrades or styling changes without
problem evidence and owner authorization.

---

## 3. PRODUCT PURPOSE — WHY THIS SYSTEM EXISTS

The company exports physical products internationally. Staff previously used
Excel and folders to follow invoice documents, original paper documents,
bank review/handover, DHL courier dispatch and receipt, vessel bookings,
multiple containers, loading/departure/arrival dates, and customer delivery.
The application is an INTERNAL operations-management and traceability tool:
accurate next actions, reliable reminders, document readiness, cargo progress,
customer-visible tracking, audit history and configurable access control.

This is NOT a new CRM, ERP, accounting/billing system, payment gateway,
freight-forwarding marketplace, SaaS multi-tenancy implementation or full
shipping-carrier integration. Initially ONE exporting organization has many
external customers and many internal employees. Never invent tenants.

Business outcomes for an authenticated employee:
- See each case's current stage, owner, blockers and next required action.
- Know which commercial and regulatory documents are missing/under review.
- Know whether original documents are with the bank or dispatched directly.
- Open official courier tracking link and manually record actual observations.
- Track each booking/container independently and all planned vs actual dates.
- Receive configurable, timely, condition-aware reminders; safely snooze them.
- Share a limited, revocable, public link so the buyer can follow documents
  and cargo without exposing internal bank, finance, staff or private files.

---

## 4. AGREED ARCHITECTURE AND SYSTEM BOUNDARIES (DO NOT REWRITE)

Historical implementation reported (confirm all in actual files):
- React + TypeScript + Vite; @cloudflare/vite-plugin.
- Hono REST API on Cloudflare Worker at /api/v1.
- Better Auth session cookies, HttpOnly; no public sign-up.
- Cloudflare D1 (SQLite dialect) for structured relational/business data.
- Cloudflare R2 private object storage for PDF/attachment bytes; NOT D1 blobs.
- Drizzle migrations/schema where confirmed; pnpm; local Wrangler/workerd.
- Playwright E2E against a dedicated local test database; tests for domains.
- AR/EN with RTL/LTR; designed as an operations control tower, not generic ERP.
- In-app reminders generated by cron/scheduled Workers + persistent DB state.
- Carrier tracking remains manually updated in V1.

Logical diagram / proposed canonical bounded contexts:

                         AUTHENTICATED EMPLOYEE UI
               (React/Vite, accessible AR/EN, RTL/LTR)
                                    |
                         /api/v1 Hono Worker
                                    |
               +--------------------+-------------------+
               |                    |                   |
         Auth/RBAC/Scopes      Business Services     Notifications
               |                    |                   |
               +----------D1 relational data------------+
                                    |
                          File metadata / grants
                                    |
                        R2 PRIVATE document bytes

      PUBLIC CUSTOMER TRACKING (opaque limited-scope token)
                            -> dedicated safe projection
                            -> case document-route + cargo-route statuses
                            -> NO access to internal raw entities or files

                 WORKER SCHEDULED HANDLER (UTC cron)
                            -> evaluate DB-backed rules
                            -> deduplicate / resolve / deliver notifications

Core aggregate connections:
 Customer (profiles + addresses + contacts + authorized bank metadata)
   | 1:N
 Export Operation/Case  [PRIMARY WORKFLOW AGGREGATE]
   +-- customer snapshot at transaction time
   +-- 1:N Invoices (FOB/CFR, finance, ports, weights, terms)
   +-- 1:N document requirements -> 1:N file versions/reviews/scans
   +-- 1:N physical-original/bank submissions & review/correction events
   +-- 1:N courier consignments & manual DHL events
   +-- 1:N sea bookings -> 1:N container slots -> 1:N container events
   +-- 1:N reminder instances / alerts / activity events
   +-- 1:N revocable public customer tracking links

   Cross-cutting:
   Users -> roles + permissions + per-user grants/denies + case data scope
   Custom field definitions -> typed per-entity values + access rules
   File upload sessions -> private R2 objects + metadata + access checks

The above is a DOMAIN CONTRACT and mental model, not a guarantee that every
relation is already implemented. Discover actual naming and bridge via mapping.
Avoid a giant denormalized invoice row and avoid making booking == container.

---

## 5. COMPLETE AGREED BUSINESS REQUIREMENTS — ACCEPTANCE SOURCE

5A. CUSTOMER MANAGEMENT
- Reusable customer/company with legal name, destination country, address(es),
  phones and other contacts, contact people and multiple bank accounts where
  appropriate, email, tax identification, notes and configurable extra fields.
- Selecting a customer prepopulates forms, but the operation retains a
  timestamped snapshot of historical customer details used in that transaction.
- Keep sensitive bank data confidential; earlier local app reportedly stored
  last-four display only. Do not collect/store plaintext full IBAN/account
  numbers until owner-approved encryption, key management and access control
  are actually present. No bank data in public links or ordinary CSV exports.

5B. EXPORT CASE AND INVOICES
- Export Case is the main unit of work; may have multiple invoices, bookings,
  document consignments and container slots (even if V1 UI has primary invoice).
- Invoice: invoice number/date, customer, country, Port of Loading, Port of
  Discharge, incoterm, payment terms, goods value, actual freight expenses when
  relevant, invoice value/total as EXPLICIT commercial amount, currency, gross
  weight, net weight, unit, other invoice notes/custom data.
- Gross weight >= net weight after consistent unit normalization. Earlier
  implementation reportedly stores minor-unit integers for money and grams
  for mass. Preserve strategy unless proven defective; verify conversions.
- Distinguish 'port of loading' from 'port of discharge' and destination.
- FOB and CFR are Incoterms (not cargo transport modes). Do not silently
  compute invoice total as goods + freight. FOB usually excludes seller-paid
  main ocean freight in pricing but does not forbid recording other incurred
  shipping expenses. CFR includes seller-paid agreed ocean carriage; still do
  not impose a universal total equation. Keep cargo freight expenses separate
  from commercial invoice freight component when needed.
- Payment terms: T/T, L/C, D/P, D/A, Other, plus editable details, due dates
  and milestones where appropriate. They are separate from bank-document route.
- Proposed future Incoterms beyond FOB/CFR can be configured, not assumed done.

5C. DYNAMIC FIELDS AND DOCUMENT REQUIREMENTS
- Admin can define typed custom fields at least for: customers, invoices,
  cases, bookings and containers. Define key, AR/EN label, type, requiredness,
  choices/options, visibility/sensitivity, order, active status and safe
  validation. User can fill/edit values in the relevant real forms; values
  persist, return in authorized API and render after refresh. Do NOT hardcode
  every extra field as a schema column or make all fields untyped JSON blobs.
- Core indexed/searchable finance and workflow properties remain first-class
  schema columns; custom fields are supplemental.
- Document checklist is per case, derived optionally from editable templates;
  NOT a universal unchangeable set. Staff with permission can add/waive/remove
  required or optional items with audit trails and reason for waivers.
- Example types (NOT globally required): Certificate of Origin, Bill of
  Lading, Commercial Invoice, Packing List, Technical Certificate, other
  professional certificates, Bank Cover Letter, Booking Confirmation PDF.
- Each item supports versioned PDF scans/files, uploader, reviewer, status,
  rejection/correction, dates, notes, checksums/size where available.
  Upload != review approval; required approved or explicitly waived items
  determine readiness; missing required items block relevant workflow.

5D. PAPER ORIGINALS AND DOCUMENT DELIVERY ROUTES
- Paper originals are physically prepared for handover; staff scan and save
  PDF before delivering them. Uploaded scan is evidence of digitization, not
  proof of physical handover or bank acceptance.
- BANK_ROUTE: prepare + scan + internal check -> hand original documents to
  bank -> bank review/approval or correction cycle -> bank dispatches originals
  by courier/DHL -> recipient confirms delivered.
- DIRECT_ROUTE: prepare + scan + internal check -> company sends originals to
  recipient via courier/DHL -> recipient receives. Bank-specific stages must
  NEVER block a direct-route case.
- Each transition must be authorized, guard prerequisites, record actor/time,
  return human-readable errors, and update next-action/reminder projections.
- Allow corrections/resubmissions and properly audited route changes.
- Multiple courier consignments/attempts may be needed. DHL tracking V1 is
  MANUAL only: employee enters number, courier, sender, dates and manual
  status events; clicking official carrier link is allowed where validated.
  No claimed live DHL API, GPS events or guessed delivery dates.

5E. BOOKINGS, UCR, SHIPS AND CONTAINERS
- Booking Confirmation has its own reference number AND downloadable/scanned
  PDF, optional UCR, shipping line, vessel/voyage when known, ports, loading
  date/cutoff, planned ETD and ETA, actual departure/arrival, dates and notes.
- Booking has an EXPECTED number of container slots, e.g. 5. The customer
  may receive the actual official container numbers only later: maintain 5
  slots with 0..5 known numbers and zero invented numbers.
- Container numbers optionally validate official ISO 6346; no false numbers.
- Each individual container can load/depart/arrive/get released/get delivered
  at different times; maintain separate event and status history. Booking-level
  aggregate statuses MUST reflect individual counts, not first event only.
- Shipping Schedule must make load/ETD/ETA and cutoffs easy to monitor,
  including future vs overdue, planned vs actual, list/calendar or clear
  suitable interface. UCR may appear within booking and scheduling surfaces.
- Vessel arrival at destination port != final goods delivery to customer.

5F. PARALLEL TRACKING + COMPLETION
- Two INDEPENDENT progress tracks on every export case:
  (1) original documents scanned/reviewed/bank-or-direct/courier delivered
  (2) goods bookings/containers loaded/departed/arrived/released/delivered
- User-facing overview and public share show true stages with known dates.
- A case cannot become COMPLETED merely because the vessel arrived at port.
  Closing conditions require document delivery completed AND expected
  non-cancelled containers delivered to customer, or an explicitly authorized
  documented closure exception where the existing architecture supports it.
- Changes retain history. Do not replace precise stages with an invented %.

5G. EVENT/CONDITION-BASED REMINDERS — CRITICAL PRODUCT FEATURE
- Rules are configurable by authorized admin/user where policy allows:
  before or after milestones, offsets in days/hours, recipient, business days
  vs calendar days, recurrence, snooze duration, priorities, mandatory alerts.
- Examples: missing documents after specified days, bank-review delay,
  planned loading reminder 3 days before, X days after ACTUAL vessel departure,
  approach or overdue ETA, courier still not delivered after shipping.
- Reminder instances have persistent business key/condition generation,
  due_at, status (pending/active/snoozed/resolved etc.), actor/owner,
  snoozed_until and audit state. Cron handles due reminders while nobody is in
  the app, with concurrency-safe deduplication and idempotent delivery records.
- Snooze is NOT completion. If a missing-document alert is snoozed for 3 days
  but the employee uploads the missing document and completes required review
  after 1 day, the old alert must be automatically resolved immediately.
- After the document moves to its next legitimate stage, next-stage reminder
  can start BEFORE old snooze deadline, never blocked by stale snooze.
- Upload without approval should NOT automatically mark a required document
  complete if approval is required. Updating booking ETA or container status
  must cancel/recompute stale reminders. Respect company timezone for dates.
- Provide human-understandable notice, linked next action, due/overdue views,
  personal preferences where allowed and admin mandatory rules.

5H. EXTERNAL CUSTOMER TRACKING WITHOUT LOGIN
- Authorized staff issues unpredictable limited-scope token URL to customer;
  can create, expire, revoke, rotate/regenerate it. Old token stops instantly.
- Public view MAY show permitted case/invoice reference, destination, high-
  level documents milestones, manual courier tracking, bookings/container
  progress and planned/actual ETA as allowed on that share.
- Public view must NOT reveal internal bank data, financial amounts, bank
  identifiers, secret files, scans, staff activity or privileged notes.
- Token stored as HASH, separate safe public DTO/projection; no direct ORM
  serialization. Generic invalid/expired behavior, rate limiting, no-store,
  Referrer-Policy no-referrer, no accidental token logging or indexing.

5I. INTERNAL USER MANAGEMENT, AUTH AND RBAC
- No public registration. An authorized admin creates users and initial
  credentials/invite; secure session lifecycle, password changes, disable.
- MULTIPLE administrators and dynamically defined roles. Multiple roles per
  user and per-user permission grants/denials; menu, page, action AND DATA
  scopes. Effective authorization is computed and enforced server-side on
  every API/document/storage access (not just hiding UI links).
- Protect last effective active administrator from revocation, deletion,
  disabling or removing critical effective powers. Avoid privilege escalation.
- Case visibility restrictions must apply to booking lists, history, files,
  exports and related nested records; not just /export-cases detail.
- Errors must not leak confidential fields, permissions internals or IDs.

5J. LARGE FILES, STORAGE, IMPORT AND AUDIT
- Max single file size around 400 MiB; actual files may be 20/100/250 MiB.
- R2 stores private original bytes, D1 stores metadata/access/audit.
- Browser-direct multipart upload to R2 with securely scoped presigning,
  progress, bounded concurrency, retries, abort/finalize validation, orphan
  cleanup and resume when feasible for production-size files. Never send a
  single 400-MiB request through a Worker or load whole file in RAM.
- Local Worker-part fallback may exist but is NOT proof of cloud presigning.
- Preserve original scanned signed PDFs unchanged; don't silently recompress
  signatures or promise unrealistic compression ratios. Previews optional.
- File download authorization must bind exact key + requirement + case and
  correct actor, reject guessed R2 keys or cross-case attachments.
- Import from Excel/CSV should show understandable row-by-row preview and
  validation, not raw JSON. Preview does not write. CSV with quoted commas,
  BOM and escaped quotes must be robust, and import must be explicitly
  confirmed before writing. Export must honor data scopes and sensitivity.
- Activity log must show truthful ACTION LABELS in Arabic and English, actor,
  timestamp and context. 'نشاط مسجل' is NOT adequate for known key actions.
  Never leak secrets, complete bank numbers or raw stack traces in logs.

5K. MODERN PRODUCT UI, ARABIC AND ERROR EXPERIENCE
- Owner rejected generic/template dashboards. Design direction is a
  distinctive modern 'Export Operations Control Tower': strong information
  hierarchy, schedule and urgent-action focus, deliberate maritime identity,
  typographic quality, useful two-track journey and context-rich booking/
  document cards. Do not regress to a generic dark sidebar + 6 KPI cards.
- Internal Arabic must be truly professional, not partly English: all user-
  facing labels, validation, empty states, activity, reminder explanations,
  success/failure, hints and status names properly localized; full English
  equivalent. Arabic RTL, English LTR, numeric identifiers isolated LTR with
  bdi/dir, accessible controls, responsive mobile UI WITHOUT relying purely
  on unreadable horizontal tables, clear loading/error/empty/success states.
- Error contract may carry internal code/requestId, but the USER sees only a
  specific, actionable friendly message in their current language; never SQL,
  D1, stack trace, raw JSON, enum token, permission name or internal ID.
- Preserve form state on failure and show field-level help. No false success.
- Avoid excessive motion, stock dashboards and hardcoded sample data.
- Design is NOT owner-approved until user reviews actual screenshots; AI
  claims of 'modern' don't equal signoff. Collect desktop and mobile AR/EN
  screenshots for all main workflows; report missing captures honestly.

---

## 6. HISTORICAL IMPLEMENTATION CONTEXT — UNVERIFIED UNTIL YOU CHECK CODE

The owner's LAST RECEIVED AND REPEATED checkpoint was CHECKPOINT 03 with result:
LOCAL ONLY; STAGING BLOCKED; NOT PRODUCTION APPROVED; DESIGN NOT SIGNED OFF.
Do not treat this history as a license to skip repo discovery.

Historical agent reports claimed:
- React/Vite/Worker/Hono/Better Auth/D1/R2 local working.
- 26/26 Playwright tests passed in two complete local runs after repairs;
  19 unit tests; typecheck/lint/build completed. These are REPORTS, not current
  run evidence; verify independently and never inflate counts.
- Dynamic document requirement creation and human-readable error handling
  were fixed in Checkpoint 02.2.
- Custom fields were still PARTIAL/WEAK. Activity feed sometimes displayed
  generic Arabic 'نشاط مسجل'. The CSV parser split only on commas in certain
  cases. JS output bundle was reported ~510 kB (measurement may change).
- Isolated Playwright data under .wrangler-e2e/state; local developer data
  under .wrangler/state (as last reported), must never be wiped.
- Miniflare/Vite intermittently logged 'fetch failed'; prior tests included
  a cautious retry related to test isolation. Inspect for false positives.
- Rate limiting had a 30 request window; high concurrency 40 simultaneous
  requests sometimes destabilized LOCAL worker, while bounded concurrency
  reportedly worked. No production WAF validation.
- No Git repository was found on the previous workspace.
- No dedicated ExportFlow staging resources or R2 secrets were configured.
- Cloudflare inventory saw 'nexora-db' and 'nexora-project-files' reportedly
  belonging to another project: THESE RESOURCES ARE OFF LIMITS, always.
- Checkpoint 03 did not deploy any Worker, migrate remote D1 or upload real
  20/100/250/400 MiB objects. No remote success or production readiness.
- Checkpoint 03.1 was REQUESTED in earlier conversation, but a new verified
  03.1 FINAL REPORT was not received. Do not assume it ran.

Claims about staging cloud costs, production upload readiness, WAF, email,
backups, data durability or real carrier integration must be backed by actual
approved verification before appearing as PASS.

---

## 7. REQUIRED DISCOVERY OUTPUTS — CREATE THE AGENT'S PROJECT MEMORY

Create/update the following first-party documentation in docs/ (respect and
merge existing content; do not destroy earlier accepted information):

A. docs/AI_AGENT_HANDOFF.md
   A concise, continuously maintainable 'read me first' for all future agents:
   why the product exists, actual local run commands, implemented architecture,
   primary modules, current safe tests, environments, known gaps, last safe
   checkpoint, what the next agent MUST NOT do, and links to detailed docs.
   Do not paste credentials or personally identifying customer production data.

**B.** docs/ARCHITECTURE_RECONCILIATION.md
   High-level C4-ish architecture and Mermaid diagrams for components and the
   main aggregates; mapping of the blueprint from section 4 to ACTUAL schema,
   services, routes and UI files. Annotate discrepancies as gaps/proposals.

**C.** docs/DOMAIN_WORKFLOW_CONTRACT.md
   A practical state-machine walkthrough for:
    customer -> case -> invoice -> requirement -> reviewed version
    bank route vs direct route -> physical handover -> manual courier delivery
    booking -> container slot -> numbered container -> port -> final delivery
    reminder due -> snooze -> condition change -> auto-resolution -> next alert
    customer share create -> rotate -> revoke -> expiry
   Distinguish source of truth, actual implementation and required future work;
   include invariant/transition guards and a chronological example.

**D.** docs/REQUIREMENTS_AUDIT_FOR_NEW_AGENT.md
   Requirement ID; owner intent; source decision; actual implementation paths;
   tests/evidence; completion category; severity; smallest next fix.
   Cover ALL section-5 domains. Use an explicit UNKNOWN value when unverified.

**E.** docs/NEW_AGENT_BASELINE.md
   Actual workspace/tooling, nonsecret config presence, current local data
   safety status, exact test commands/results, failed command logs trimmed to
   nonsecret excerpts, all skipped items and environmental limits.

**F.** docs/TECHNICAL_DECISIONS_AND_RISKS.md
   Keep/drop/propose decisions with reasons. Highlight Cloudflare staging gate,
   D1 SQLite constraints, R2 400 MiB multipart risk, Better Auth, case-scoped
   authorization, secret handling, rate limiting, cron/idempotency, bank-data
   limitations, backup/restore gap and UX signoff.

**G.** docs/NEW_AGENT_FINAL_REPORT.md
   Mandatory Arabic final implementation report per section 12. The report
   must state separately: REPO STUDIED, LOCAL TESTED, CLOUD VERIFIED and
   OWNER APPROVED. None may be implied by the others.

If a file already exists with equivalent purpose, update it instead and
write an index that points to existing files; avoid documentation duplication.

---

## 8. THIS RUN: CONTROLLED FIRST DEVELOPMENT SLICE (NOT A FREE-FOR-ALL)

Perform the phases below IN ORDER. Do not start phase C until A/B provide a
clear causal diagnosis, compatible design and safe local test setup.

PHASE A — FORENSIC RECONSTRUCTION / ZERO FUNCTIONAL MUTATIONS
  1) Complete sections 1, 2, 4 and 7 baseline coverage.
  2) Draw actual module and data flow maps: HTTP request -> auth -> handler ->
     permission -> validation -> D1/R2 -> response -> React UI -> events.
  3) Read ALL existing docs and first-party source inventory; identify critical
     event-handling points for data mutation and reminder recomputation.
  4) Read the current authoritative code for each workflow. Create the
     traceability matrix and a ranked gap list, with evidence not guesses.
  5) Identify local test isolation and which test commands could erase data.

PHASE B — TEST CURRENT BASELINE, SAFE LOCAL ONLY
  1) Do not install/upgrade indiscriminately. If dependencies already present,
     test as-is; if missing, inspect project scripts and lockfile first.
  2) Safely run permitted read-only-ish validation: typecheck, lint, build,
     unit tests. Run Playwright ONLY after verifying its isolated DB cleanup
     scope and that no production/local DEV data are affected. Never point
     E2E at real user data or a cloud DB.
  3) Capture screenshots (if browser available) at minimum Arabic desktop +
     mobile dashboard, case detail, documents, bookings, reminders, customer
     public tracking and English counterpart. Evaluate visual/RTL flaws from
     evidence; do not claim visual signoff.
  4) Investigate any failures. If a test can pass via blind retry after a
     real product failure, mark it unstable; do not conceal that failure.
  5) Preserve exact baseline counts, exit codes and verifiable evidence.

PHASE C — THE ONE APPROVED LOCAL FEATURE SLICE
  Priority 1: finish the previously reported PARTIAL dynamic CUSTOM FIELDS
  feature, but ONLY after verifying which parts already exist.

  Minimum vertical acceptance of this feature:
  - An authorized admin can define a typed custom field for supported entity
    types from the existing agreed data model; can edit label/options/order,
    safely disable, and see AR/EN user-friendly validation.
  - A permitted employee sees it in the relevant customer/case/invoice/booking/
    container form or detail view; creates/updates a value using the actual API.
  - Values persist after page reload; no forged entity_type/entity_id grants
    cross-case/customer access; sensitive fields obey restricted visibility.
  - Draft vs finalized required-field enforcement is coherent and tested.
  - Deleted/deactivated definitions do not destroy historical values.
  - Existing core fields and migrations preserve all prior data.
  - Add focused tests for type-validation, RBAC, unauthorized direct API,
    persistence and AR/EN RTL UI. Do not mark overall custom fields DONE if
    only a single entity type works; document exact supported matrix.

  Follow existing code patterns; avoid reinventing tables/APIs if they exist.
  Implement in small coherent increments; review migration risk first. If
  schema changes are required, create forward-only migrations and apply only
  to a disposable local test database initially. Do NOT migrate persistent
  developer D1 state without explicit owner approval and a reviewed backup.

  If complete cross-entity custom fields exceed feasible scope, implement and
  prove ONE clearly bounded end-to-end subset (e.g. Customer custom fields)
  and mark the rest PARTIAL. Never fake a complete feature with UI placeholders.

  OPTIONAL ONLY IF THE FIRST SLICE IS COMPLETE AND TESTED:
  - Localize known, structured activity log action types to meaningful AR/EN
    descriptions, with safe fallback for truly unknown legacy events.
  - Improve CSV import preview/parser, preserving true row-level errors.
  These are suggestions, not permission to turn one run into an unbounded
  redesign or an unrelated feature rollout.

  Absolutely do NOT begin Cloudflare resource provisioning, real R2 upload
  validation, production data migration, owner-facing design signoff, live DHL
  integration, new external email integration or Git mutating actions here.

PHASE D — CLOSE & HAND OFF
  1) Run the most relevant focused unit/API/E2E tests, then applicable full
     typecheck/lint/build and safe full E2E where practical.
  2) Re-audit case data scopes, field sensitivity, Arabic errors, DB migration
     compatibility, release safety and accessible frontend states.
  3) Update persistent AI_AGENT_HANDOFF and all traceability documents.
  4) Write the mandatory Arabic FINAL_REPORT, summarize in agent chat, STOP.

---

## 9. TEST ACCEPTANCE CONTRACT (NO SUCCESS BY ASSERTION)

- Real requests against local Worker + isolated D1 and local R2 fixtures.
- Verify no unrelated environment is read/written or reinitialized.
- Add tests for any bug fixed; reproduce root cause first when safe.
- User-flow tests verify DB change and persisted UI state, not just a success
  toast or that a button clicked without throwing.
- Test session, RBAC, last-admin, case scopes, no cross-case R2 access.
- Test at least one bank vs direct case state guard, courier is MANUAL,
  booking with expected 5 slots but only 2 numbered, independent cargo track.
- Test reminder: snooze while documents missing; upload + review/approve
  before wakeup; old alert resolves, next review alert only when applicable.
- Test public link token revoke/rotate and no restricted bank/financial data.
- Test AR/EN, RTL, mobile, field errors, no raw SQL/stack/enums in UI.
- Test abnormal responses: unauthorized 401/403, invalid input 422, illegal
  transition 409, expired link, file upload incomplete/aborted.
- Never report tests as run if only test files exist or old report claims pass.
- A failing full suite prevents unqualified PASS, even if a single retry passes.
- No claim 400-MiB remote upload passed if Cloudflare was not tested with
  explicit owner approval. No claim production readiness from local E2E.

---

## 10. ARCHITECTURE AND UX GUIDELINES FOR FUTURE DEVELOPMENT

- Backend should enforce state transitions; do not let frontend invent stage
  progression. Use user-friendly error DTO and safe internal structured logs.
- Prefer type-safe shared contracts and schema validation; keep end-to-end
  data mapping explicit. Avoid floats for monetary persisted values.
- Keep immutable audit/event history for sensitive transitions.
- Perform authorization at query level for case lists and related entities.
- Compute next-action and reminders from legitimate source events and
  conditions. Avoid time-derived fantasy shipment status.
- Avoid heavy UI animation; respect reduced motion. Distinct identity and
  operational usability matter more than cosmetic gradients.
- Mobile workflows need meaningful cards/summaries, not clipped tables.
- Current D1/R2 local bindings are not proof of real Cloudflare readiness.
- Future staging MUST use brand-new explicitly approved ExportFlow-only D1,
  R2 and Worker, never the existing nexora-db / nexora-project-files.
- External integrations must be tagged 'manual' until official API access
  and tested credentials/configuration are separately approved.

---

## 11. STOP / SAFETY CONDITIONS

STOP remote action whenever ANY of these is true:
- Cloud resources, budget, owner approval or safe isolated target not explicit.
- A target cloud account also hosts unrelated resources and isolation cannot
  be demonstrated.
- A config points to an unspecified or placeholder D1 database ID or R2 name.
- Work requires printing/committing secrets or secrets from external apps.
- A step would delete/migrate/reset persistent or remotely hosted user data.
- A tool asks for expensive/billable action not explicitly authorized.

For LOCAL work, if a necessary migration or operation could modify persistent
DEV data, do not do it until a safe backup + specific approval exist. Continue
in isolated test environment and mark developer deployment BLOCKED.

If essential domain ambiguity appears, apply existing agreed invariants and
finish a safe independently testable subset. Record the exact unresolved owner
question instead of inventing a bank/commercial policy.

---

## 12. MANDATORY FINAL REPORT FORMAT (ARABIC)

Create docs/NEW_AGENT_FINAL_REPORT.md with ALL sections:

01. FINAL RESULT: PASS / PARTIAL / BLOCKED / FAIL, and why. Scope = LOCAL.
    PASS requires all tasks in THIS bounded run completed with clean relevant
    tests; PARTIAL if only some; BLOCKED if an external approval dependency
    prevents required tasks; FAIL if a functional/security regression remains.
02. Workspace identification and source-read coverage ledger (total first-party
    files/modules found, read, omitted and why).
03. Owner requirement reconciliation: what was agreed vs actual code, each
    major domain, exact status, paths and test evidence.
04. Actual system architecture/mermaid description; real data and event flow.
05. Implemented local improvements: precise behavior and endpoints/UI screens.
06. Root causes for each bug, minimum safe fix, and regression proof.
07. User-visible AR/EN errors and UX screenshots audited; remaining design
    gaps, no owner signoff implied.
08. Changes list: created/modified files, schema/migration and data effects,
    with rationale. Do not expose secret values.
09. Test commands executed, exact pass/fail/skip counts, exit codes, runtimes,
    source of screenshots and reproduction if any failure remains.
10. Security evidence: auth/RBAC/data scope, private files, public tracking,
    last admin, rate limits, reminders, sensitive field exposure.
11. Local persistence protection evidence (which .wrangler dirs touched).
12. What remains unknown/unverified, cloud tests NOT RUN, any rollback risks.
13. Decisions requiring owner explicit consent and next recommended bounded
    checkpoint (DO NOT START IT).
14. One clear final status line and STOP.

The chat reply to the owner must be in clear Arabic, short compared to the
report, and link to the generated report within the workspace. If your tool
can attach local files, provide direct attached files too. Do not claim a
sandbox path exists unless the runtime actually created it.

---

## 13. EXECUTE NOW — EXACT ORDER

1. Verify the actual project root and inventory all first-party material.
2. Read and reconcile actual architecture/business logic against this brief.
3. Document an evidence-backed module map + workflow/data/state diagrams.
4. Verify safety and capture the current clean/dirty baseline.
5. Run isolated baseline tests where safe and record exact results.
6. Locate and improve the smallest viable dynamic-custom-fields vertical
   slice with real API + UI + authorization + persistence + tests.
7. If safe and feasible, complete the remaining dynamic-field entity types;
   stop before any unapproved migration or remote action.
8. Update the handoff documentation, requirements audit and owner report.
9. STOP. No automatic Checkpoint 03.2, no staging creation, no production.

The objective is a knowledgeable, careful, effective NEW agent taking over an
existing real product. Preserve existing value, trace product invariants,
prove changes, and hand the work back to the owner with evidence.


**END OF EXECUTION PROMPT**
