# M01-A.2 — مصفوفة المصدر وملكية المسارات

**الطريقة:** قراءة نصية ساكنة فقط. لم يُستورد أي spec، ولم يُقيَّم Playwright، ولم يُلمس أي جذر حالة. أرقام الأسطر أدناه هي **النهائية بعد التعديل** إلا حيث يُذكر «قبل».

---

## 01.1 جدول الملفات الثمانية

| الملف | العيب قبل | الدليل النهائي `file:line` | الحكم |
|---|---|---|---|
| `e2e/atomicity.spec.ts` | `const persist = ".wrangler-e2e/state"` (س6) | استيراد `path` و`e2eRunRoot` (1،3)؛ `const runRoot = e2eRunRoot()` (7)؛ `const persist = path.join(runRoot, "state")` (8)؛ كل `wranglerRows` يمرر `persist` (11،111-113) | **PASS** |
| `e2e/duplicates.spec.ts` | `storageState` و`persist` تاريخيان (7-8) | استيراد `path` و`e2eRunRoot` (2،4)؛ `runRoot` (8)؛ `storageState = path.join(runRoot, "admin-state.json")` (9)؛ `persist` (10)؛ السياقان يستخدمان `storageState` (244-245)؛ كل `wranglerRows` يمرر `persist` (37-40،45-48،53-56،362-363،422-423) | **PASS** |
| `e2e/dossier-grid.spec.ts` | ثلاثة `wranglerSql(".wrangler-e2e/state", …)` (57،82،83) | استيراد `path` و`e2eRunRoot` (2،4)؛ `runRoot` (8)؛ `persist` (9)؛ الثلاثة تستخدم `persist` (60،85،86) | **PASS** |
| `e2e/invoice-lock.spec.ts` | `wranglerSql(".wrangler-e2e/state", …)` (58) و`storageState: ".wrangler-e2e/admin-state.json"` (110) | استيراد `path` و`e2eRunRoot` (1،3)؛ `runRoot` (7)؛ `persist` (8)؛ `storageState` (9)؛ SQL (62)؛ السياق (114) | **PASS** |
| `e2e/security.spec.ts` | `wranglerSql(".wrangler-e2e/state", command)` (9) | استيراد `path` و`e2eRunRoot` (2،4)؛ `runRoot` (8)؛ `persist` (9)؛ `sql()` يمرر `persist` (11-12) | **PASS** |
| `e2e/shell-grid.spec.ts` | `wranglerSql(".wrangler-e2e/state", …)` مرتين (56-57) | استيراد `path` و`e2eRunRoot` (2،4)؛ `runRoot` (8)؛ `persist` (9)؛ الاستخدامان (59-60) | **PASS** |
| `e2e/operations.spec.ts` | رمز `DEVELOPER_STATE_FORBIDDEN` الخاطئ + `wranglerSql(".wrangler-e2e/state", …)` (495-496) | استيراد `path` و`e2eRunRoot` (1،3)؛ `runRoot` (6)؛ `persist` (7)؛ الاختبار السلبي `.wrangler/state` يتوقع `PROTECTED_STATE_FORBIDDEN` (498)؛ استعلام التشغيل يمرر `persist` (499) | **PASS** |
| `tests/isolation-guard.test.ts` | `.wrangler-e2e/state` كان `.not.toThrow()` (10) و`server` كان `.toContain(".wrangler-e2e/state")` (16) | الرفض `PROTECTED_STATE_FORBIDDEN` (10،26-30)؛ `server).not.toContain` (36)؛ إثبات `EXPORTFLOW_E2E_ROOT` (37-38)؛ قبول جذر اصطناعي + رفض غياب الجذر (13-31) | **PASS** |

---

## 01.2 تفصيل كل مستهلك

### 01.2.1 `e2e/atomicity.spec.ts` — B-01a

- **قبل:** السطر 6 كان `const persist = ".wrangler-e2e/state";`.
- **بعد:** السطر 7 `const runRoot = e2eRunRoot();` والسطر 8 `const persist = path.join(runRoot, "state");`.
- **الاستخدامات النشطة:** `wranglerRows` في 11 و111-113؛ كلها تمرر `persist`.
- **الجلسة:** لا يوجد `storageState` محلي؛ يعتمد على `storageState` الافتراضي في `playwright.config.ts:55` المشتق من الجذر.
- **البصمة (timestamp):** `runStamp()` من `e2e/helpers.ts:76-78` يكتب `path.join(runRoot, "stamp.txt")`.
- **لقطات/ملفات أعمال:** لا توجد مسارات لقطات في هذا الملف.
- **لم يُحذف أي تأكيد أعمال.**

### 01.2.2 `e2e/duplicates.spec.ts` — B-01b

- **قبل:** السطر 7 `const storageState = ".wrangler-e2e/admin-state.json";` والسطر 8 `const persist = ".wrangler-e2e/state";`.
- **بعد:** السطر 8 `runRoot`، 9 `storageState`، 10 `persist`.
- **الاستخدامات النشطة:**
  - `browser.newContext({ storageState })` في 244-245.
  - `wranglerRows` في 37-40،45-48،53-56،362-363،422-423؛ كلها تمرر `persist`.
- **لا توجد** أي سلسلة `.wrangler-e2e` أو `storageState: { ... }` تاريخية.
- **لم يُحذف أي تأكيد تكرار/أعمال.**

### 01.2.3 `e2e/dossier-grid.spec.ts` — B-01c

- **قبل:** 57،82،83: `wranglerSql(".wrangler-e2e/state", …)`.
- **بعد:** 8-9 `runRoot`/`persist`؛ 60،85،86 `wranglerSql(persist, …)`.
- **`const root` في السطر 7** هو مسار **لقطات شاشة** (`docs/qa-screenshots/...` أو `DOSSIER_ROOT`)، وليس مسار حالة/جلسة/SQL. لم يُغيَّر لأنه خارج عيب B-01c وليس جذرًا تاريخيًا محميًا.
- **لا يوجد** `storageState` محلي.
- **لم يُحذف أي تأكيد بصري/أعمال.**

### 01.2.4 `e2e/invoice-lock.spec.ts` — B-01d

- **قبل:** 58 `wranglerSql(".wrangler-e2e/state", …)` و110 `storageState: ".wrangler-e2e/admin-state.json"`.
- **بعد:** 7-9 `runRoot`/`persist`/`storageState`؛ 62 SQL؛ 114 سياق جديد `browser.newContext({ storageState })`.
- **ملاحظة:** `storageState` هنا هو **جلسة admin** التي يكتبها `e2e/setup.spec.ts` في `<runRoot>/admin-state.json`، ويقرؤها `playwright.config.ts` افتراضيًا. هذا يثبت أن الجلسة والـSQL من نفس الجذر.
- **لم يُحذف أي تأكيد قفل/تصحيح.**

### 01.2.5 `e2e/security.spec.ts` — B-01e

- **قبل:** 9 `return wranglerSql(".wrangler-e2e/state", command);`.
- **بعد:** 8-9 `runRoot`/`persist`؛ 11-12 `function sql(...) { return wranglerSql(persist, command); }`.
- **كل استدعاءات `sql()`** تمر عبر `persist`؛ لا يوجد مسار تاريخي آخر.
- **`readFileSync("e2e/fixtures/sample.pdf")`** في 29 و175 هو **مدخل اختبار** داخل المستودع، وليس حالة/جلسة/SQL.
- **لم يُحذف أي تأكيد أمني.**

### 01.2.6 `e2e/shell-grid.spec.ts` — B-01f

- **قبل:** 56-57 `wranglerSql(".wrangler-e2e/state", …)`.
- **بعد:** 8-9 `runRoot`/`persist`؛ 59-60 SQL بـ`persist`.
- **`const root` في السطر 7** هو مسار **لقطات شاشة** (`docs/qa-screenshots/...`)، وليس حالة/جلسة/SQL؛ لم يُغيَّر.
- **لم يُحذف أي تأكيد بصري/أعمال.**

### 01.2.7 `e2e/operations.spec.ts` — B-01g

- **قبل:** 495 `expect(() => wranglerSql(".wrangler/state", "SELECT 1")).toThrow(/DEVELOPER_STATE_FORBIDDEN/);` و496 `const e2e = wranglerSql(".wrangler-e2e/state", "SELECT email FROM user");`.
- **بعد:** 6-7 `runRoot`/`persist`؛ 498 الاختبار السلبي `.wrangler/state` يتوقع **`PROTECTED_STATE_FORBIDDEN`**؛ 499 استعلام التشغيل `wranglerSql(persist, "SELECT email FROM user")`.
- **لماذا الرمز `PROTECTED_STATE_FORBIDDEN`؟** `wranglerSql` يستورد `assertIsolatedPersist` من `scripts/isolation-guard.mjs` (الحارس القوي). هذا الحارس يضع `.wrangler/state` داخل `PROTECTED_ROOTS` ويرمي `PROTECTED_STATE_FORBIDDEN` (س18، 53، 112-113). أما `shared/isolation.ts` فيحتفظ بـ`DEVELOPER_STATE_FORBIDDEN` لمستهلكيه (س119). لذلك الرمز القديم كان قياسًا خاطئًا للحارس القوي، وليس تخفيفًا للتأكيد.
- **التأكيد السلبي محفوظ:** السطر 498 لا يزال يهاجم `.wrangler/state` صراحةً، ولا يزال يتوقع رميًا. لم يُحوَّل إلى قبول.
- **`browser.newContext({ storageState: { cookies: [], origins: [] } })`** في السطر 29 هو جلسة فارغة **في الذاكرة**، وليست مسارًا تاريخيًا.
- **مسارات لقطات الشاشة** 423،425،427 هي مخرجات `docs/qa-screenshots/...`، وليست حالة/جلسة/SQL؛ لم تُغيَّر.
- **لا يوجد** `DEVELOPER_STATE_FORBIDDEN` في الملف النهائي.

### 01.2.8 `tests/isolation-guard.test.ts` — B-02/B-03

- **B-02 قبل:** السطر 10 `expect(() => assertIsolatedPersist(".wrangler-e2e/state")).not.toThrow();`.
- **B-02 بعد:** السطر 10 `... .toThrow(/PROTECTED_STATE_FORBIDDEN/);`.
- **B-03 قبل:** السطر 16 `expect(server).toContain(".wrangler-e2e/state");`.
- **B-03 بعد:** السطر 36 `expect(server).not.toContain(".wrangler-e2e/state");` مع إثبات `EXPORTFLOW_E2E_ROOT` و`EXPORTFLOW_E2E_ROOT_REQUIRED` (37-38).
- **تعزيز إضافي:** 13-31 تثبت قبول جذر اصطناعي `wrangler-safety-20261021-m01a2` فقط، ورفض غياب `root` بـ`PROJECT_ROOT_REQUIRED`، ورفض `.wrangler-e2e` بـ`PROTECTED_STATE_FORBIDDEN`.
- **لا وصول لجذر حقيقي:** كل الحالات نصوص اصطناعية، والحارس المشترك لا يستدعي `fs` إطلاقًا. الملف نفسه لم يُشغَّل (Vitest ممنوع)، لكن سلوكه مغطى في الاختبار الجديد.

---

## 01.3 تدقيق النصوص التاريخية

| الملف/المجموعة | `.wrangler-e2e` | `.wrangler-*` أخرى | التصنيف |
|---|---:|---:|---|
| `e2e/atomicity.spec.ts` | 0 | 0 | نظيف |
| `e2e/duplicates.spec.ts` | 0 | 0 | نظيف |
| `e2e/dossier-grid.spec.ts` | 0 | 0 | نظيف |
| `e2e/invoice-lock.spec.ts` | 0 | 0 | نظيف |
| `e2e/security.spec.ts` | 0 | 0 | نظيف |
| `e2e/shell-grid.spec.ts` | 0 | 0 | نظيف |
| `e2e/operations.spec.ts` | 0 | 0 | نظيف (يبقى `.wrangler/state` كنص سلبي واحد في 498) |
| `tests/isolation-guard.test.ts` | 3 (10،26،36) | 0 | **نصوص سلبية/ثابتة فقط** |
| `tests/isolation-safety/m01a2-consumer-paths.test.mjs` | نصوص اصطناعية في اختبارات الرفض | — | **لا I/O على مسار محمي** |

**تفسير الاستثناءات المسموحة:**

1. `tests/isolation-guard.test.ts:10` و`:26` تستدعيان `assertIsolatedPersist` بنص `.wrangler-e2e/state` **لتتوقعا الرمي**؛ الحارس المشترك يرفض نصيًا قبل أي `fs`.
2. `tests/isolation-guard.test.ts:36` فحص نصي على `scripts/e2e-server.mjs` (`not.toContain`)؛ لا يفتح أي ملف حالة.
3. `e2e/operations.spec.ts:498` نص `.wrangler/state` سلبي لاختبار الحارس القوي؛ الحارس القوي يرفضه نصيًا قبل `canonicalExistingAncestor` (س112-126).
4. النصوص التاريخية في `tests/isolation-safety/m01a2-consumer-paths.test.mjs` كلها نصوص اختبار رفض؛ الحارس القوي يرفضها قبل `existsSync/realpathSync`، والاختبار الإيجابي الوحيد يستخدم مجلد OS temp جديدًا مملوكًا له.

**ملاحظات خارج النطاق (لم تُعدَّل):**

- `vite.config.ts:13` و`vite.reliability.config.ts:25` تحتويان `.wrangler-e2e` ضمن قوائم حظر/تجاهل، وليستا مستهلكَي حالة نشطين. التكليف يمنع تعديل `vite.config.ts` (بما في ذلك حل ~320ms).
- `tests/transition-2026-10-21/isolation.test.ts` يحتوي أسماء تاريخية داخل اختبارات رفض قديمة؛ خارج الثمانية، لم يُعدَّل ولم يُشغَّل.
- `e2e/helpers.ts:14` تعليق يذكر `.wrangler-e2e` كجذر تاريخي يجب عدم استخدامه؛ ليس مسارًا نشطًا.

---

## 01.4 سلسلة تمرير الجذر

| الطبقة | الدليل `file:line` | السلوك |
|---|---|---|
| Playwright config | `playwright.config.ts:10-18` | يرمي `EXPORTFLOW_E2E_ROOT_REQUIRED` قبل تشغيل أي subprocess إذا غاب `EXPORTFLOW_E2E_ROOT`. |
| Playwright config | `playwright.config.ts:20-26` | `e2eStorageState()` يعيد `<runRoot>/admin-state.json` افتراضيًا (مع احترام `EXPORTFLOW_E2E_ADMIN_STATE` الصريح). |
| Playwright config | `playwright.config.ts:55` | `storageState: e2eStorageState()`. |
| Playwright config | `playwright.config.ts:66` | يمرر `EXPORTFLOW_E2E_ROOT: runRoot` إلى `webServer.env`. |
| E2E server | `scripts/e2e-server.mjs:12-15` | يرفض الغياب بـ`EXPORTFLOW_E2E_ROOT_REQUIRED` وexit 2. |
| E2E server | `scripts/e2e-server.mjs:17-23` | يتحقق بالحارس القوي، يرفض الجذر غير الفارغ، ويجعل persist `<runRoot>/state`. |
| E2E server | `scripts/e2e-server.mjs:36-38` | يكتب `.dev.vars.e2e` و`admin.json` و`run.json` **داخل الجذر نفسه**. (لم يُقرأ أي منها في هذه المرحلة.) |
| Helpers | `e2e/helpers.ts:17-25` | `e2eRunRoot()` يطلب `EXPORTFLOW_E2E_ROOT` صراحةً، ويتحقق بـ`requireRunMarker: true`، ولا يعود إلى `.wrangler-e2e`. |
| Helpers | `e2e/helpers.ts:76-86` | `runStamp()` يكتب `<runRoot>/stamp.txt`، و`adminCreds()` يقرأ `<runRoot>/admin.json`. |
| Setup (كاتب الجلسة) | `e2e/setup.spec.ts:41-42` | **ينوي** كتابة `<runRoot>/admin-state.json`، لكنه **لا يستورد** `e2eRunRoot` ولا `path` → **OA-01**. |
| الثمانية | الأسطر المذكورة في 01.2 | كلها تشتق `runRoot` من `e2eRunRoot()` ثم `state`/`admin-state.json` من الجذر نفسه. |

---

## 01.5 العائق الخارجي OA-01

**الملف:** `e2e/setup.spec.ts` — **خارج الثمانية، لم يُعدَّل.**

| السطر | النص | المشكلة |
|---|---|---|
| 1 | `import { expect, test } from "@playwright/test";` | لا يستورد `path` |
| 2 | `import { adminCreds, clearViteOverlay, login } from "./helpers";` | لا يستورد `e2eRunRoot` |
| 41 | `const runRoot = e2eRunRoot();` | معرّف غير مستورد |
| 42 | `await page.context().storageState({ path: path.join(runRoot, "admin-state.json") });` | `path` غير مستورد |

**إثبات عدم وجود تعريف عالمي:**

- `grep` على `declare ... e2eRunRoot` و`globalThis.e2eRunRoot` و`e2eRunRoot =` في `*.ts/*.d.ts/*.mjs/*.js` → **لا نتائج**.
- `playwright.config.ts` لا يحتوي `globalSetup` ولا `setupFiles` ولا preload.
- `worker-configuration.d.ts` هو تعريف Cloudflare، ولا يوفّر `e2eRunRoot`.

**الأثر:** `setup` project لا يستطيع حل المعرّفين؛ وبما أن مشروع E2E يعتمد عليه لإنتاج `admin-state.json`، فإن سلسلة الجلسة غير قابلة للتشغيل بالكامل. هذا **عيب ثابت في حل المعرّفات**، وليس مجرد شك. لم يُثبت بالفشل وقت التشغيل لأن Playwright ممنوع في M01-A.2.

**الإجراء:** لم يُعدَّل. سُجّل في `evidence/remaining-blockers.json` كـ`OUT_OF_ALLOWLIST_BLOCKER-OA-01`. أي إصلاح يتطلب تفويضًا جديدًا (سطران: استيراد `path` و`e2eRunRoot`).

---

## 01.6 الخلاصة

- كل المستهلكين الثمانية المطلوبين يستخدمون الآن جذرًا واحدًا صريحًا ومُتحققًا، ولا يوجد مسار حالة/جلسة/SQL تاريخي نشط فيهم.
- النصوص التاريخية المتبقية في الثمانية نصوص سلبية/ثابتة فقط، ومبررة أعلاه.
- سلسلة config/server/helpers سليمة ومتوافقة.
- تبقى **OA-01** في `e2e/setup.spec.ts` خارج السماح، وتمنع إعلان الإغلاق الساكن الشامل.
