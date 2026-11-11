# 01 — خط الأساس ونطاق التغيير (Baseline & Change Scope)

**التدقيق:** ET-2026-10-20 · **الجذر:** `I:\WORK\InjazDocs` · **التاريخ:** 2026-10-20/21

## 1.1 حالة المستودع (OBSERVED_TEST)

| البند | القيمة |
|---|---|
| مستودع Git | **نعم** (`git rev-parse --is-inside-work-tree` → `true`) |
| آخر ثلاث internalized commits | `d9106ee` Design pass: reference-faithful dashboard… / `5567fe2` UX: global toast feedback… / `add8fcc` Baseline: ExportFlow local MVP after checkpoints 02..06.7.1 |
| عدد مدخلات `git status --short` | **155** (تعديلات + ملفات غير متتبَّعة) |
| أي commit جديد في هذه الجولة | **لا** |
| أي push / tag / branch / reset / clean | **لا** |
| حجم السطر | `3589` إضافة / `1149` حذف عبر 124 ملفًا (مقابل `d9106ee`) |

> `OBSERVED_TEST`: `git status --short | Measure-Object -Line` في جذر المشروع.
> **مهم:** هذه التعديلات كانت موجودة **قبل** استدعاء هذا التدقيق؛ هذا التدقيق لم يغيّر أيًّا منها (انظر 21).

## 1.2 خط الأساس الذي راجعه هذا التدقيق

خط الأساس هو **الشجرة كما كانت عند الاستدعاء**: كل إصلاحات 20 أكتوبر (طبقة الـIdempotency، الذرّية، الاستيراد، الـSkeleton، الاستجابة) موجودة **غير مُرسَلة** في شجرة العمل، إضافةً إلى تقريرَي 20 أكتوبر.

| المكوّن | الحالة عند الاستدعاء | مصدر التحقق |
|---|---|---|
| `server/services/idempotency.ts` + `0005_idempotency.sql` | موجود | `00_SOURCE_READ_LEDGER.md` L-01..L-07 |
| `server/services/imports.ts` + `0006_customer_imports.sql` | موجود | L-08..L-11 |
| `src/components/ui/skeleton.tsx` | موجود | L-29 |
| `e2e/duplicates.spec.ts` (11)، `e2e/atomicity.spec.ts` (6)، `e2e/responsive.spec.ts` (5) | موجودة | §15 |
| ترحيلات `0007_performance_indexes.sql` | موجودة | L-20، L-24 |
| `docs/ENGINEERING_AUDIT_2026-10-20.md`، `docs/SYSTEM_AUDIT_2026-10-20.md` | موجودان | C-1..C-5 |

## 1.3 نطاق ما يمكن وما لا يمكن للتدقيق (بلا تغييرات)

| المسار | قرار التدقيق | السبب |
|---|---|---|
| `server/**` | **بلا تعديل** | S00.3 |
| `src/**` | **بلا تعديل** | S00.3 |
| `shared/**` | **بلا تعديل** | S00.3 |
| `drizzle/migrations/**` | **بلا تعديل** (نسخ فقط إلى `docs/transition-2026-10-20/fixtures/`) | S00.3 |
| `vite.config.ts`، `wrangler.jsonc`، `package.json`، ملفات القفل | **بلا تعديل** | S00.3 |
| `docs/API.md`، `docs/openapi.yaml` | **بلا تعديل** (الفروق مُوثَّقة كملاحظات في 16) | S00.4 |
| `.wrangler/state/**`، `.dev.vars*` | **بلا فتح/قراءة/كتابة** | S00.7، S00.8 |
| أي مورد سحابي بعيد | **بلا لمس** | S00.6 |
| `docs/transition-2026-10-20/**` | **المخرجات الوحيدة المسموح إنشاؤها** | S14 |

## 1.4 قائمة الملفات التي أنشأها هذا التدقيق (سجل كامل)

| # | المسار | النوع | الغرض |
|---|---|---|---|
| N-01 | `docs/transition-2026-10-20/00..21 + FINAL_*.md` | تقارير | مخرجات S14/S15 |
| N-02 | `docs/transition-2026-10-20/evidence/*.json` | أدلة | نتائج المقاييس ولقطة المخطط |
| N-03 | `docs/transition-2026-10-20/evidence/*.log` | أدلة | مخرجات الأوامر |
| N-04 | `docs/transition-2026-10-20/evidence/protected-paths/*.json` | أدلة | جرد المسارات المحمية (قبل/بعد) |
| N-05 | `docs/transition-2026-10-20/fixtures/wrangler.audit.*.jsonc` | إعداد | إعدادات Wrangler مملوكة للتدقيق |
| N-06 | `docs/transition-2026-10-20/fixtures/migrations-all/`، `migrations-0004/`، `migrations-0003/` | نسخ | نسخ بايت-ببايت من الترحيلات (لم تُعدَّل) |
| N-07 | `docs/transition-2026-10-20/fixtures/seed/legacy-0004.sql` | بذرة | بيانات اصطناعية لقاعدة 0004 «طويلة العمر» |
| N-08 | `docs/transition-2026-10-20/probes/*.mjs`، `*.ps1` | مقاييس | أدوات اختبار معزولة قابلة لإعادة التشغيل |
| N-09 | `.wrangler-transition-audit-20261020-{c,u,p,f,h,cwd}` | متاجر | متاجر D1 محلية مملوكة للتدقيق (`.gitignore` يغطي `.wrangler-*`) |

**تحقّق سلامة النسخ (0005–0007):** docs/transition-2026-10-20/fixtures/migrations-all/*.sql مطابقة بايت-ببايت للأصل (SHA-256 في evidence/source-manifest.json للأصل؛ والمقارنة بالطول والبصمة أدناه).

| الملف | الأصل | النسخة | متطابق |
|---|---|---|---|
| `0005_idempotency.sql` | `drizzle/migrations/` | `fixtures/migrations-all/` | نعم |
| `0006_customer_imports.sql` | `drizzle/migrations/` | `fixtures/migrations-all/` | نعم |
| `0007_performance_indexes.sql` | `drizzle/migrations/` | `fixtures/migrations-all/` | نعم |

## 1.5 بيان «لم أعدّل شيفرة الإنتاج» (تحقّق)

| الفحص | الأمر | النتيجة |
|---|---|---|
| الملفات المعدّلة في `server/`/`src/`/`shared/`/`drizzle/` | `git diff --stat -- server src shared drizzle` | **0** (لم تُضَف أي تعديلات جديدة في هذه الجولة) |
| مخطط الأصول | `evidence/source-manifest.json` | 38 ملفًا ببصمات SHA-256 |
| عدد ملفات التقارير المُنتَجة | `Get-ChildItem docs/transition-2026-10-20` | 23 ملفًا (مطلوب) + `evidence/` + `fixtures/` + `probes/` |

> **تحفّظ صريح:** `evidence/source-manifest.json` يوثّق بصمات **وقت** التدقيق، ولا يوجد عند المالك مرجع تاريخي مستقل للمقارنة (S00.1: «لا تُدّعِ هوية بايتية تاريخية دون بصمة تاريخية متاحة»).
