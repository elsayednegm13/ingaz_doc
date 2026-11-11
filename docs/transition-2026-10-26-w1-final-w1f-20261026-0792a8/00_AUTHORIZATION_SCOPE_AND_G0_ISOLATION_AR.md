# 00 — التفويض والنطاق وخط الأساس وعزل G0

- **الأمر:** `EXPORTFLOW-W1-FINAL-EXIT-W2-CONTRACT-GATE-20261026`
- **التاريخ:** 2026-10-26
- **الجذر:** `docs/transition-2026-10-26-w1-final-w1f-20261026-0792a8/`
- **الحالة العامة:** `TECHNICALLY_CLOSED_PENDING_OWNER_ACCEPTANCE`
- **W2:** `NO_FEATURE_IMPLEMENTATION` · `DESIGN_AND_DECISION_ONLY`

## 1. نطاق التفويض المنفَّذ

| البوابة | المطلوب | النتيجة |
|---|---|---|
| `G0` | خط أساس، عزل، نزاهة مصدر، غياب `0009/0010` | PASS |
| `G1` | إثبات حقيقي متزامن لآخر مدير جذر، بما فيه الجذر الوهمي والمنح فقط | PASS مع إصلاح المنتج |
| `G2` | `reports.view_all` مستقل + `0009` إضافي افتراضي المنع | PASS مع إصلاح المنتج |
| `G3` | سباق مراجعة/رفع نسخة المستند + تحليل GAP-10 | PASS مع إصلاح المنتج |
| `G4` | انحدار كامل: `tsc`، typecheck للـe2e، `oxlint`، Vitest، Playwright موجّه مرتين | PASS |
| `G5` | حزمة قرار عقد W2 بلا تنفيذ Quotation | PREPARED_FOR_OWNER_DECISION |

## 2. الحدود التي التُزمت

1. لا أوامر Git، ولا حزم/تحديثات، ولا سحابة/R2 بعيد/remote/staging/production.
2. لا ترحيل `0008` على قاعدة المطور أو remote.
3. لا `0010` مُنشأ أو مُطبَّق؛ تحليل فقط.
4. لا كود Quotation ولا migration ولا صلاحيات W2 جديدة.
5. لا تعديل على `0001..0008`.
6. لا قراءة/إحصاء `.wrangler/state` ولا `.wrangler-e2e` ولا `.wrangler-perf` ولا
   `.wrangler-reliability-*` ولا `.wrangler-transition-audit-*` ولا `.dev.vars*` ولا `.env*`.
7. كل محاولة فاشلة محفوظة في مسارها؛ لا استبدال سجل بنجاح لاحق.
8. كل الجذور جديدة، ملك الجولة، وبورتات `44000+` للهارنس، و`43174` لـPlaywright.
9. كل SQL عبر Wrangler استخدم `--config` و`--persist-to` صريحين.
10. التنظيف ملك العملية فقط: `taskkill /T /F` على PID المملوك، ثم إثبات إغلاق المنفذ وغياب العملية.

## 3. خط أساس G0

| الفحص | القيمة | الملف |
|---|---|---|
| عدد ملفات المصدر | `221` | `evidence/hashes-pre.json` |
| عدد الترحيلات | `8` (`0001..0008`) | `evidence/hashes-pre.json` |
| تغيّر `0001..0008` عن الجولة السابقة | `0` | `evidence/migration-drift-vs-prior.json` |
| تغيّر المصدر الكامل عن الجولة السابقة | `0` | `evidence/source-drift-vs-prior.json` |
| وجود `0009` قبل الجولة | `ABSENT` | خط الأساس |
| وجود `0010` قبل الجولة | `ABSENT` | خط الأساس |
| بورتات الجولة | `FREE` عند الفحص | سجل الجلسة، وأُعيد التحقق في `evidence/cleanup-final.json` |
| حالة `0008` على developer/remote | `NOT_AUTHORIZED_NOT_RUN` | لا تغيير |

اختلاف الإضافة/الحذف في `source-drift-vs-prior.json` (`added=9`, `removed=3`) هو فرق
**مخطط جرد الملفات** بين الجولتين (ملفات تعليمات/إعدادات دخلت أو خرجت من قائمة الجرد)،
وليس تغيّرًا في ملف قائم: `changedCount = 0`.

## 4. عقد العزل Runtime

| العنصر | الإثبات |
|---|---|
| مدخل الإنتاج | `worker/index.ts` ينادي `createApp()` بلا حقن (`productionEntryBareCreateApp=true`) |
| مدخل الهارنس | `tests/w1/w1-final-worker.ts` فقط |
| مصدر الخطأ | متغيرات Worker في config مولّد داخل جذر الجولة: تأخيرات فقط (`W1_ACTIVE_DELAY_MS`, `W1_REVIEW_READ_DELAY_MS`) |
| اختيار العميل للخطأ | `false` — لا Header/Cookie/Query/Body يفعّل تأخيرًا |
| الأسرار | `.dev.vars.e2e` مولّد داخل الجذر، ومفاتيح متحققة قبل تشغيل أي عملية |
| قاعدة البيانات | D1 محلية تحت `<runRoot>/state` أو `<runRoot>/state-fail` |
| بيئة الأبناء | قائمة سماح لنظام التشغيل فقط + عقد التشغيل |
| Playwright | `EXPORTFLOW_E2E_ROOT` صريح + `EXPORTFLOW_E2E_WRANGLER_CONFIG_PATH` صريح |

## 5. المحاولات التمهيدية للهارنس (محفوظة)

| المحاولة | النتيجة | السبب | المعالجة |
|---|---|---|---|
| `attempt-01-g1-prefix-failure` | PASS (7 فحوص) | معايرة أولية للهارنس | بُنيت عليها المحاولة التالية |
| `attempt-01b-g1-prefix-failure` | FAIL (14) | `userRow is not defined` داخل `runG1` | تمرير `userRow` من `main` |
| `attempt-02-g1-prefix-defect` | FAIL (50) | `SIGN_IN_FAILED:429` بعد 7 محاولات سباق | IP اصطناعي مستقل لكل جلسة + `TRUST_CF_CONNECTING_IP=1` في config الجولة |
| `attempt-03-g1-prefix-race` | PASS (68) | سباق متماثل على الكود القديم | أثبت أن الخلل في **تعريف الجذر** لا في القفل |

المحاولة `attempt-02` لم تُخفَ: هي دليل على عطل في الهارنس نفسه، لا في المنتج، وتم
إصلاحها قبل أي استنتاج أمني.

## 6. حدود هذا التقرير

- `G0` لم يعد اختبارًا جديدًا لقاعدة المطور؛ الحالة المعلنة `NOT_AUTHORIZED_NOT_RUN` باقية.
- `W1` السابقة كانت `PARTIAL_WITH_EVIDENCE`؛ هذه الجولة تبني دليلًا جديدًا ولا تعيد تفسير
  تقارير قديمة.
- `GAP-10` بقي `BLOCKED_CONTRACT`؛ لم يُعدّل أي FK أو سياسة احتفاظ.
- لا يوجد ادعاء نجاح staging أو production؛ كلاهما `NO_GO`.

```text
G0_ISOLATION: PASS
BASELINE_FILES: 221
BASELINE_MIGRATIONS: 8
MIGRATION_DRIFT_VS_PRIOR: 0
SOURCE_DRIFT_VS_PRIOR_CHANGED: 0
PROTECTED_STORES_READ: NO
NEXT_STEP: OWNER_REVIEW_AFTER_EVIDENCE
STOP
```
