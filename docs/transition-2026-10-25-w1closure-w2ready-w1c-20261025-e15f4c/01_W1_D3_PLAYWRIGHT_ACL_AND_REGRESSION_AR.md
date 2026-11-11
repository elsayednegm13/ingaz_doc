# 01 — D-3 real-path، Playwright الموجّه، وACL/الانحدار

- **الجولة:** `EXPORTFLOW-W1-CLOSE-W2-BR-READY-20261025`
- **RUN_ID:** `w1c-20261025-e15f4c`
- **التاريخ:** 2026-10-25/26 (توقيت محلي)
- **النطاق:** إثبات محلي فقط — لا Staging/Production، لا remote، لا قاعدة مطور.
- **الأساس:** W1 السابق `PARTIAL` (تقرير تاريخي)، وG0 في `00_G0_AND_ISOLATION_REVIEW_AR.md`.

## 1. الملخص

| المحور | النتيجة | الدليل |
|---|---|---|
| D-3 real-path (Hono + Better Auth + D1 + HTTP) | **PASS** في 4 أوضاع | `evidence/attempt-d3-final-*` |
| Playwright موجّه (15 اختبارًا) | **PASS 15/15** | `evidence/attempt-pw-targeted-03` |
| ACL/الانحدار المستهدف | **PASS** داخل الاختبارات الـ15 | نفس الدليل |
| Vitest/tsc/oxlint/e2e-typecheck | **PASS** | `evidence/vitest-full-final.log` وغيرها |
| `0008` على قاعدة مأهولة رسمية `0007→0008` | **NOT_RUN** | غير مأذون في هذه الجولة |
| سباق آخر مدير تحت التزامن | **NOT_RUN** | A3 تسلسلي فقط |
| **حالة إغلاق W1** | **`PARTIAL_WITH_EVIDENCE`** | لا ادعاء اكتمال |

**الخلاصة:** المسارات الحرجة التي طُلبت — D-3 بأعطال محقونة، وحارس UCR، وإعادة تعيين اعتماد النسخة، وACL المستهدف — نجحت على مصدر نهائي وبأدلة خام. لكن هذا لا يساوي „W1 مكتمل”: ترقية `0008` على قاعدة مأهولة رسمية، وسباق المديرين المتزامن، وE2E الكامل مرتين، ما زالت `NOT_RUN`.

## 2. D-3 — التصميم وبرهان الفصل

### 2.1 المشكلة

اختبارات D-3 التاريخية (`tests/transition-2026-10-21/d3.test.ts`) تستخدم fake auth وSQLite في الذاكرة. المطلوب في هذه الجولة هو المسار الحقيقي: Worker/Hono + Better Auth الحقيقي + D1 حقيقي + HTTP حقيقي، مع إثبات أن آلية إحداث العطل **لا يمكن** أن تُفعَّل من طلب HTTP عادي في الإنتاج.

### 2.2 الحل المعتمد

- **Worker entry اختباري:** `tests/w1/d3-worker.ts` — لا يُستورد من أي ملف إنتاجي.
- **Launcher:** `scripts/d3/run-d3.mjs` — الوحيد الذي يبني هذا الـentry، داخل `wrangler dev` على جذر مملوك.
- **اختيار الوضع:** من **Worker vars** في الإعداد المولَّد (`D3_MODE`, `D3_FAIL_EMAIL`)، لا من header/query/cookie/body.
- **الجذر:** `.wrangler-safety-20261021-w1c-e15f4c-d3f-*` — جديد لكل محاولة.
- **المنافذ:** 43241–43244 — مخصصة للجولة.
- **الإعداد:** `wrangler.d3.generated.jsonc` داخل الجذر، و`.dev.vars` داخل الجذر (Wrangler يحمّل `.dev.vars` من مجلد الإعداد، وليس `.dev.vars.d3`).

### 2.3 برهان عدم وجود switch إنتاجي

1. `wrangler.jsonc` → `main: "./worker/index.ts"`.
2. `worker/index.ts` → `const app = createApp();` بلا وسائط.
3. `tests/w1/d3-worker.ts` لا يُستورد من `worker/` ولا `server/` ولا `src/`.
4. لا يوجد endpoint عام ولا header/secret override.
5. `D3_MODE` يُقرأ من `env` فقط، والـenv يأتي من إعداد مولَّد قبل تشغيل العملية.
6. أي محاولة لتفعيل العطل من طلب عادي لا تجد مسارًا.

**النتيجة:** الفصل مقبول. لم يُضف أي switch عام. لم يُضف test-only endpoint.

### 2.4 الأوضاع

| الوضع | الحقن | الهدف |
|---|---|---|
| `CONTROL` | `createApp()` بلا عطل | إثبات أن المسار الطبيعي يعمل. |
| `LINK_FAIL` | تغليف `createAuth` الحقيقي؛ فشل `internalAdapter.linkAccount` مرة واحدة للبريد المحجوز. | فشل إنشاء الاعتماد بعد إنشاء الهوية ⇒ تعويض يحذف الهوية. |
| `COMPENSATION_FAIL` | `LINK_FAIL` + `failUserCompensation: true`. | فشل التعويض ⇒ مستخدم متبقٍّ بلا اعتماد + حادثة. |
| `INCIDENT_FAIL` | `COMPENSATION_FAIL` + غلاف D1 يرفض إدراج `auth_compensation_incidents`. | فشل مخزن الحوادث ⇒ استجابة إنقاذ + سجل تشغيلي، بلا حادثة. |

## 3. D-3 — النتائج النهائية

كل المحاولات النهائية استخدمت المصدر النهائي بعد إصلاح `reviewDocument` (الإصلاح لا يمس مسار D-3، لكن الدليل أصبح على النسخة النهائية).

| السيناريو | المنفذ | الجذر | Assertions | النتيجة | الدليل |
|---|---:|---|---:|---|---|
| `control` | 43241 | `.wrangler-safety-20261021-w1c-e15f4c-d3f-0` | 24 | **PASS** | `evidence/attempt-d3-final-control` |
| `r1` (`LINK_FAIL`) | 43242 | `...-d3f-1` | 24 | **PASS** | `evidence/attempt-d3-final-r1-link-fail` |
| `r2` (`COMPENSATION_FAIL`) | 43243 | `...-d3f-2` | 27 | **PASS** | `evidence/attempt-d3-final-r2-compensation-fail` |
| `r3b` (`INCIDENT_FAIL`) | 43244 | `...-d3f-3b` | 26 | **PASS** | `evidence/attempt-d3-final-r3b-incident-fail` |

### 3.1 CONTROL — 24/24

- health، bootstrap-status، bootstrap، sign-in، temporary-password-gate، change-password، sign-in-new-password، me-ready، users-before.
- إنشاء مستخدم `201` + id، لا تسريب أسرار/SQL/stack.
- ACL: مستخدم بجلسة `200`، بلا جلسة `401` (users + me).
- DB: المستخدم/الاعتماد/الدور موجودون، لا حادثة.
- admin intact.
- teardown: المنفذ مغلق، والعملية انتهت.
- الترحيلات مطبقة على الجذر الاصطناعي.

### 3.2 R1 — فشل `linkAccount` بعد إنشاء الهوية — 24/24

- إنشاء المستخدم يعيد `500` برمز عام `SERVER_TEMPORARILY_UNAVAILABLE` (لا `USER_RECOVERY_REQUIRED`).
- لا تسريب أسرار/SQL/stack.
- DB: المستخدم **حُذف**، والاعتماد **حُذف**، ولا حادثة.
- admin intact.
- ACL سليم.
- teardown سليم.

**المعنى:** التعويض يعمل في المسار الطبيعي، ويترك النظام نظيفًا.

### 3.3 R2 — فشل التعويض — 27/27

- الاستجابة `500` برمز `USER_RECOVERY_REQUIRED`.
- `fieldErrors.reference` موجود، و`requestId` في جسم الاستجابة.
- لا تسريب أسرار/SQL/stack.
- DB: مستخدم متبقٍّ (`residual`) بلا اعتماد (`accounts=0`).
- حادثة `auth_compensation_incidents`:
  - `operation=USER_CREATE`
  - `stage=INDUCED_COMPENSATION_FAILURE`
  - `residual_user_id` يطابق المستخدم المتبقي
  - `correlation_id` يطابق المرجع في الاستجابة
- admin intact.
- ACL وteardown سليمان.

**المعنى:** عندما يفشل التعويض، لا يُخفى الأثر: هوية متبقية بلا صلاحية دخول + حادثة قابلة للتتبع + مرجع للمستخدم/الدعم.

### 3.4 R3b — فشل مخزن الحوادث — 26/26

- نفس استجابة الإنقاذ: `500` / `USER_RECOVERY_REQUIRED` + `fieldErrors.reference` + `requestId`.
- لا حادثة محفوظة (لأن المخزن رفض الإدراج).
- السجل التشغيلي يحتوي:
  `[auth-compensation] incident store unavailable <reference>`
- DB: مستخدم متبقٍّ بلا اعتماد.
- admin intact.
- ACL وteardown سليمان.

**المعنى:** فشل تخزين الحادثة لا يحوّل الفشل إلى صمت؛ المرجع يظهر في الاستجابة والسجل، ويبقى الأثر المتبقي معروفًا.

## 4. D-3 — سجل المحاولات والفشل

| المحاولة | النتيجة | السبب/الملاحظة |
|---|---|---|
| `attempt-d3-r0-control` | FAIL (24) | bootstrap 403: الـlauncher الأول لم يضع `.dev.vars` في مجلد الإعداد، فلم يُحمَّل رمز bootstrap. عيب harness، لا منتج. |
| `attempt-d3-r0b-control` | FAIL (24) | تكرار لنفس سبب r0 بعد محاولة تمرير متغير بيئة لا يقرأه Wrangler. |
| `attempt-d3-r0c-control` | PASS (24) | تصحيح الـlauncher: `.dev.vars` داخل جذر التشغيل. |
| `attempt-d3-r1-link-fail` | PASS (24) | أول إثبات ناجح لمسار link fail. |
| `attempt-d3-r2-compensation-fail` | FAIL (27) | فشل assertion واحد: توقع `x-request-id` header، والمنتج يعيد `requestId` في الجسم فقط على مسار `jsonError`. عيب harness/توقع خاطئ، لا عيب أمني. |
| `attempt-d3-r2b-compensation-fail` | PASS (27) | تصحيح الـharness ليقرأ `requestId` من الجسم؛ لم يُخفَّف أي فحص أمني. |
| `attempt-d3-r3-incident-fail` | PASS (26) | أول إثبات لمسار incident fail. |
| `attempt-d3-final-control` | PASS (24) | إعادة على المصدر النهائي. |
| `attempt-d3-final-r1-link-fail` | PASS (24) | إعادة على المصدر النهائي. |
| `attempt-d3-final-r2-compensation-fail` | PASS (27) | إعادة على المصدر النهائي. |
| `attempt-d3-final-r3-incident-fail` | FAIL (15) | **انقطع بسبب إعادة تشغيل الخادم/البيئة أثناء التنفيذ**، بعد اكتمال خطوات HTTP وقبل تحقق DB/cleanup. ليس فشل منتج؛ الدليل محفوظ. |
| `attempt-d3-final-r3b-incident-fail` | PASS (26) | إعادة كاملة على جذر جديد؛ الدليل المعتمد. |

**ملاحظة منهجية:** لم تُحذف أي محاولة فاشلة، ولم تُوصف `NOT_RUN` كـ`PASS`. المحاولات الفاشلة جزء من الدليل.

## 5. D-3 — التنظيف والعزل

كل سيناريو ناجح يحمل في `result.json`:

- `cleanup.ownedPid`
- `cleanup.taskkillExit=0`
- `cleanup.portClosed=true`
- `cleanup.processGone=true`
- `cleanup.tasklistStdout` = لا مهام مطابقة.

**التحقق اللاحق:** المنافذ `43241–43244` كلها `FREE` بعد الجولة. لم يُقتل أي process غير مملوك للجولة. الجذور `.wrangler-safety-20261021-w1c-e15f4c-d3f-*` محفوظة كأدلة، ولم تُحذف بياناتها.

## 6. Playwright الموجّه

### 6.1 الإعداد

- `EXPORTFLOW_E2E_ROOT` = جذر جديد: `.wrangler-safety-20261021-w1c-e15f4c-pw3`.
- `EXPORTFLOW_E2E_WRANGLER_CONFIG_PATH` = `.../wrangler.e2e.generated.jsonc` (يُمرَّر يدويًا لأن `e2e/helpers.ts` يقرأه).
- `--output <evidence>/pw-output` و`TMP/TEMP=<evidence>/tmp` — **خارج** جذر التشغيل.
- `workers=1`, `retries=0`, `channel=chrome`.
- الترشيح: `E2E-01|W1C-01|W1C-02|A2 |A3 |A6 |E2E-02|E2E-06|E2E-07|E2E-10|T01|T05|temporary password|orphan export case`.
- لم يُشغَّل E2E أعمال كامل، ولا W2/W3.

### 6.2 النتيجة

**`attempt-pw-targeted-03`: 15/15 PASS — 4.6 دقيقة — exit 0.**

| # | الاختبار | النتيجة |
|---:|---|---|
| 1 | `[setup] E2E-01 bootstrap is one-shot and login reaches the dashboard` | PASS |
| 2 | `[setup] E2E-01 logout and protected redirect` | PASS |
| 3 | `T01 empty document type is a safe 422 and Arabic inline error` | PASS |
| 4 | `T05 public tracking revoked stays privacy-preserving` | PASS |
| 5 | `an invalid or duplicate invoice never leaves an orphan export case` | PASS |
| 6 | `E2E-02 custom role hides menus and the API denies the action` | PASS |
| 7 | `E2E-06 document checklist states stay distinct` | PASS |
| 8 | `E2E-07 versioned PDF upload, correction, and denied download` | PASS |
| 9 | `E2E-10 booking with five slots, two official numbers, and the schedule` | PASS |
| 10 | `A2 an authenticated user without the case cannot download the file` | PASS |
| 11 | `A3 last effective administrator cannot be removed and a second admin can` | PASS |
| 12 | `A6 a user outside the case cannot read or snooze its reminders` | PASS |
| 13 | `temporary password gates the API and a password change revokes older sessions` | PASS |
| 14 | `W1C-01 booking cannot be confirmed without an active UCR` | PASS |
| 15 | `W1C-02 a new document version after approval resets the requirement to UPLOADED` | PASS |

### 6.3 محاولات Playwright

| المحاولة | النتيجة | السبب |
|---|---|---|
| `attempt-pw-targeted-01` | فشل إعداد (webServer exit 2) | `--output`/`TMP` داخل جذر التشغيل ⇒ الجذر غير فارغ ⇒ `e2e-server` يرفض البدء. |
| `attempt-pw-targeted-01b` | فشل إعداد (webServer exit 2) | تكرار لنفس سبب 01. |
| `attempt-pw-targeted-01c` | فشل إعداد (webServer exit 2) | `TMP` أُنشئ داخل الجذر. |
| `attempt-pw-targeted-01d` | 13/15 (5.8m) | W1C-01 قرأ شكل استجابة خاطئًا (`data` بدل `data.booking`)؛ W1C-02 كشف عيبًا حقيقيًا في `reviewDocument`. |
| `attempt-pw-targeted-02` | 14/15 (4.8m) | W1C-01/02 نجحا؛ E2E-07 فشل بـstrict-mode لأن شارة النسخة أصبحت `NEEDS_CORRECTION` أيضًا، فطابق locator عنصرين. |
| `attempt-pw-targeted-03` | **15/15 (4.6m)** | تصحيح locator لشارة المتطلب فقط؛ النجاح النهائي. |

### 6.4 تحليل فشل 01d — عيب منتج حقيقي

`W1C-02` توقع أن تكون نسخة المستند المعتمدة `APPROVED`. النتيجة كانت `UPLOADED`؛ السبب أن `reviewDocument` كان:

1. يحدّث `operation_document_requirements.status`.
2. يُدرج صفًا في `document_reviews`.
3. **لا يحدّث `document_versions.review_state`.**

النتيجة: سجل النسخة يبقى `UPLOADED` حتى بعد الاعتماد، وتاريخ النسخ في الواجهة/الـAPI غير صحيح. هذا عيب منتج حقيقي، لا خطأ اختبار.

**الإصلاح (داخل `server/services/documents.ts`):**

- جلب أحدث نسخة.
- تنفيذ **batch واحد** يحتوي:
  - تحديث حالة المتطلب،
  - إدراج صف المراجعة،
  - تحديث `document_versions.review_state` (ما عدا `WAIVED`، لأنه قرار على مستوى المتطلب ولا يعيد تسمية النسخة).
- إضافة اختبار وحدة `W1-20` في `tests/w1/w1-integrity.test.ts`.

**التحقق:** `W1C-02` أصبح يثبت:
- النسخة 1: `APPROVED` بعد الاعتماد.
- النسخة 2: `UPLOADED` بعد الرفع الجديد.
- المتطلب: `UPLOADED` بعد النسخة الجديدة.
- عدد صفوف المراجعة = 2 (UNDER_REVIEW + APPROVED) في اختبار الوحدة.

### 6.5 تحليل فشل 02 — تصحيح locator وليس تخفيف assertion

بعد إصلاح `review_state`، أصبحت شارة النسخة تعرض `NEEDS_CORRECTION` أيضًا. اختبار E2E-07 كان يبحث عن `[data-status="NEEDS_CORRECTION"]` داخل بطاقة المتطلب، فطابق:

1. شارة المتطلب.
2. شارة النسخة.

هذا **ليس تراجعًا في المنتج**؛ الظهور المزدوج صحيح (المتطلب والنسخة كلاهما `NEEDS_CORRECTION`). التصحيح:

```ts
requirementCard(page, "Commercial Invoice")
  .locator('div.font-medium + span[data-status="NEEDS_CORRECTION"]')
```

أي استهداف شارة **المتطلب** تحديدًا. لم يُحذف أي فحص، ولم يُخفَّف أي assertion. الاختبار ما زال يثبت أن المتطلب في الحالة الصحيحة.

### 6.6 التنظيف

- Playwright أوقف `webServer` بعد الجولة.
- المنفذ `43174` = `FREE` بعد التشغيل.
- `pw-output` و`tmp` خارج جذر التشغيل.
- جذر `pw3` محفوظ كدليل؛ لا حذف بيانات.

## 7. ACL والانحدار المستهدف

| الاختبار/المجموعة | ما يثبته | النتيجة |
|---|---|---|
| `W1C-01` | لا تأكيد حجز بلا UCR فعّال؛ UCR فارغ/مسافات مرفوض. | PASS |
| `W1C-02` | النسخة الجديدة بعد الاعتماد تعيد المتطلب إلى `UPLOADED` وتحفظ اعتماد القديمة. | PASS |
| `E2E-02` | دور مخصص يخفي القوائم وAPI يرفض الفعل. | PASS |
| `A2` | مستخدم بجلسة بلا وصول للحالة لا ينزّل الملف. | PASS |
| `A3` | آخر مدير فعّال لا يُزال؛ مدير ثانٍ يمكن إضافته. | PASS (تسلسلي) |
| `A6` | مستخدم خارج الحالة لا يقرأ/يؤجل تذكيراتها. | PASS |
| `E2E-06` | حالات قائمة المستندات منفصلة. | PASS |
| `E2E-07` | رفع PDF بإصدارات، تصحيح، ومنع تنزيل غير مصرح. | PASS |
| `E2E-10` | حجز 5 حاويات، رقمان رسميان، جدول. | PASS |
| `session-hardening` | كلمة مرور مؤقتة تحجب API؛ تغييرها يبطل الجلسات القديمة. | PASS |
| `T01` | نوع مستند فارغ = 422 آمن + خطأ عربي. | PASS |
| `T05` | رابط تتبع ملغى يحافظ على الخصوصية. | PASS |
| `integrity` | فاتورة غير صالحة/مكررة لا تترك حالة يتيمة. | PASS |
| `E2E-01` | bootstrap لمرة واحدة، دخول/خروج، حماية إعادة التوجيه. | PASS |

## 8. الفحوص الساكنة النهائية

| الفحص | الأمر/الأداة | النتيجة |
|---|---|---|
| TypeScript | `node node_modules/typescript/bin/tsc -b --pretty false` | exit 0، بلا مخرجات |
| E2E TypeScript | `node scripts/w1/e2e-typecheck.mjs` | 19 ملفًا، 0 diagnostics |
| Unit/Integration | `node node_modules/vitest/vitest.mjs run` | 16 ملفًا، **107/107** |
| Lint (الملفات المعدلة) | `oxlint` على 6 ملفات | 0 أخطاء، 0 تحذيرات |
| Lint (المشروع) | `oxlint src server worker shared tests scripts` | 0 أخطاء، 20 تحذيرًا تاريخيًا خارج الملفات المعدلة |
| Playwright | `@playwright/test` | **15/15** |

## 9. ما لم يُثبت (صراحةً)

1. **`0008` على قاعدة `0007` مأهولة رسمية:** `NOT_RUN`. طُبّق `0001→0008` من الصفر على جذور اصطناعية فقط.
2. **سباق تعطيل مديرين متزامن:** `NOT_RUN`. `A3` تسلسلي، لا يثبت التزامن.
3. **E2E كامل مرتين على جذرين:** `NOT_RUN`. هذه جولة موجهة، لا W5.
4. **W2/W3/W4:** `NOT_RUN`. لا كود ميزات جديدة.
5. **R2/Cloudflare/Email/Cron:** `NOT_RUN`. لا remote.
6. **`x-request-id` header على `jsonError`:** غائب؛ الجسم يحمل `requestId`. ملاحظة P2، ليست ثغرة.
7. **عزل `Vite .env*` على مستوى نظام التشغيل:** غير مكتمل القياس (G0).
8. **`R-TRANSPORT-STARTUP`:** يبقى مفتوحًا؛ لا فشل إقلاع متقطع في هذه الجولة، لكن السبب الجذري غير مثبت.
9. **Better Auth IP bucket:** تحذير عدم تحديد IP واستخدام دلو مشترك (R-06) ظهر في السجل؛ لم يُعالج.

## 10. الحكم

| الحقل | القيمة |
|---|---|
| `D3_REAL_PATH` | `PASS` (4/4 أوضاع) |
| `PLAYWRIGHT_TARGETED` | `PASS` (15/15) |
| `ACL_TARGETED` | `PASS` |
| `REGRESSION_UNIT` | `PASS` (107/107) |
| `MIGRATION_POPULATED_0007_TO_0008` | `NOT_RUN` |
| `LAST_ADMIN_CONCURRENCY` | `NOT_RUN` |
| `W1_CLOSURE_STATUS` | **`PARTIAL_WITH_EVIDENCE`** |

**لا يُفسَّر هذا التقرير كإغلاق كامل لـW1، ولا كإذن بـW2/W3 أو Staging/Production.**

```text
CHECKPOINT: EXPORTFLOW-W1-CLOSE-W2-BR-READY-20261025
D3_REAL_PATH: PASS (CONTROL, LINK_FAIL, COMPENSATION_FAIL, INCIDENT_FAIL)
PLAYWRIGHT_TARGETED: PASS 15/15
ACL_TARGETED: PASS
VITEST: 107/107
TSC: PASS
E2E_TYPECHECK: 19 FILES / 0 DIAGNOSTICS
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
