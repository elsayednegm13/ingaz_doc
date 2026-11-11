# 02 — بروتوكول العزل والاختبار (Isolation & Test Protocol)

**التدقيق:** ET-2026-10-20 · **التاريخ:** 2026-10-20/21

## 2.1 القاعدة الحاكمة

> **قاعدة الحدّ الفاصل:** كل أمر capable من الكتابة يجب أن يكون هدفه في متجر **مملوك للتدقيق**،
> مُثبت مسبقًا (اسم + مسار + مالك + غرض + الكتابات المتوقَّعة)، وإلا لا يُنفَّذ.

## 2.2 الآليات الثلاث للعزل (OBSERVED_SOURCE + OBSERVED_TEST)

| # | الآلية | كيف تعمل | دليل التحقق |
|---|---|---|---|
| I-1 | `--cwd <dir>` | يثبّت جذر wrangler على مجلد مملوك للتدقيق: أي مسار افتراضي (`.wrangler/state`…) يقع **داخل** شجرة التدقيق | `evidence/protected-paths/after-mig-U1.json`: مجلد المطوّر لم يتغيّر |
| I-2 | `--config <abs>` | إعداد Wrangler مملوك للتدقيق: `database_name=exportflow-audit-local` و`database_id=audit-only-not-a-remote-id` ⇒ **هاش ملف D1 مختلف** عن المطوّر | اسم ملف D1 في التدقيق: `5bcd8b73…sqlite` مقابل `e086a16c…sqlite` في `.wrangler/state` |
| I-3 | `--persist-to <abs>` | صراحةً يوجّه التخزين المحلي | مخرجات runner: `… from ..\.wrangler-transition-audit-20261020-u\v3\d1` |

**تجزئة معرّفات D1 (مهم):** في `.wrangler/state` اسم الملف `e086a16c2df761e404ed26001d3f081a26268e90033ffbf14d8419a939ea8dbc.sqlite` (مشتقّ من `database_id` الخاص بالمشروع). في متاجر التدقيق الاسم `5bcd8b734e767fe9c7fef01cf1ff94165922cf1060999bda18b44f43db16e15b.sqlite` (مشتقّ من `audit-only-not-a-remote-id`). **لا يمكن أن يتقاطعا.**

## 2.3 كيف يُحلّ مسار التخزين في المشروع (فحص الشيفرة)

| المكوّن | الملاحظة | المرجع |
|---|---|---|
| `vite.config.ts` | `persistState: { path: process.env.EXPORTFLOW_PERSIST ?? ".wrangler/state" }` | `vite.config.ts:96-101` |
| `@cloudflare/vite-plugin` | `getPersistenceRoot(root, persistState)` → `path.resolve(root, persistState.path, "v3")` | `node_modules/@cloudflare/vite-plugin/dist/index.mjs:95368-95372` |
| `scripts/e2e-server.mjs` | يضبط `EXPORTFLOW_PERSIST=<root>/.wrangler-e2e/state` ويحذفه عند كل تشغيل | `scripts/e2e-server.mjs:7,11,39` |
| `wrangler` CLI | `--persist-to` + `--cwd` + `--config` | `wrangler d1 migrations apply --help` |

**نتيجة الفحص:** مسار التخزين **قابل للعزل ميكانيكيًا** عبر `wrangler` CLI. أما خادم Vite (المستخدم في `scripts/e2e-server.mjs`) فمساره معزول *للبيانات* (الملفات ذهبت إلى `.wrangler-e2e/state` كما ثبت في الجرد) لكن **سلوكه الجانبي على المسار الافتراضي غير مُفسَّر تمامًا** (انظر 2.6).

## 2.4 بروتوكول القيود المطبَّقة على كل اختبار

| القيد | التطبيق العملي | الدليل |
|---|---|---|
| لا قراءة `.wrangler/state` | `Get-ChildItem` للبيانات الوصفية فقط؛ لا `sqlite3` ولا `node:sqlite` ولا `wrangler d1 execute` على ذلك المسار | `evidence/protected-paths/*.json` |
| لا `.dev.vars` | لم يُقرأ محتوى أي `.dev.vars*`؛ نُسخ `wrangler.audit.dev.jsonc` بـ `--var` على سطر الأوامر | `evidence/harness-dev-server.log` يعرض `Environment Variable (hidden)` |
| لا مورد بعيد | `database_id` اصطناعي؛ لا `--remote` في أي أمر؛ لا استدعاء لـ Cloudflare API | سجلّ الأوامر في 19 |
| بيانات اصطناعية فقط | كل المعرّفات في البذرة تبدأ بـ `audit-`؛ لا بريد ولا حساب بنكي حقيقي | `fixtures/seed/legacy-0004.sql` |
| عدم إتلاف بيانات المستخدم | الحذف فقط داخل `.wrangler-transition-audit-*` المنشأة في هذه الجولة | `probes/*.mjs` (حراس refusals) |
| قابلية الإعادة | كل أداة تأخذ `--persist` وترفض التشغيل إن لم يكن المسار يحتوي `transition-audit` | `snapshot-db.mjs`، `break-fixture.mjs`، `bulk-fill.mjs` |

## 2.5 حارس رفض المسارات (مطبَّق في الأدوات)

```text
REFUSED: <path> is not an audit-owned store      (snapshot-db.mjs)
REFUSED: persist root <path> is not named as an audit root
REFUSED: not an audit root                       (bulk-fill.mjs, break-fixture.mjs)
```

المسارات الممنوعة صراحة (لا تفتحها أي أداة): .wrangler/state، .wrangler-e2e، .wrangler-perf.

## 2.6 ملاحظة عزل مهمة (must be read by the owner)

`OBSERVED_TEST` (جرد بيانات وصفية، دون فتح أي SQLite):

| المسار | قبل التدقيق | بعد كل تشغيلات التدقيق | الحكم |
|---|---|---|---|
| `.wrangler/state` (إجمالي) | 70,286,836 بايت؛ أحدث ملف ابن 2026-10-20T21:02:51Z | **70,286,836 بايت؛ أحدث ملف ابن 2026-10-20T21:02:51Z** | **بلا تغيير** |
| `.wrangler-e2e` | 27,186,522 بايت | 27,186,522 بايت | بلا تغيير |
| `.wrangler-perf` | 128,845,960 بايت | 128,845,960 بايت | بلا تغيير |
| `.dev.vars` | 152 بايت | 152 بايت | بلا تغيير |

**القراءة الدقيقة:** أثناء الجولة السابقة (قبل هذا التدقيق) كانت أوقات تعديل ملفات D1 داخل `.wrangler/state` هي 20:50:56 (الملف الرئيسي) و21:02:44/21:02:51 (WAL/SHM) — أي **أثناء** تشغيلات `scripts/e2e-server.mjs` (خادم Vite). الملفات الفعلية للاختبار كانت في `.wrangler-e2e/state` (ملف D1 بطول 1,007,616 بايت وبيانات E2E). أي أن:

1. **بيانات الاختبار المعزولة كانت فعلًا في المتجر المعزول.** `OBSERVED_TEST`
2. **المرافق (WAL/SHM) في مجلد المطوّر تغيّرت.** `OBSERVED_TEST` (بيانات وصفية فقط)
3. **السبب الجذري غير مُفسَّر** (`UNVERIFIED`): إمّا أن نسخة workerd في إضافة Vite تفتح قاعدة D1 الافتراضية، أو أن مسارًا آخر في حلقة `e2e-server.mjs` يفتحها. **لم أُشغّل خادم Vite في هذه الجولة** لتفادي تكرار ذلك.

**التوصية (بلا تطبيق):** تشغيل `scripts/e2e-server.mjs` مع `--cwd` مثبَّت على متجر التدقيق، أو إضافة حارس refusals داخل السكربت، قبل أي إعادة استخدام للاختبارات على جهاز المطوّر.

## 2.7 حدود مُعلَنة (Limits)

| الحد | التفصيل |
|---|---|
| لا اختبار عبر عزل حقيقي | الاختبارات تعمل على Miniflare/workerd محلي؛ لا يوجد Multi-Isolate حقيقي ⇒ `IDEM-P` مُثبت على مسار متسلسل لا على سباق حقيقي (انظر 08). |
| لا R2 حقيقي | سلوك R2 الحقيقي `NOT_TESTED` (لا بيئة سحابية مسموحة). |
| لا قياس على Cloudflare | كل أرقام الأداء محلية. |
| لا مخطط قاعدة المطوّر | الذراع U مبني على **بذرة اصطناعية**؛ لم يُشتق من `.wrangler/state` (S04.1 يسمح بـ U-REAL فقط بموافقة صريحة — غير متاحة ⇒ `UNVERIFIED`). |
