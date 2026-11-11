# ExportFlow — Open and Answered Owner Decisions Register v0.3

**Date:** 2026-10-23 · **Classification:** `OWNER-ANSWERED PRELIMINARY / SPEC APPROVAL PENDING / NO EXECUTION AUTHORITY`
**Supersedes for review:** `ExportFlow_Open_Decisions_2026-10-23.md` (preserved, not edited).

## A. Owner questions OD-01..OD-08

| ID | Owner's exact decision (paraphrased without strengthening) | Status | Still needed |
|---|---|---|---|
| OD-01 | **Proforma Invoice is the Quotation / عرض السعر**, not a third independent document. | ANSWERED_PRELIMINARY | Confirm naming shown on printed quote, not entity count. |
| OD-02 | Quotation number is **manually typed** by employee. | ANSWERED_PRELIMINARY | Uniqueness scope and handling duplicates. |
| OD-03 | Invoice **may be created before any quote is currently available**; quote may become available a day later and be linked. | PARTIALLY_RESOLVED | Must a quote exist when final invoice is approved? If quote never arrives, what happens? |
| OD-04 | Both quotation-to-invoice methods are supported according to employee preference. | ANSWERED_PRELIMINARY | Preserve source quote references, no destructive item imports. |
| OD-05 | Employee chooses the number of containers used to calculate freight and states the reason. | ANSWERED_PRELIMINARY | Validate range/zero count, reason required, discrepancy vs booking flagged, recording authority. |
| OD-06 | System shows formula-based proposed total; employee **manually enters the actual final grand total**. | ANSWERED_PRELIMINARY | If final differs from suggested, is reason and privileged approval required? |
| OD-07 | The invoice locks ordinary editing **when an authorized user presses Approve**. | ANSWERED_PRELIMINARY | Versioning/reapproval and Rule C permission matrix. |
| OD-08 | Distinguish deletion of **document requirement** from deletion of **a particular uploaded attachment**. | **OPEN** | Separate delete/archive/retention rules. Never physically purge historical version/review evidence by assumption. |

## B. Still-open decisions inherited from v0.2

| ID | Required owner clarification | Significance |
|---|---|---|
| OD-09 | Manager exceptional closure: minimum reason, evidence, permission and representation (never mark undelivered cargo as delivered). | Case lifecycle and audit |
| OD-10 | Time zone per user/event, DST auto or manual, opt-in location detection and immutable timestamps. | Calendar, cutoff, reminders |
| OD-11 | UCR copy/share event vs confirmation actually sent, recipient/channel and exact timing. | Audit truthfulness |
| OD-12 | Booking version approval and how revised UCR/count affects approved invoice and normal closure. | Versioning, billing consistency |
| OD-13 | Which internal identifiers and financial/shipping details print on commercial invoice PDFs. | Document contract |
| OD-14 | Payment collections/receivables v1 scope, or terms + total only. | Finance module scope |
| OD-15 | Quote/proforma lifecycle, expirations, revisions, acceptance or rejection. | First new feature |
| OD-16 | Which legal party's tax number is needed for customs broker UCR request. | UCR correctness |
| OD-17 | Four professional/technical certificates: combined category or separate certificate types. | Documentary checklist templates |

## C. Release-blocking cross-rules

- Owner answered 45 initial business questions; these are not re-opened by default. Latest eight answers override older **unresolved labels** but do not authorize implementation.
- **Explicit stored invoice total** remains canonical; FOB and CFR formulas produce suggested totals only until entered and approved. Preserve historical invoices; after invoice approval, alterations need reasoned revision; after case COMPLETED, **Rule C** additional special permission remains.
- Booking confirmation requires active UCR, invoice may initially have no quotation, quote/proforma numbers typed manually and independent of invoice numbers.
- No physical cascade delete of reviewed/versioned documents based solely on delegated delete rights.
- Technical checkpoint `ET-2026-10-23-B` reported **PARTIAL**: source isolation changes and P1 patches, static checks and 53/53 isolated fake-auth tests; runtime isolation, new integration regression, populated official D1 upgrade and E2E remain **unverified/not run**. Last-admin race open.

**NEXT:** Resolve critical remaining contractual ambiguities; issue BR v1.0 for explicit owner signoff; separate bounded authority for each engineering gate. **STOP**.
