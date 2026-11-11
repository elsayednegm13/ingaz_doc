# 04 — G4: الانحدار وRuntime الحقيقي

- **البوابة:** `G4` — `REGRESSION_AND_RUNTIME`
- **الحكم:** `PASS`
- **المكوّنات:** `tsc -b`، فحص TypeScript مستقل لـ`e2e/**`، `oxlint`، Vitest كامل، Playwright موجّه على جذرين جديدين.

## 1. الخلاصة

| الفحص | المحاولة | النتيجة |
|---|---|---|
| `tsc -b` | `attempt-22` | `0` أخطاء |
| TypeScript لـ`e2e/**` | `attempt-22` | `19` ملفًا، `0` تشخيصًا |
| `oxlint` | `attempt-22` | `0` أخطاء، `16` تحذيرًا سابقًا خارج الملفات المعدّلة |
| Vitest | `attempt-23` | `16` ملفًا، `107` اختبارًا — كلها PASS |
| Playwright موجّه | `attempt-20` | **10/10 PASS** — 3.8 دقيقة |
| Playwright موجّه | `attempt-21` | **10/10 PASS** — 3.5 دقيقة |
| المنفذ 43174 | بعد كل تشغيل | مغلق |
| عمليات متبقية | بعد كل تشغيل | `0` |

أُعيد تشغيل الفحوص الثابتة وVitest مرتين (`17/18` ثم `22/23`) بعد آخر تعديل على الاختبارات،
والنتيجة النهائية هي المذكورة أعلاه. المحاولات الأربع محفوظة.

## 2. الفحوص الثابتة

### 2.1 `tsc -b`

```text
tsc exit = 0
```

### 2.2 TypeScript لـ`e2e/**`

`e2e/**` ليس ضمن أي مشروع `tsconfig` مرجعي، لذلك لا يفحصه `tsc -b`. استُخدم
`scripts/w1/e2e-typecheck.mjs` لبناء برنامج مستقل بنفس الخيارات الصارمة، بلا كتابة أو
تعديل أي `tsconfig`:

```json
{"outcome":"PASS","files":19,"diagnostics":0}
```

### 2.3 `oxlint`

| القياس | القيمة |
|---|---|
| الأخطاء | `0` |
| التحذيرات | `16` |
| ملفات التحذيرات | `src/features/fields/CustomFieldsPanel.tsx`، `tests/isolation-safety/guard-path.test.mjs`، `tests/isolation-safety/m01b1-worker-config-isolation.test.mjs`، `tests/isolation-safety/strong-guard-path.test.mjs` |
| تحذيرات في ملفات هذه الجولة | **`0`** |

التحذيرات الـ16 سابقة لهذه الجولة ولم تزد. لم تُخفَّ ولم تُعطَّل قواعد الـlint.

## 3. Vitest

```text
Test Files  16 passed (16)
     Tests  107 passed (107)
  Duration  40.92s
```

يشمل ذلك اختبارات D1 وidempotency والعزل والأمان والواجهات. لم يُستثنَ أي ملف.

## 4. Playwright الموجّه

### 4.1 الاختبارات العشرة

| # | الاختبار | الحالة |
|---:|---|---|
| 1 | `[setup] E2E-01 bootstrap is one-shot and login reaches the dashboard` | PASS |
| 2 | `[setup] E2E-01 logout and protected redirect` | PASS |
| 3 | `E2E-04 FOB invoice keeps an explicit total and a separate freight expense` | PASS |
| 4 | `E2E-06 document checklist states stay distinct` | PASS |
| 5 | `E2E-07 versioned PDF upload, correction, and denied download` | PASS |
| 6 | `E2E-14 search, csv export, and empty reminder copy` | PASS |
| 7 | `E2E-15 snoozed reminder resolves after the document is approved` | PASS |
| 8 | `E2E-15b upload without approval keeps the review reminder` | PASS |
| 9 | `A3 last effective administrator cannot be removed and a second admin can` | PASS |
| 10 | `W1C-02 a new document version after approval resets the requirement to UPLOADED` | PASS |

`E2E-15b` دخل تلقائيًا لأن مرشّح `--grep "E2E-15"` يطابق العنوانين. هذا سلوك Playwright
متوقع، وليس توسيعًا يدويًا للنطاق.

### 4.2 المحاولة الفاشلة `attempt-19` (محفوظة)

`playwright exit = 1`، والمنفذ أُغلق، والمخرجات محفوظة بما فيها `test-results` (7 ملفات:
لقطات، trace، سياق خطأ). سببان، كلاهما في الاختبار لا في المنتج:

1. **`W1C-02`**: مساعد SQL في `e2e/helpers.ts` يتطلب
   `EXPORTFLOW_E2E_WRANGLER_CONFIG_PATH`، ولم يكن المتغيّر مُصدَّرًا لعملية Playwright.
   الرسالة نفسها تصميم fail-closed مقصود (GAP-14)، لا عطل في المنتج.
2. **`E2E-15`**: locator `[data-status="UNDER_REVIEW"]` غامض — يطابق أكثر من عنصر داخل
   البطاقة بعد إضافة شارة ثانية، فيفشل بـstrict mode. E2E-07 كان قد حُلّ بنمط محدد،
   ولم يُطبَّق النمط نفسه على E2E-15.

**الإصلاح (اختبار فقط):**

- تصدير `EXPORTFLOW_E2E_WRANGLER_CONFIG_PATH` إلى عملية Playwright.
- استبدال locator E2E-15 بالنمط الحتمي المستخدم في E2E-07:

```ts
requirementCard(page, "Commercial Invoice")
  .locator('div.font-medium + span[data-status="APPROVED"]')
```

لم يُعدَّل أي كود منتج بسبب هذه المحاولة.

### 4.3 لماذا إعادتان؟

| المحاولة | الجذر | الزمن | النتيجة |
|---|---|---:|---|
| `attempt-20` | `.wrangler-safety-20261021-w1f-e2e1b-0792a8` | 3.8m | 10/10 |
| `attempt-21` | `.wrangler-safety-20261021-w1f-e2e2-0792a8` | 3.5m | 10/10 |

الإعادة الثانية ليست تكرارًا شكليًا: الجذر الأول جديد بالكامل (migrations + bootstrap +
بيانات)، والثاني جذر جديد آخر. النجاح مرتين على أرضية نظيفة يقلّل احتمال أن يكون النجاح
الأول أثرًا متبقيًا من محاولة سابقة.

### 4.4 العزل والتنظيف

| القياس | `attempt-20` | `attempt-21` |
|---|---|---|
| `EXPORTFLOW_E2E_ROOT` | صريح، جذر جديد | صريح، جذر جديد |
| `EXPORTFLOW_E2E_WRANGLER_CONFIG_PATH` | صريح داخل الجذر | صريح داخل الجذر |
| `TMP`/`TEMP` | داخل مجلد الدليل | داخل مجلد الدليل |
| المنفذ 43174 بعد التشغيل | مغلق | مغلق |
| عمليات متبقية | `0` | `0` |
| رمز الخروج | `0` | `0` |

`attempt-19` سجّل `leftoverProcesses=1` لحظة القياس، والتحقق اللاحق في
`attempt-19/cleanup-verification.json` يثبت أنه كان **عملية PowerShell المستدعية** التي
يحتوي سطر أوامرها على اسم الجذر، وأن Playwright وأبناءه خرجوا. لم يُحذف السجل الأصلي؛
أُضيف ملف تحقق منفصل.

### 4.5 ملاحظة تشغيلية

سجل خادم E2E يُظهر تحذير Better Auth مرة واحدة عند bootstrap:

```text
Rate limiting could not determine a client IP and is falling back to a single shared per-path bucket.
```

هذا **سلوك بيئة اختبار** (طلب bootstrap بلا رأس IP موثوق)، وليس تغييرًا في المنتج ولا
فشلًا. لم يمنع أي اختبار. هارنس G1/G2/G3 يستخدم IP اصطناعيًا لكل جلسة ولا يُظهر هذا التحذير.

## 5. علاقة ذلك بـD-3

لا توجد حزمة اختبارات باسم `D3` في هذا المستودع. المسار الحقيقي لـD-3 مغطى بهذه
الاختبارات الموجّهة نفسها (ACL، الأدوار، المستندات، التقارير، التذكيرات). لذلك:

```text
D3_REAL_PATH: PASS (covered by targeted Playwright 10/10 x2; no separate D3-named suite)
```

## 6. ما لا يثبته هذا الدليل

1. ليست حزمة Playwright الكاملة؛ هي 10 اختبارات موجّهة تغطي المسارات المتأثرة والحرجة.
2. لا تشمل تدقيق وصول شاملًا (a11y) ولا اختبار حمل/أداء.
3. لا تشمل متصفحات متعددة؛ الإعداد يستخدم قناة Chrome المحلية.
4. لا تثبت سلوك staging أو production.

```text
GATE: G4
RESULT: PASS
TSC: PASS
E2E_TYPECHECK: PASS (19 files, 0 diagnostics)
OXLINT: PASS (0 errors, 16 pre-existing warnings outside changed files)
VITEST: PASS (16 files, 107 tests)
PLAYWRIGHT_TARGETED: PASS 10/10 x2
PLAYWRIGHT_FAILED_ATTEMPT_PRESERVED: attempt-19
PORT_43174_AFTER_RUNS: CLOSED
LEFTOVER_PROCESSES: 0
D3_REAL_PATH: PASS (covered)
STOP
```
