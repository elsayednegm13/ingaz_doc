# ExportFlow / InjazDoc — Business Requirements Baseline v0.3 (OWNER REVIEW DRAFT)

**Date:** 2026-10-23  
**Status:** `OWNER_STATED_PRELIMINARY — NOT FINAL BUSINESS APPROVAL — NO IMPLEMENTATION AUTHORITY`  
**Sources:** Owner's 45 questionnaire responses and follow-up OD-01..OD-08 answers on 2026-10-23; original export-department workflow clarification; existing `AGANT.MD` / `HANDOFF.MD`; latest reported `ET-2026-10-23-B` partial engineering checkpoint. No direct inspection of live Windows repo performed in this document.  
**Scope:** Business requirements only, not a claim of implemented software or a migration plan.

## 1. Product mission and terms

ExportFlow is the **internal operational workspace for a single company's export department**. It replaces fragmented spreadsheets/files/messages with a durable, authorized export case (`EF-…`) that connects quotations, one final commercial invoice, one current booking, UCR, documentary requirements, loading dates, planned/actual containers, financial terms, documentary courier deliveries, goods delivery, reminders and audit history.

**Quotation / عرض سعر (`QT`) is NOT an Invoice.** A quote has its own reference and may exist without a case. One final invoice may reference **multiple independently numbered quotations**; the eventual invoiced goods, prices and amounts may differ from the quotes. **Proforma Invoice is the company's name for the quotation / عرض السعر, not a third independent commercial document** (owner clarification `OD-01`). Quote and invoice identifiers have independent number spaces.

A final **Invoice / فاتورة تجارية** is a financial and operational record, not a simple amount: link the buyer snapshot, quote references, case, UCR, booking/booking PDF, loading/discharge ports, shipping line, container records, loading information, goods, freight, FOB/CFR, USD and payment terms. The **case**, not the invoice number, provides the stable reference for UCR and booking *before* the final invoice is created at the beginning of loading.

## 2. Owner-stated preliminary decisions — exact questionnaire mapping

Status of every line below: `OWNER_STATED_PRELIMINARY`, NOT developer authority to change code.

### A — Quotations and invoices

| ID | Owner statement | Interpretation / unresolved boundary |
|---|---|---|
| A01 | Invoice typically draws on quotation(s), and may increase/decrease/change during actual loading; store quotation reference(s). **Proforma = Quotation**, not a third distinct object (OD-01). | Invoice can be created before any quote is available; whether eventual linkage is mandatory at approval is not yet resolved (OD-03 remainder). |
| A02 | Quote may be created standalone or connected to an export case. | Case linkage can be later; no orphan deletion inference. |
| A03 | One invoice can combine two or more separately numbered quotes; quantities/contents can change. | Both ways supported by owner OD-04: staff may copy selected quotation lines or enter invoice lines independently while linking quotation references; specific duplicate/merge validation needs acceptance design. |
| A04 | Final invoice number is entered **manually** by staff. | Validate uniqueness/scope; don't auto-generate official invoice numbers without authorization. |
| A05 | **One final invoice per export case**. | Historical case/invoice code could differ; review compatibility. |
| A06 | **One booking per final invoice**. | Booking history versions are not extra concurrent bookings. |
| A07 | **One invoice per booking**. | Combined intended one-to-one current binding. |

### B — UCR

| ID | Owner statement | Interpretation / unresolved boundary |
|---|---|---|
| B01 | UCR must exist before **confirming** booking. | Allow tentative booking number/record; do not confirm without valid UCR. |
| B02 | UCR belongs to export case; one UCR covers the booking and multiple containers/invoice. | Current UCR plus append-only replacement history; don't attach to container as its owner. |
| B03 | Missing tax number is represented as **not available**, not fabricated. | Entity whose tax number is required remains open (`OD-16`). |
| B04 | Track UCR request, waiting and receipt; support formatted copy/share and exact timestamp of share/copy action. | Copy action ≠ external receipt/delivery; `OD-11` resolves audit semantics. |
| B05 | If shipping port/line changes, request new UCR, retain old/new values, actor, time and reason. | Historical UCR must not be overwritten silently; link booking versions safely. |

### C — Booking, cut-off and containers

| ID | Owner statement | Interpretation / unresolved boundary |
|---|---|---|
| C01 | Booking number may be recorded before PDF; PDF later. | `DRAFT/PENDING_DOCUMENT` vs confirmation; final booking PDF presence not yet approval rule. |
| C02 | One vessel **Cut-off** as received from carrier. | Future extensibility isn't permission to invent more mandatory cut-offs. |
| C03 | A booking revision is a **new version**; do not destructively edit original record. | Preserve reference, expected count and schedule in history. |
| C04 | Five planned containers require delivery of **all five** for normal completion. | Use latest formally approved expected count; manager exceptional closure separated. |
| C05 | Rear-door container photo is **optional depending on case**. | If attached, link to exact real container; do not invent photo requirement globally. |
| C06 | Seal number is optional. | No placeholder real seal number. |
| C07 | Show only most recent active date on normal screen. | Preserve documented historical booking versions and audit for change. |

### D — Financial invoice

| ID | Owner statement | Interpretation / unresolved boundary |
|---|---|---|
| D01 | Final invoice record is created **when loading begins**. | Starts as a draft; owner OD-07 states ordinary writes lock when authorized user clicks Approve; exact role/version matrix awaits final BR v1.0. |
| D02 | Support either detailed goods lines or one summarized goods description/value. | No forced artificial single SKU/item model. |
| D03 | Suggest values from selected quotation(s), but allow changes. | Never mutate quote snapshot when invoice edited. |
| D04 | Flat freight price per container × count. | Owner OD-05: employee explicitly chooses **freight-chargeable container count with a recorded reason**. No silent default count for issued invoice. |
| D05 | **FOB invoice total = goods value only**, excluding sea freight. | Freight operational cost could be stored separately if needed. |
| D06 | **CFR suggested invoice total = goods value + total freight**; FOB suggested total = goods value. | Owner OD-06: display suggested total then **employee enters final total explicitly**. Whether deviations require added permission/exception is pending detailed business rule. Existing explicit storage and historical values stay unchanged. |
| D07 | **USD** is the sole invoice currency in present business scope. | Don't silently enable FX workflows. |
| D08 | Payment Terms from templates plus editable custom text. | Terms must be preserved as snapshot on issued invoice. |
| D09 | Gross/net weights, package count/type aggregated at invoice level. | Future per-container/per-item measures not implied. |
| D10 | After **approval** (OD-07) invoice locks for ordinary editing; changes require explicit revision and reason. | Prior completed-case **Rule C remains a separate, stronger permissioned correction gate**; approval permissions and change matrix must be specified. |

### E — Documents and courier

| ID | Owner statement | Interpretation / unresolved boundary |
|---|---|---|
| E01 | Starting document-copy template, editable and extensible per case. | Defaults: invoice 4, packing list 4, bill of lading 3, origin certificate 2, professional/technical certificates 4 (certificate separation unresolved). |
| E02 | Document preparation checklist linked to **invoice**. | Due to case 1 invoice, can remain case-scoped internally if invoice linkage proved; no silent deletion. |
| E03 | Separate required **originals** from **paper copies**. | PDF upload/version is a third concept; not count of printed copies. |
| E04 | Allow edit, archive and delete; a manager may delegate delete permission. | **OD-08 specifically distinguishes deleting a requirement from deleting an individual attached file**. Retention, version/review preservation and any physical purge authority remain open. No automatic cascade purge. |
| E05 | One principal DHL documentary dispatch plus optional supplemental dispatch. | Manual courier, separate from cargo movement. |
| E06 | Staff configures checklist per export case regardless of BANK/DIRECT specifics. | BANK and DIRECT still have distinct approval/handoff gates. |

### F — Reminders, time and notifications

| ID | Owner statement | Interpretation / unresolved boundary |
|---|---|---|
| F01 | Staff chooses reminders per event; can mark read, ignore or stop. | Reading ≠ completing task; scope and duplicate semantics preserved. |
| F02 | Changed loading/cutoff date updates active reminders and records change history. | Retire stale reminder cycle; no spurious repeats. |
| F03 | Settings for country/time zone, auto detection and DST on/off option. | Exact DST override, location privacy and timestamp storage unresolved (`OD-10`). |
| F04 | In-app plus browser notifications now; optional email reminders **later** under on/off setting. | Browser permission required, no email implementation authorization. |

### G — Authorization and case closure

| ID | Owner statement | Interpretation / unresolved boundary |
|---|---|---|
| G01 | Seeing/exporting **all-cases reports** requires a separate explicit permission. | Default restricted reports and CSV honor case visibility. |
| G02 | Distinct permission to create, edit and approve invoice; configurable staff role behavior. | Completed-case correction Rule C remains independently protected. |
| G03 | Cannot leave zero active root/system administrators under concurrency. | Server transactional safety essential. |
| G04 | Normal case closure only after mandatory docs and customer **cargo** delivery; manager may exceptionally close with reason. | Exception must not mark undelivered containers as delivered (`OD-09`). |

### H — UX and priority

| ID | Owner statement | Interpretation / unresolved boundary |
|---|---|---|
| H01 | Unified prioritized workspace: actions, load dates, cut-off, deficiencies. | No fabricated KPIs/metrics; preserve AR RTL / EN LTR. |
| H02 | **Quotation Management** is first new business-feature focus. | Does not outrank mandatory P0 isolation or security/data-integrity gates. |

## 3. Intended operational journey

1. Register/select customer; capture editable details with immutable historic case/invoice snapshots.
2. Create quotation(s) independently, perhaps before case creation; optionally connect later. **Quotation number is manually entered (OD-02)**; Proforma means this quotation, not a third document. Source quotes remain unchanged by invoice adjustment.
3. Create `EF-…` case; quotes may be **absent initially** and linked when they arrive later (OD-03). Whether a quote is ultimately mandatory to approve a final invoice remains an open detail. Gather loading port, discharge port, line and optional relevant tax number for broker.
4. Request UCR, record request/wait/received states; generate copy/share format and meaningful timestamp; retain number replacements with old/new/reason/time/actor.
5. Record tentative booking number; **confirm only with active UCR**; attach booking confirmation PDF when available; record one cutoff and loading, ETA/ETD where relevant, approved planned slots; append revised booking versions rather than replacing old historical states.
6. At start of loading create invoice draft with **manually entered final invoice number**; show quote provenance, buyer snapshot, ports, UCR, booking, selected planned/actual containers, agreed terms, USD and FOB/CFR.
7. Assign real container IDs as learned and optionally rear photos/seal; do not fabricate numbers. Price flat shipping per container × **staff-selected count with reason**; show FOB=goods and CFR=goods+freight as **suggested calculations**, then the employee explicitly enters/stores the final invoice total. Differences require a future documented validation rule; no silent auto-recalculation.
8. **Approve** invoice under granular permission to lock ordinary edits (OD-07); post-approval changes require reasoned versioned revisions, and completed-case corrections still require Rule C special permission and audit.
9. Prepare invoice-linked customizable documentary checklist with separate originals/paper copies and private versioned PDFs/reviews. BANK/DIRECT remain operationally distinct; principal DHL shipment plus supplemental possible; courier statuses manual.
10. Reconcile scheduled reminders and browser notifications, cargo delivery and required documentary completion. Normal closure only after both doc requirements and **all expected containers delivered**; exception requires explicit manager authority and non-falsifying audit.

## 4. Data relationship draft (not approved schema)

- `Customer` 1→N `Quotation`; `Quotation` 0/1→case at creation and later linking. A quotation may reference its revisions if that feature is approved.
- `ExportCase` 1→1 current **final** `Invoice`; `Invoice` N↔M `Quotation` references (not destructive copies), preserving original quoted/invoiced provenance; **manual quote numbers** and the ability to create invoice before receiving a quote must be accommodated.
- `ExportCase` 1→1 current `Booking`; `Booking` 1→N `BookingVersion` and N `ContainerSlot`; `ContainerSlot` 0/1→real container identification.
- `ExportCase` 1→1 active `UCR` *business reference* at a time + N historical UCR revisions; clarify whether single UCR applies to all booking versions.
- `Invoice` references its case, booking active version, UCR version and container IDs with a **historical issue snapshot**; late updates must not silently mutate issued PDF.
- `Invoice` 1→N required document types; each requirement → document versions/reviews, required originals and copies, prep/review/courier status.
- Courier documentary dispatch ≠ cargo delivery; preserve independent case completion gates.
- Do not create physical DB tables/constraints based on this speculative mapping without approved contracts and an existing-schema compatibility review.

## 5. Owner decision reconciliation / conflict register

| Conflict ID | Existing source/decision | Owner's new preliminary need | Safe resolution pending owner confirmation |
|---|---|---|---|
| CF-01 | Original `AGANT.MD` describes no separate Quote module | Independent Quotations; multiple quotes → invoice | Introduce quotation workflow only after reviewing current code / schema, independently numbered |
| CF-02 | Old history speaks of *proforma* / invoice differently | **Proforma is the quotation**; commercial invoice stays distinct | **Owner clarification OD-01 received**; remove invented third independent Proforma record from target specification, preserve any historical records pending source review |
| CF-03 | Earlier UCR described as optional booking field | UCR prerequisite for booking confirmation | Model draft vs confirmed booking; preserve old cases and record optional legacy applicability |
| CF-04 | Explicit invoice grand total, no forced recomputation | FOB and CFR **suggested** totals; count staff-selected with reason; final amount staff-entered | OD-05 and OD-06 answers received; preserve stored amount and history. Deviation approval policy still requires definition. |
| CF-05 | One invoice may have existed per case plus possible invoicing flexibility | One **final** invoice, one booking per case | Legacy/multiple invoice records must not be deleted; validate compatibility |
| CF-06 | Case completion currently reported to ignore expected container count | User requires all five delivered | Block normal completion unless approved expected count reached; manager exception distinct |
| CF-07 | Current `removeRequirement` reported physical deletion + cascades | Delegated permission to delete | Reject silent historical loss; decision `OD-08` on physical deletion boundaries |
| CF-08 | Rule C locks only once parent case completed | Invoice ordinary edits lock upon **approval** (OD-07) | Add approved/revision lifecycle separately; preserve stronger completed-case Rule C and historical records. |
| CF-09 | Cairo time/cron risks and no browser notification approval before | Localizable time zone & browser notifications requested | Plan separately; do not pretend implemented; `OD-10` and permissions |
| CF-10 | Basic UCR and booking timeline | Share/copy with exact timestamp; booking versions | Event provenance and version history; do not claim delivered upon copying |
| CF-11 | Default report viewers potentially see global counts; CSV scope reported missing | Global reports only with specific permission | Enforcement on server for both aggregated and exported rows |
| CF-12 | Existing code supports full project but design acceptance pending | Quotation first feature focus | New feature planning after P0/P1 code isolation/security gates |

## 6. Safety and verification baseline (not changed by these decisions)

Current last *reported* checkpoint `ET-2026-10-23-B`: **PARTIAL** after source-level isolation and P1 patches, with **53/53 node:sqlite + fake-auth** rerun and static type/lint passes; affected new fixes are not yet accepted through runtime E2E. Actual Worker/Better Auth/D1 E2E **not run** since changes; `0008` not verified on populated official D1 migration and not applied to developer DB; production/staging **NO-GO**. Later read-only source review reports P0 Playwright using preserved `.wrangler-e2e`, P1 report scope leaks, cascade deletion of document history, `expected_containers` ignored by case completion, missing replay policy for `export-cases/:id/custom-fields`, possible last-root-admin race. The newest checkpoint *reports source fixes* for isolation, reporting, replay, document removal and container completion; these remain **PARTIAL** until targeted integration evidence. Last-admin concurrency remains open. These findings are SOURCE-REPORTED / INFERRED, not runtime-verified by this document.

Protect developer `.wrangler/state` from **all access**, including incidental Wrangler shutdown/checkpoint; don't touch protected E2E/perf/history stores or secrets; do not run tests until isolation verified. No code, migrations, Git modifications, cloud or deployment authorized here. Current visual references are only directional, not final approval.

## 7. Proposed business acceptance checks (not tests already run)

| ID | Demonstration needed |
|---|---|
| BR-Q1 | Create two separate quotations with independent numbers and combine references into one invoice; edit invoice item values without changing original quotation history. |
| BR-Q2 | Create quotation before case and link it to case later; enforce manual final invoice number and uniqueness. |
| BR-U1 | Booking may start with a number but cannot confirm without active UCR; show share/copy timestamp distinct from delivery/receipt. |
| BR-U2 | Replace UCR with old/new, reason, actor and timestamp; booking/history remains explainable. |
| BR-B1 | Revised booking creates new version; last active cut-off shown; previous versions remain inspectable. |
| BR-B2 | Five expected containers, four delivered => normal case closure rejected; manager exception remains auditable and doesn't forge fifth delivery. |
| BR-C1 | Each real container gets its own optional rear photo, optional seal; slots without real number stay empty. |
| BR-I1 | FOB=goods; CFR=goods+calculated freight with USD; historical invoice total stays unchanged unless authorized revision. |
| BR-I2 | Invoice draft/issue/revision/Rule C tests; user lacking approval/correction permission denied. |
| BR-D1 | Originals/copies versioning and review history survives archive; unauthorized physical delete cannot cascade without explicit approved policy. |
| BR-R1 | Restricted actor cannot see all-case aggregate or CSV data without permission; admin can with explicit grant. |
| BR-A1 | Two admins cannot concurrently disable each other to zero active root admins. |
| BR-T1 | Changed loading/cutoff schedules update future reminders without stale alerts; read/ignore/stop distinct. |

## 8. Required owner closure before final v1.0

Read the companion `ExportFlow_Open_Decisions_2026-10-23.md`. Some high-priority owner questions **OD-01..OD-07 were answered on 2026-10-23**. Preserve those responses as preliminary decisions; retain residual OD-03 acceptance rule, OD-06 deviation policy, OD-08 deletion/retention distinction and remaining OD-09..OD-17 as pending. Once owner answers, revise this document to `BUSINESS_APPROVED` **only with explicit final owner acceptance**; code and migration execution still require separate authority.

**End state:** `BUSINESS_SPEC_DRAFT`; `OWNER_APPROVAL_REQUIRED=YES`; `CODE_CHANGES=NONE`; `DEV_DB_ACCESS=NONE`; `DEPLOYMENT_AUTHORIZED=NO`.


## 9. Decision reconciliation update — owner's OD responses (2026-10-23)

**This v0.3 section supersedes any older phrase in v0.2 that marked OD-01, 02, 04, 05, 06, 07 wholly unanswered.** These owner statements are recorded as `OWNER_ANSWERED_PRELIMINARY`, **not software approval**. See companion `ExportFlow_Open_Decisions_V0_3_2026-10-23.md`.

| Decision | Exact owner response / business interpretation | Status |
|---|---|---|
| OD-01 | *Proforma Invoice هو عرض السعر.* One quote/proforma object, distinct from final commercial invoice. | Owner-answered, terminology resolved |
| OD-02 | Quotation number **entered manually** by employee. | Owner-answered; uniqueness rules need technical specification |
| OD-03 | Final invoice may be opened **before a quotation is available**; a quote may arrive **next day** and be linked later. | Owner-answered for creation; **whether quote is mandatory at approval remains pending** |
| OD-04 | Both modes for two/more source quotations depending on staff need: copy selected lines or manually enter invoice lines and link quotes. | Owner-answered; exact merge/audit acceptance cases needed |
| OD-05 | Employee explicitly selects **freight-chargeable container count** and records the reason. | Owner-answered; reason/approval audit controls need specification |
| OD-06 | Show **suggested** calculated total; employee **enters final total**. Preserve explicit stored amount; do not overwrite. | Owner-answered; deviations from formula still need audit/permission rule |
| OD-07 | Invoice **locks on pressing Approve / اعتماد**, not merely at draft creation. After approval changes require revision and reason; Rule C is additional when case completed. | Owner-answered; permissions & historical compatibility to design |
| OD-08 | Distinguish **deleting a document requirement** versus **deleting a particular attachment/file**. | **Unresolved**: define retention and hard-delete permissions separately, preserve reviewed/versioned evidence until decision |

### Current target invoice lifecycle (business concept only)

`DRAFT (at start of loading) → APPROVED (ordinary edit lock) → REVISED WITH REASON (new approved version) → COMPLETED_CASE_CORRECTION (Rule C special permission)`.

The draft may exist without a linked quotation, but future linking and resulting invoice changes **must preserve approval snapshots**. A number manually entered is **not automatically proof of approval**. No approved invoice is silently modified when booking, UCR, container count or quote changes.

### No authority from this document

`BR_VERSION=v0.3_DRAFT` · `BR_V1_OWNER_SIGNOFF=PENDING` · `CODE/MIGRATIONS/RUNTIME=NOT_AUTHORIZED_BY_THIS_FILE` · `STAGING/PRODUCTION=NO_GO`.
