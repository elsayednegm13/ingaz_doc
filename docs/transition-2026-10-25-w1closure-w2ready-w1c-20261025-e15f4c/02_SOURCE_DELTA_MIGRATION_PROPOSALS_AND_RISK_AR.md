# 02 — أثر المصدر، مقترحات الترحيل، والمخاطر

- **الجولة:** `EXPORTFLOW-W1-CLOSE-W2-BR-READY-20261025`
- **RUN_ID:** `w1c-20261025-e15f4c`
- **النطاق:** `server/**`, `shared/**`, `e2e/**`, `scripts/**`, `tests/**` — مع قراءة `src/**` فقط.
- **قاعدة:** لا Git، لا remote، لا حزم، لا `0001..0008` معدّلة، لا `0009/0010` منشأة، لا قاعدة مطور.

## 1. منهجية البصمات

| الملف | المعنى |
|---|---|
| `pre/hashes-pre.json` | SHA-256 + bytes + mtime لـ**215 ملفًا** قبل أول تعديل مصدري. |
| `pre/hashes-post.json` | نفس المسارات بعد الجولة. |
| `pre/delta.json` | المقارنة: 212 unchanged، 3 modified، 0 missing. |
| `pre/new-files.json` | الملفات الجديدة داخل نطاقات السماح. |

**النتيجة:**

```text
preCount: 215
postCount: 215
unchanged: 212
modified: 3
missing: 0
new source files: 3
```

**لم تُلمس** ملفات `docs/**` في البصمات لأنها مخرجات الجولة، وليست مصدرًا. لم يُضف أي ملف مصدر خارج النطاق.

## 2. الملفات المعدّلة

### 2.1 `server/services/documents.ts`

| الحقل | القيمة |
|---|---|
| قبل SHA-256 | `e81d4d08ea9f69bea33d11bbddce84047e536548193f2c68c4d3a5c7917bf60a` |
| بعد SHA-256 | `9fa99317a9ba35e9dc1ad06020d0cebf0cf0c700f9b1656c506df788c2d92000` |
| الحجم | 13,289 → 13,942 bytes |
| السبب | عيب منتج أثبته `W1C-02`: قرار المراجعة لا يُحدّث `document_versions.review_state`. |

**قبل:** `reviewDocument` يحدّث حالة المتطلب، ثم يُدرج `document_reviews`، ولا يمس `document_versions.review_state`. النتيجة: النسخة المعتمدة تبقى `UPLOADED` في تاريخ النسخ.

**بعد:**

1. جلب أحدث نسخة للمتطلب.
2. بناء دفعة واحدة (`db.batch`) تحتوي:
   - تحديث `operation_document_requirements` (الحالة/سبب الإعفاء/الوقت).
   - إدراج `document_reviews` (إن وُجدت نسخة).
   - تحديث `document_versions.review_state` (إن وُجدت نسخة و`decision !== "WAIVED"`).
3. `WAIVED` قرار على مستوى المتطلب؛ لا يعيد تسمية النسخة، ويبقى تاريخها كما هو.
4. الدفعة الواحدة تمنع تباعد الحالة/المراجعة/النسخة إذا فشل أي كتابة.

**لماذا `WAIVED` مستثنى؟** الإعفاء قد يحدث من `MISSING` بلا نسخة، أو من `NEEDS_CORRECTION` مع نسخة. في الحالة الثانية، النسخة تاريخيًا `NEEDS_CORRECTION`، والإعفاء قرار متطلب لا مراجعة نسخة. تحويلها إلى `WAIVED` سيطمس تاريخ المراجعة.

**الاختبار:** `W1-20` في `tests/w1/w1-integrity.test.ts` — يرفع نسخة، يمرّرها `UNDER_REVIEW` ثم `APPROVED`، ويتحقق من:
- `review_state=APPROVED` على النسخة.
- `document_reviews` = 2.
- حالة المتطلب = `APPROVED`.

**التغطية التشغيلية:** `W1C-02` في Playwright — النسخة 1 `APPROVED`، النسخة 2 `UPLOADED`، المتطلب `UPLOADED`.

### 2.2 `e2e/operations.spec.ts`

| الحقل | القيمة |
|---|---|
| قبل SHA-256 | `0257c7e5f2eece2e6e1d1d25d874ac5886df543a718924b072a76e4714701eec` |
| بعد SHA-256 | `8a67e973b53a41bf43c37ba46efa9807ddead2fc750b5aba233a8b84b7575de9` |
| الحجم | 25,143 → 25,209 bytes |
| السبب | تصحيح locator بعد ظهور شارة النسخة الصحيحة. |

**التغيير:** ثلاث assertions في E2E-07 تبحث عن `[data-status="..."]` داخل بطاقة المتطلب. بعد إصلاح `review_state`، صارت البطاقة تحتوي شارة المتطلب **وشارة النسخة**، فطابق locator عنصرين (strict mode violation).

**التصحيح:** استهداف شارة المتطلب تحديدًا:

```ts
requirementCard(page, "Commercial Invoice")
  .locator('div.font-medium + span[data-status="NEEDS_CORRECTION"]')
```

**لم يُخفَّف أي assertion:** ما زال يتحقق من ظهور الحالة الصحيحة للمتطلب. الفرق أن الاستهداف أصبح دقيقًا. هذا تصحيح اختبار، لا تغيير سلوك منتج.

### 2.3 `tests/w1/w1-integrity.test.ts`

| الحقل | القيمة |
|---|---|
| قبل SHA-256 | `c3f85421fa16c3bc116530356dfa61afb68e155bd71f735750a85cda7ff08da6` |
| بعد SHA-256 | `c67e896e931b24e9045c48d1c8a13d7b33ce5b040d190632622f2e19597d05b6` |
| الحجم | 19,944 → 21,682 bytes |
| السبب | إضافة `W1-20` كاختبار وحدة لعيب `review_state`. |

لم يُعدَّل أي اختبار قائم، ولم تُحذف assertions. الاختبار الجديد يستخدم نفس harness الموجود (`createTestHarness` + `uploadSession` + `count`).

## 3. الملفات الجديدة

### 3.1 `e2e/w1-closure.spec.ts`

| الحقل | القيمة |
|---|---|
| SHA-256 | `9dba3799f50825b05040c7e94b0abea930cc8fa07e5865d49247386eecd84e5f` |
| الحجم | 7,182 bytes |
| الغرض | اختباران تشغيليان: `W1C-01` (حارس UCR) و`W1C-02` (إعادة تعيين اعتماد النسخة). |

**W1C-01:** ينشئ عميلًا/حالة/حجزًا، يتحقق أن الحجز `DRAFT`، يحاول `CONFIRMED` بلا UCR ⇒ `422 / BOOKING_UCR_REQUIRED`، ثم UCR مسافات ⇒ نفس الرفض، ثم UCR فعّال ⇒ `200` و`CONFIRMED`.

**W1C-02:** يرفع نسخة، يمرّرها `UNDER_REVIEW` ثم `APPROVED`، يتحقق أن المتطلب `APPROVED`، يرفع نسخة ثانية، يتحقق أن المتطلب `UPLOADED` وأن النسختين في D1: `1=APPROVED`, `2=UPLOADED` مع أسماء الملفات.

### 3.2 `scripts/d3/run-d3.mjs`

| الحقل | القيمة |
|---|---|
| SHA-256 | `ccd22ece04efc3f6a9511ecaea2d19fc206692b68fac7bed3dd3810a15613437` |
| الحجم | 24,188 bytes |
| الغرض | Launcher D-3: يبني Worker الاختباري، يولّد إعدادًا/`.dev.vars` داخل الجذر، يطبّق الترحيلات، يشغّل `wrangler dev`، ينفّذ HTTP، يقرأ D1، يتحقق من التنظيف، ويكتب `result.json`. |

**الضوابط:**

- رفض الجذور المحمية عبر `scripts/isolation-guard.mjs`.
- `.dev.vars` داخل `<runRoot>` (لأن Wrangler يحمّل من مجلد الإعداد).
- أوضاع `control/r1/r2/r3` من Worker vars.
- readiness polling حتى 180 ثانية.
- `taskkill /T` على PID المملوك فقط.
- لا أسرار حقيقية، لا remote.

### 3.3 `tests/w1/d3-worker.ts`

| الحقل | القيمة |
|---|---|
| SHA-256 | `a43946148fec213d19c20073def0b53d1cb3fce4bf633e21b00ac62826de2529` |
| الحجم | 5,501 bytes |
| الغرض | Worker entry اختباري لأعطال D-3. |

**الفصل:** لا يُستورد من أي ملف إنتاجي. `worker/index.ts` يستدعي `createApp()` بلا وسائط. الوضع من `env.D3_MODE`، لا من الطلب.

## 4. الترحيلات

### 4.1 `0001..0008` — بلا تعديل

| الملف | SHA-256 (مختصر) |
|---|---|
| `0001_init.sql` | `3f8a4a08…bf2a0a` |
| `0002_seed.sql` | `215144c3…14b62` |
| `0003_checkpoint.sql` | `49fb1258…7acbbc` |
| `0004_invoice_revisions.sql` | `0b1e0721…ca705a7` |
| `0005_idempotency.sql` | `149b4389…d88060` |
| `0006_customer_imports.sql` | `ab91d3bd…5954c3` |
| `0007_performance_indexes.sql` | `eeaf2f4c…fc40d3` |
| `0008_replay_safety_and_import_identity.sql` | `5682a781…7a07ba` |

**لا يوجد ملف `0009` أو `0010` في `drizzle/migrations/`.** المقترحان نصيان فقط في `proposals/`.

### 4.2 حالة التطبيق

| البند | الحالة |
|---|---|
| `0001→0008` من الصفر على D1 اصطناعي (Playwright/D3) | PASS |
| `0007→0008` على قاعدة مأهولة رسمية | `NOT_RUN` |
| `0008` على قاعدة المطور | `NOT_RUN` / `NO-GO` |
| `0008` على remote | `NOT_RUN` / `NO-GO` |
| `0009` / `0010` | `PROPOSED_ONLY` / `NOT_CREATED` |

## 5. مقترحات B3

| الملف | الموضوع | الحالة |
|---|---|---|
| `proposals/0009_reports_view_all_schema_proposal_AR.md` | `reports.view_all` + منح + نطاق التقارير | `PROPOSED_ONLY / BLOCKED_SCHEMA` |
| `proposals/0010_idempotency_retention_and_user_fk_proposal_AR.md` | `idempotency_keys.actor_id` + الاحتفاظ/الحذف | `PROPOSED_ONLY / AWAITING_OWNER_DECISION` |
| `business-drafts/BR_V1_0_DRAFT_AR.md` | مسودة BR v1.0 | `DRAFT_FOR_OWNER_SIGNATURE` |
| `business-drafts/OPEN_DECISIONS_V1_0_DRAFT_AR.md` | سجل OD v1.0 | `DRAFT_FOR_OWNER_REVIEW` |
| `business-drafts/W2_QUOTATIONS_SCOPE_DRAFT_AR.md` | نطاق W2/UAT | `PREPARED_FOR_OWNER_DECISION` |

**لا يُعد أي منها ترخيصًا للتنفيذ.**

## 6. الالتزام بالممنوعات

| الممنوع | الحالة | الدليل/الملاحظة |
|---|---|---|
| Git mutations | لم تُنفَّذ | لا `commit/push/reset/clean/stash/checkout`. |
| Remote/Cloudflare/R2/Staging/Production | لم تُنفَّذ | كل التشغيل محلي على جذور اصطناعية. |
| تثبيت/تحديث حزم | لم يُنفَّذ | `package.json`/`pnpm-lock.yaml` ضمن 212 unchanged. |
| تعديل `0001..0008` | لم يُنفَّذ | البصمات أعلاه. |
| إنشاء `0009/0010` | لم يُنفَّذ | لا ملفات في `drizzle/migrations`. |
| تطبيق `0008` على قاعدة المطور | لم يُنفَّذ | `NOT_RUN`. |
| قراءة/stat `.wrangler/state` والجذور التاريخية | لم يُنفَّذ | الحارس + الجذور الجديدة فقط. |
| قراءة `.dev.vars*`/`.env*` الحقيقية | لم يُنفَّذ | كل الجذور تولّد `.dev.vars` اصطناعيًا. |
| كتابة `.w1-run-id*.txt` جديدة | لم يُنفَّذ | الموجود مسبقًا (23:05–23:33) قبل `RUN_ID.txt` (23:51) ولم يُلمس. |
| تعديل `src/**` | لم يُنفَّذ | قراءة فقط؛ 212 unchanged. |
| تخفيف assertions | لم يُنفَّذ | التصحيحات دقيقة؛ `W1-20` و`W1C-02` يزيدان التغطية. |
| وصف `NOT_RUN` كـ`PASS` | لم يُنفَّذ | كل `NOT_RUN` موسوم صراحةً. |

## 7. سجل المخاطر

| ID | المخاطرة | التصنيف | الحالة | المالك/الإجراء |
|---|---|---|---|---|
| `R-01` | `0007→0008` على قاعدة مأهولة رسمية `NOT_RUN` | P1 | مفتوح | مالك/تفويض W1-G1 |
| `R-02` | سباق تعطيل مديرين متزامن `NOT_RUN` | P1 | مفتوح | W1-G3 |
| `R-03` | E2E كامل مرتين `NOT_RUN` | P1 | مفتوح | W5 |
| `R-04` | `reports.view_all` غير موجود؛ تقارير كل الحالات غير محمية بصلاحية صريحة | P1 | `BLOCKED_SCHEMA` | مقترح 0009 |
| `R-05` | `x-request-id` header غائب على `jsonError`؛ الجسم يحمل `requestId` | P2 | ملاحظة | تحسين مراقبة لاحق |
| `R-06` | Better Auth لا يحدد IP ⇒ دلو مشترك | P2 | مفتوح | R-13 / إعداد النشر |
| `R-07` | عزل `Vite .env*` على مستوى OS غير مكتمل القياس | P2 | مفتوح | W1-G0/G4 |
| `R-08` | `R-TRANSPORT-STARTUP` السبب الجذري غير مثبت | P2 | مفتوح | W1-G4 |
| `R-09` | `GAP-11` query-sensitive fingerprint | P2 | مفتوح | قرار توافق خلفي |
| `R-10` | `GAP-12` غياب `Idempotency-Key` | P2 | مفتوح | توثيق/تحقق لاحق |
| `R-11` | `OD-03/06/08/09/12/15` مفتوحة | P1 (تجاري) | `OPEN_OWNER_DECISION` | مالك |
| `R-12` | حذف المستندات/الاحتفاظ غير محسوم | P1 (بيانات) | `OD-08` | مالك + مقترح |
| `R-13` | علامات `.w1-run-id*.txt` تاريخية في الجذر | P2 | لا تُلمس | مالك/تنظيف لاحق بتفويض |

**لا P0 مفتوح داخل النطاق المُختبر.** لكن P1 المذكورة تمنع وصف W1 بالاكتمال أو الانتقال إلى Staging/Production.

## 8. التراجع

| التغيير | التراجع | الأثر |
|---|---|---|
| `documents.ts` | إعادة الدفعة إلى الكتابات المنفصلة | يعيد عيب `review_state`؛ لا يُنصح. |
| `operations.spec.ts` | إعادة locator القديم | يفشل E2E-07 بعد الإصلاح؛ لا يُنصح. |
| `tests/w1/w1-integrity.test.ts` | حذف `W1-20` | يفقد حماية الانحدار؛ لا يُنصح. |
| `e2e/w1-closure.spec.ts` | حذف الملف | يفقد W1C-01/02. |
| `scripts/d3/run-d3.mjs` / `tests/w1/d3-worker.ts` | حذف الملفين | يفقد قابلية إعادة D-3. |
| `0009/0010` | لا شيء (غير منشأين) | — |
| الجذور الاصطناعية | لا تُحذف في هذه الجولة | أدلة. |

**ملاحظة:** أي تراجع عن إصلاح `review_state` يعيد عيبًا منتجيًا موثقًا. لا يُنفَّذ دون قرار مالك وسبب.

## 9. الحكم

| الحقل | القيمة |
|---|---|
| `SOURCE_DELTA` | 3 modified + 3 new، 212 unchanged، 0 missing |
| `MIGRATIONS_0001_0008` | unchanged |
| `MIGRATIONS_0009_0010` | `NOT_CREATED` |
| `DEV_DB` | untouched |
| `REMOTE` | untouched |
| `P0_OPEN_IN_SCOPE` | 0 |
| `P1_TECHNICAL_OPEN` | 4 (R-01..R-04) |
| `P1_BUSINESS_DATA_OPEN` | R-11, R-12 |
| `W1_CLOSURE_STATUS` | **`PARTIAL_WITH_EVIDENCE`** |

```text
CHECKPOINT: EXPORTFLOW-W1-CLOSE-W2-BR-READY-20261025
SOURCE_FILES_PRE: 215
SOURCE_FILES_POST: 215
UNCHANGED: 212
MODIFIED: 3
NEW: 3
MISSING: 0
MIGRATIONS_MODIFIED: NONE
0009_0010_CREATED: NO
P0_OPEN_IN_SCOPE: 0
P1_TECHNICAL_OPEN: R-01, R-02, R-03, R-04
P1_BUSINESS_DATA_OPEN: R-11, R-12
W1_CLOSURE_STATUS: PARTIAL_WITH_EVIDENCE
W2_CONTRACT_READINESS: PREPARED_FOR_OWNER_DECISION
W2_IMPLEMENTATION_AUTHORIZED: NO
STAGING: NO_GO
PRODUCTION: NO_GO
NEXT_STEP: OWNER_REVIEW_ONLY
STOP
```
