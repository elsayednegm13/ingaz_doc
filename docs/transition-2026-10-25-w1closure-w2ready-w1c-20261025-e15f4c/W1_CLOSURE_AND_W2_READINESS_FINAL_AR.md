# التقرير النهائي — إغلاق W1 المحلي وتجهيز W2

- **المعرّف:** `EXPORTFLOW-W1-CLOSE-W2-BR-READY-20261025`
- **RUN_ID:** `w1c-20261025-e15f4c`
- **التاريخ:** 2026-10-25/26 (توقيت محلي)
- **المشروع:** `I:\WORK\InjazDocs`
- **النطاق المنفَّذ:** إثبات W1 المحلي (D-3 real-path + Playwright موجّه + ACL/regression) + مسودات BR/OD/W2 فقط.
- **ما لم يُنفَّذ:** W2/W3 code، migrations جديدة، `0008` على قاعدة حقيقية، Git، remote، Cloudflare، R2، Staging، Production، تثبيت حزم.

## 1. الملخص التنفيذي

نُفِّذت الجولة على مصدر نهائي، مع حفظ بصمات SHA-256 لـ**215 ملفًا** قبل أول تعديل. النتيجة:

- **D-3 real-path:** `PASS` في أربعة أوضاع (`CONTROL`, `LINK_FAIL`, `COMPENSATION_FAIL`, `INCIDENT_FAIL`) عبر Hono + Better Auth + D1 + HTTP حقيقي، مع برهان أن العطل يُختار من Worker vars فقط ولا يمكن تفعيله من طلب عادي.
- **Playwright موجّه:** `15/15 PASS` في 4.6 دقيقة، ويشمل حارس UCR، وإعادة تعيين اعتماد النسخة، وACL، والأخطاء، والجلسات، والتكامل.
- **الاختبارات:** `107/107` Vitest، `tsc` 0، `e2e-typecheck` 19 ملفًا/0 diagnostics، `oxlint` 0 أخطاء.
- **عيب منتج حقيقي:** `reviewDocument` لم يكن يحدّث `document_versions.review_state`. أُصلح داخل `server/services/documents.ts` بدفعة واحدة + اختبار وحدة `W1-20` + إثبات `W1C-02`.
- **تصحيح اختبار:** locator E2E-07 أصبح يخص شارة المتطلب بعد أن أصبحت شارة النسخة صحيحة. لم يُخفَّف أي assertion.
- **B3:** خمسة ملفات جاهزة لمراجعة المالك (مقترحا `0009`/`0010` + BR v1.0 + OD v1.0 + W2 scope).

**لكن W1 ليس مكتملًا:** `0007→0008` على قاعدة مأهولة رسمية `NOT_RUN`، وسباق المديرين المتزامن `NOT_RUN`، وE2E الكامل مرتين `NOT_RUN`. لذلك:

> **`W1_CLOSURE_STATUS = PARTIAL_WITH_EVIDENCE`**
>
> **`W2_CONTRACT_READINESS = PREPARED_FOR_OWNER_DECISION`**
>
> **`W2_IMPLEMENTATION_AUTHORIZED = NO`**

## 2. ما تم تنفيذه

### 2.1 D-3

| الوضع | النتيجة | Assertions | الدليل |
|---|---|---:|---|
| CONTROL | PASS | 24 | `evidence/attempt-d3-final-control` |
| LINK_FAIL | PASS | 24 | `evidence/attempt-d3-final-r1-link-fail` |
| COMPENSATION_FAIL | PASS | 27 | `evidence/attempt-d3-final-r2-compensation-fail` |
| INCIDENT_FAIL | PASS | 26 | `evidence/attempt-d3-final-r3b-incident-fail` |

- كل سيناريو يحمل `cleanup.portClosed=true` و`cleanup.processGone=true`.
- `attempt-d3-final-r3-incident-fail` الأول انقطع بسبب إعادة تشغيل البيئة، لا بسبب المنتج؛ محفوظ وموسوم، واستُكمل بـ`r3b`.
- المحاولات الفاشلة الأولى (`r0`, `r0b`, `r2`) محفوظة، وأسبابها موثقة (تحميل `.dev.vars`، توقع header غير موجود).

### 2.2 Playwright الموجّه

**`attempt-pw-targeted-03` — 15/15 PASS — 4.6m — exit 0.**

يشمل:

- `E2E-01` (bootstrap/login/logout)
- `W1C-01` (لا تأكيد حجز بلا UCR)
- `W1C-02` (نسخة جديدة بعد الاعتماد تعيد المتطلب إلى `UPLOADED`)
- `E2E-02`, `E2E-06`, `E2E-07`, `E2E-10`
- `A2`, `A3`, `A6`
- `T01`, `T05`
- `session-hardening`
- `integrity`

**التنظيف:** المنفذ `43174` مغلق بعد التشغيل، و`pw-output`/`tmp` خارج جذر التشغيل.

### 2.3 الاختبارات الساكنة

| الفحص | النتيجة |
|---|---|
| `tsc -b` | exit 0، بلا مخرجات |
| `e2e-typecheck` | 19 ملفًا، 0 diagnostics |
| `vitest run` | 16 ملفًا، 107/107 |
| `oxlint` (الملفات المعدلة) | 0 أخطاء، 0 تحذيرات |
| `oxlint` (المشروع) | 0 أخطاء، 20 تحذيرًا تاريخيًا خارج الملفات المعدلة |

## 3. العيب المنتجي والإصلاح

### 3.1 الاكتشاف

`W1C-02` توقع أن تكون النسخة المعتمدة `APPROVED`. النتيجة كانت `UPLOADED`، لأن `reviewDocument`:

1. يحدّث حالة المتطلب.
2. يُدرج `document_reviews`.
3. **لا يحدّث `document_versions.review_state`.**

هذا يجعل تاريخ النسخ في الواجهة/الـAPI غير صحيح، ويتعارض مع افتراض اختبار GAP-02 بأن النسخة القديمة المعتمدة تبقى `APPROVED`.

### 3.2 الإصلاح

في `server/services/documents.ts`:

- جلب أحدث نسخة.
- `db.batch` واحد: تحديث المتطلب + إدراج المراجعة + تحديث `review_state` (ما عدا `WAIVED`).
- `WAIVED` قرار متطلب، لا يعيد تسمية النسخة.

### 3.3 الأدلة

- اختبار وحدة `W1-20` في `tests/w1/w1-integrity.test.ts`.
- `W1C-02` في `e2e/w1-closure.spec.ts`.
- `Vitest` 107/107، وPlaywright 15/15.

### 3.4 تصحيح E2E-07

بعد الإصلاح، أصبحت شارة النسخة تعرض `NEEDS_CORRECTION` أيضًا، فطابق locator القديم عنصرين. صُحّح إلى شارة المتطلب:

```ts
requirementCard(page, "Commercial Invoice")
  .locator('div.font-medium + span[data-status="NEEDS_CORRECTION"]')
```

**لم يُحذف فحص، ولم يُخفَّف assertion.** هذا تصحيح دقة، لا تغيير سلوك.

## 4. أثر المصدر

| البند | العدد |
|---|---:|
| ملفات «قبل» | 215 |
| غير معدّلة | 212 |
| معدّلة | 3 |
| جديدة | 3 |
| مفقودة | 0 |

**المعدّلة:**

1. `server/services/documents.ts` — إصلاح `review_state`.
2. `e2e/operations.spec.ts` — تصحيح locator.
3. `tests/w1/w1-integrity.test.ts` — اختبار `W1-20`.

**الجديدة:**

1. `e2e/w1-closure.spec.ts` — W1C-01/02.
2. `scripts/d3/run-d3.mjs` — launcher D-3.
3. `tests/w1/d3-worker.ts` — Worker اختباري.

**الترحيلات:** `0001..0008` بلا تعديل. لا `0009`/`0010` منشأة. المقترحان نصيان فقط.

## 5. B3 — الملفات الخمسة

| الملف | الغرض | الحالة |
|---|---|---|
| `proposals/0009_reports_view_all_schema_proposal_AR.md` | `reports.view_all` ونطاق التقارير | `PROPOSED_ONLY / BLOCKED_SCHEMA` |
| `proposals/0010_idempotency_retention_and_user_fk_proposal_AR.md` | احتفاظ idempotency وFK المستخدم | `PROPOSED_ONLY / AWAITING_OWNER_DECISION` |
| `business-drafts/BR_V1_0_DRAFT_AR.md` | مسودة BR v1.0 | `DRAFT_FOR_OWNER_SIGNATURE` |
| `business-drafts/OPEN_DECISIONS_V1_0_DRAFT_AR.md` | سجل القرارات v1.0 | `DRAFT_FOR_OWNER_REVIEW` |
| `business-drafts/W2_QUOTATIONS_SCOPE_DRAFT_AR.md` | نطاق W2 وUAT | `PREPARED_FOR_OWNER_DECISION` |

## 6. حالة W1 — لماذا `PARTIAL_WITH_EVIDENCE`؟

**ما نجح:**

- D-3 real-path بأوضاعه الأربعة.
- Playwright الموجّه 15/15.
- ACL المستهدف (A2/A3/A6/E2E-02/جلسات).
- الانحدار 107/107.
- عيب `review_state` أُصلح واختُبر.

**ما لم يُثبت:**

1. `0007→0008` على قاعدة مأهولة رسمية — `NOT_RUN`.
2. سباق تعطيل مديرين متزامن — `NOT_RUN` (A3 تسلسلي).
3. E2E كامل مرتين على جذرين — `NOT_RUN` (هذه جولة موجّهة).
4. W2/W3/W4 — `NOT_RUN`.
5. R2/Cloudflare/Email/Cron — `NOT_RUN`.
6. `x-request-id` header على `jsonError` — غائب؛ الجسم يحمل `requestId` (P2).
7. عزل Vite `.env*` على مستوى OS — غير مكتمل القياس.
8. `R-TRANSPORT-STARTUP` — مفتوح السبب.
9. Better Auth IP bucket — تحذير قائم (R-13).

**لذلك:** لا يُوصف W1 بالاكتمال، ولا يُنقل إلى Staging/Production.

## 7. المخاطر المفتوحة

| ID | المخاطرة | التصنيف | الحالة |
|---|---|---|---|
| `R-01` | `0007→0008` مأهولة `NOT_RUN` | P1 | مفتوح |
| `R-02` | سباق آخر مدير `NOT_RUN` | P1 | مفتوح |
| `R-03` | E2E كامل مرتين `NOT_RUN` | P1 | مفتوح |
| `R-04` | `reports.view_all` غير موجود | P1 | `BLOCKED_SCHEMA` |
| `R-05` | `x-request-id` header غائب | P2 | ملاحظة |
| `R-06` | Better Auth IP bucket | P2 | مفتوح |
| `R-07` | Vite `.env*` OS-level | P2 | مفتوح |
| `R-08` | `R-TRANSPORT-STARTUP` | P2 | مفتوح |
| `R-09` | GAP-11 fingerprint | P2 | مفتوح |
| `R-10` | GAP-12 لا `Idempotency-Key` | P2 | مفتوح |
| `R-11` | OD-03/06/08/09/12/15 | P1 تجاري | `OPEN_OWNER_DECISION` |
| `R-12` | حذف/احتفاظ المستندات | P1 بيانات | `OD-08` |
| `R-13` | علامات `.w1-run-id*.txt` تاريخية | P2 | لا تُلمس |

**لا P0 مفتوح داخل النطاق المُختبر**، لكن P1 كافية لمنع الادعاء بالاكتمال.

## 8. حالة W2

**جاهز للمراجعة:**

- نطاق واضح، نموذج مفاهيمي، دورة حياة بخيارات، صلاحيات مقترحة، API، 12 UAT، استراتيجية migration.

**غير جاهز للكود:**

- BR v1.0 غير موقّع.
- `OD-15` و`OD-03` (وعلى الأقل `OD-17` ونطاق الترقيم) غير محسومة.
- W1 غير مقبول نهائيًا.
- لا schema/كود/صلاحيات quotation.
- لا تفويض W2.

## 9. قرارات المالك المطلوبة

| القرار | الموضوع | يمنع |
|---|---|---|
| `OD-15` | دورة حياة عرض السعر | W2 |
| `OD-03` | هل العرض إلزامي عند اعتماد الفاتورة؟ | W2/W3 |
| `OD-06` | سياسة انحراف الإجمالي | W3 |
| `OD-08` | حذف المتطلب/المرفق/الاحتفاظ | W2/W4 |
| `OD-09` | الإغلاق الاستثنائي | W3 |
| `OD-12` | نسخة الحجز والفاتورة/الإغلاق | W3 |

**لا توقيع آلي، ولا افتراض سياسة.**

## 10. الحكم النهائي

| الحقل | القيمة |
|---|---|
| `D3_REAL_PATH` | `PASS` (4/4) |
| `PLAYWRIGHT_TARGETED` | `PASS` (15/15) |
| `ACL_TARGETED` | `PASS` |
| `VITEST` | `107/107` |
| `TSC` | `PASS` |
| `E2E_TYPECHECK` | `PASS` (19/0) |
| `PRODUCT_DEFECTS_FIXED` | 1 (`review_state`) |
| `SOURCE_DELTA` | 3 modified / 3 new / 212 unchanged |
| `MIGRATIONS_MODIFIED` | `NONE` |
| `0009_0010_CREATED` | `NO` |
| **`W1_CLOSURE_STATUS`** | **`PARTIAL_WITH_EVIDENCE`** |
| **`W2_CONTRACT_READINESS`** | **`PREPARED_FOR_OWNER_DECISION`** |
| **`W2_IMPLEMENTATION_AUTHORIZED`** | **`NO`** |
| **`STAGING`** | **`NO_GO`** |
| **`PRODUCTION`** | **`NO_GO`** |

## 11. الخطوة التالية

1. مراجعة المالك لمسودة BR v1.0 وسجل القرارات.
2. الإجابة على `OD-03/06/08/09/12/15` (وما يراه مؤثرًا من OD-10..17).
3. قرار على مقترح `0009` (صلاحية التقارير) ومقترح `0010` (الاحتفاظ/FK).
4. تفويض منفصل لأي عمل لاحق (W1-G1 المأهول، أو W2).
5. لا يبدأ أي كود أو migration أو نشر قبل ذلك.

```text
CHECKPOINT: EXPORTFLOW-W1-CLOSE-W2-BR-READY-20261025
D3_REAL_PATH: PASS (CONTROL, LINK_FAIL, COMPENSATION_FAIL, INCIDENT_FAIL)
PLAYWRIGHT_TARGETED: PASS 15/15
ACL_TARGETED: PASS
VITEST: 107/107
TSC: PASS
E2E_TYPECHECK: 19 FILES / 0 DIAGNOSTICS
PRODUCT_DEFECT_FIXED: document_versions.review_state
SOURCE_DELTA: 3 MODIFIED / 3 NEW / 212 UNCHANGED
MIGRATION_POPULATED_0007_TO_0008: NOT_RUN
LAST_ADMIN_CONCURRENCY: NOT_RUN
W1_CLOSURE_STATUS: PARTIAL_WITH_EVIDENCE
W2_CONTRACT_READINESS: PREPARED_FOR_OWNER_DECISION
W2_IMPLEMENTATION_AUTHORIZED: NO
STAGING: NO_GO
PRODUCTION: NO_GO
NEXT_STEP: OWNER_REVIEW_ONLY
STOP
```
