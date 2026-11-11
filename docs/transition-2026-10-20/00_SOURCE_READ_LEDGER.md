# 00 — سجل قراءة المصادر (Source Read Ledger)

**التدقيق:** ET-2026-10-20 · **الجذر:** `I:\WORK\InjazDocs` · **التاريخ:** 2026-10-20/21

## 0.1 ترميز الأدلة المستخدم في كل ملفات التدقيق

| الرمز | المعنى |
|---|---|
| `OBSERVED_SOURCE` | مقروء مباشرة من الشيفرة في هذه الجولة (مع مسار ودالة/سطر). |
| `OBSERVED_TEST` | نُفِّذ في هذه الجولة داخل بيئة معزولة، والنتيجة مخزَّنة في `docs/transition-2026-10-20/evidence/`. |
| `PRIOR_REPORT` | مأخوذ من تقرير سابق (`docs/ENGINEERING_AUDIT_2026-10-20.md` أو `docs/SYSTEM_AUDIT_2026-10-20.md`) ولم يُعَد التحقق منه هنا إلا إذا ذُكر صراحة. |
| `INFERENCE` | استنتاج منطقي من أدلة مرصودة، وليس قياسًا مباشرًا. |
| `UNVERIFIED` | لم يُتحقق منه؛ يُذكر سبب النقص. |
| `PROPOSED_NOT_APPLIED` | مقترح لم يُطبَّق (بلا تعديل على الشيفرة). |

## 0.2 سجل المصادر (Source ledger)

| # | CLAIM | EVIDENCE_PATH | FUNCTION_OR_RANGE | EXECUTION_PROOF | CONFIDENCE | CONTRADICTION | REMEDIATION_REQUIRED |
|---|---|---|---|---|---|---|---|
| L-01 | طبقة Idempotency موجودة على مسارات `/api/v1` المعدِّلة | `server/http/app.ts` | `api.use("/*")` السطور 342-465 | `evidence/runtime-probes.json` (IDEM-A..P) | عالية | لا | لا |
| L-02 | المسار المُعدِّل يستهلك السرّ/المفتاح بشكل ذرّي | `server/services/idempotency.ts` | `beginIdempotent` 91-170 | `evidence/runtime-probes.json` (IDEM-P: 10 طلبات → سجل واحد) | عالية | لا | لا |
| L-03 | بصمة الطلب تشمل المسار مع سلسلة الاستعلام | `server/http/app.ts` | 373 `path = ${url.pathname}${url.search}` | `evidence/runtime-probes.json` (IDEM-B: استعلام مختلف → 422) | عالية | لا | لا |
| L-04 | إعادة التشغيل تُعاد **قبل** فحص صلاحيات المسار | `server/http/app.ts` | 378-382 | `evidence/runtime-probes.json` (IDEM-E: لا استدعاء لـ `assertCaseAccess`) | عالية | لا | نعم (تصميم — انظر 09) |
| L-05 | تغيير الصلاحيات يحذف مفاتيح الـIdempotency | `server/services/users.ts` | 75 / 120 / 146 / 197 | `evidence/runtime-probes-2.json` (IDEM-D، IDEM-D2) | عالية | لا | نعم (حذف مدمر — انظر 09) |
| L-06 | الحذف المدمر يسمح بإعادة كتابة منطقية | `server/services/idempotency.ts` | `revokeIdempotencyForActor` 210-212 | `evidence/runtime-probes-2.json` (IDEM-F: صفّان لنفس العملية) | عالية | تقرير النظام يذكر الإبطال دون أثر التكرار | نعم (P1) |
| L-07 | نافذة الحمايةساعة فقط | `server/services/idempotency.ts` | `TTL_MS = 60*60*1000` (19) + الحذف عند الانتهاء (103-106) | `evidence/runtime-probes-2.json` (IDEM-G: صفّان بعد انتهاء الصلاحية) | عالية | لا | نعم (توثيق/قرار) |
| L-08 | الاستيراد يتتبع العملية بمعرّف فقط بلا بصمة ملف | `server/services/imports.ts` | `commitCustomerImport` 43-68 | `evidence/runtime-probes.json` (IMP-B: HTTP 200 لملف مختلف) | عالية | لا | نعم (P1) |
| L-09 | استيراد الملف المختلف بنفس `importId` يقبل ويُنشئ عملاء جددًا | `server/services/imports.ts` | 82-110 (تخطّي الصفوف المستوردة فقط) | `evidence/runtime-probes.json` (IMP-B: imported=2, skipped=2) | عالية | لا | نعم (P0/P1) |
| L-10 | إعادة ترتيب الصفوف بنفس `importId` تعيد استيراد صفوف مستوردة | `server/services/imports.ts` | هوية الصف = رقم السطر (84) | `evidence/runtime-probes.json` (IMP-C: imported=3) | عالية | لا | نعم |
| L-11 | `importId` مملوك لفاعل واحد | `server/services/imports.ts` | 53-68 (`IMPORT_ID_CONFLICT`) | `evidence/runtime-probes.json` (IMP-E: 409) | عالية | لا | لا |
| L-12 | `createCustomer` ذرّي بـ D1 batch | `server/services/customers.ts` | `createCustomer` | `PRIOR_REPORT` + `e2e/atomicity.spec.ts` (ATOM-01..03) | متوسطة | لا | لا |
| L-13 | `createCase` ذرّي | `server/services/cases.ts` | `createCase` | `PRIOR_REPORT` + `e2e/atomicity.spec.ts` (ATOM-06) | متوسطة | لا | لا |
| L-14 | إنشاء المستخدم له معاملة تعويضية | `server/http/app.ts` | 564-577 | `evidence/runtime-probes.json` (AUTH-01/04) + تحليل المصدر | عالية | لا | نعم (فشل التعويض نفسه) |
| L-15 | Bootstrap يتحقق قبل الاستهلاك ويحرّر السرّ عند الفشل | `server/http/app.ts` | 258-309 | `evidence/runtime-probes.json` (AUTH-05/07a/07b) | عالية | لا | نعم (فشل الـbatch التعويضي) |
| L-31 | تطوير قاعدة المطوّر لم تُفتح | `.wrangler/state` | بيانات وصفية فقط | `evidence/protected-paths/before-audit.json` ↔ `final.json`: الملف الرئيسي بقجمه (864,256 B) بلا تغيير، لكن **checkpoint** عند إيقاف حزمة التدقيق حذف ملفي WAL/SHM | **انحراف G01 (بيانات وصفية)** | لا | نعم (إيقاف استخدام `wrangler dev` لحزم التدقيق) |
| L-17 | بوابة تغيير كلمة المرور مطبَّقة في الخادم | `server/http/app.ts` | 355-367 | `evidence/runtime-probes.json` (AUTH-08a: 403) | عالية | لا | لا |
| L-18 | تعطيل المستخدم يبطل جلساته ومفاتيحه | `server/services/users.ts` | 143-146 | `evidence/runtime-probes-2.json` (AUTH-09: 401) | عالية | لا | لا |
| L-19 | حماية آخر مدير فعّال | `server/services/users.ts` | 35-39، 133-137 | `evidence/runtime-probes-2.json` (SEC-ADMIN: 409 LAST_ADMIN) | عالية | لا | لا |
| L-20 | الترحيلات 0005-0007 **إضافة فقط** | `drizzle/migrations/0005..0007` | نصوص الملفات | `evidence/armU-before-0004.json` ↔ `armU-after-0007.json` (51 جدولًا: بصمة متطابقة) | عالية | لا | لا |
| L-21 | ترقية 0004→0007 تعمل على بيانات قائمة | — | — | `evidence/mig-U3-upgrade-0005-0007.log` + `armU-after-0007.json` | عالية | تقرير النظام أثبت «من الصفر» فقط | لا |
| L-22 | فشل الترحيل يظهر بوضوح ولا يُصلَح تلقائيًا | `scripts/...` +official runner | — | `evidence/mig-F2-broken-apply.log` (exit 1، no such table: main.roles) | عالية | لا | لا |
| L-23 | إعادة تشغيل official runner لا تفعل شيئًا | — | — | `evidence/mig-C2-rerun.log` («No migrations to apply!») | عالية | لا | لا |
| L-24 | الفهارس الجديدة مستخدمة فعليًا في المخطِّط | `drizzle/migrations/0007_performance_indexes.sql` | 6 فهارس | `EXPLAIN QUERY PLAN` على 5004 صفًّا (مخرجات Bulk-fill) | عالية | لا | لا |
| L-25 | التطبيق لا يفحص إصدار المخطط | `server/http/app.ts` | `/api/v1/health` 217-244 | قراءة المصدر: لا فحص `d1_migrations` | متوسطة | لا | نعم (فشل مغلق) |
| L-26 | فحص Origin على كل تعديل | `server/http/app.ts` | 343-347 | `evidence/runtime-probes.json` (كل الطلبات تحمل Origin) | عالية | لا | لا |
| L-27 | خطاف حقن الأخطاء موجود في شيفرة الإنتاج | `server/http/app.ts` | 407-416 (`EXPORTFLOW_TEST_FAULTS`) | `evidence/runtime-probes.json` (IDEM-H) | عالية | لا | نعم (تقييد/تحذير) |
| L-28 | الاستجابة على الهاتف بلا تجاوز أفقي | `docs/audit/2026-10-20/responsive/report.json` | 136 قياسًا | `OBSERVED_TEST` (بتقرير الفحص) + 3 لقطات فُحصت يدويًا | عالية | لا | لا |
| L-29 | الـSkeleton يعلن `aria-busy` | `src/components/ui/skeleton.tsx` | 17-24 | `docs/audit/2026-10-20/skeletons/report.json` (14/14) | عالية | لا | لا |
| L-30 | لا اختبارات مُعطَّلة أو حصرية | `e2e/*.ts`, `tests/*.ts` | فحص `.only/.skip/.fixme/.todo` | لا نتائج | عالية | لا | لا |
| L-31 | قاعدة بيانات المطوّر لم تُفتح | `.wrangler/state` | بيانات وصفية فقط | `evidence/protected-paths/before-audit.json` ↔ `after-all-audit-runs.json` (متطابقة بايتًا) | عالية | لا | لا |
| L-32 | الرفع على R2 الحقيقي غير مُتحقق | `server/services/uploads.ts` | منطق التوقيع | `UNVERIFIED` (لا بيئة سحابية) | منخفضة | لا | قرار المالك |
| L-33 | قياسات الحمل محلية فقط | `scripts/audit-load-test.mjs` | 21-81 | `docs/audit/2026-10-20/load-test.json` | عالية | لا | لا |

## 0.3 ملفات قُرئت (كاملة أو جزئيًا)

| الملف | الحالة | ملاحظة |
|---|---|---|
| `docs/ENGINEERING_AUDIT_2026-10-20.md` | كامل | تقرير الجولة الأولى (A–J). |
| `docs/SYSTEM_AUDIT_2026-10-20.md` | كامل | تقرير الجولة الثانية (11 قسمًا). |
| `package.json`, `wrangler.jsonc`, `vite.config.ts`, `playwright.config.ts`, `.gitignore` | كامل | إعدادات المشروع. |
| `server/http/app.ts` | جزئي (كل المسارات + الوسائط + Bootstrap + المستخدمون) | 900+ سطر. |
| `server/services/idempotency.ts` | كامل | 219 سطرًا. |
| `server/services/imports.ts` | كامل | حجم الدالة الرئيسية. |
| `server/services/actor.ts` | كامل | 117 سطرًا. |
| `server/services/users.ts` | جزئي (60%) | الأجزاء المتrelated بالصلاحيات والتعويض. |
| `server/services/cases.ts` | جزئي (الدالة `createCase`) | للذرّية والمرجع. |
| `server/services/customers.ts` | جزئي (حدود الإدخال) | للتحقق. |
| `server/auth.ts` | جزئي (40 سطرًا) | إعداد Better Auth. |
| `server/domain/transitions.ts`, `shared/enums.ts` | كامل | ثوابت المجال. |
| `drizzle/migrations/0001..0007` | كامل (نصوص) | للتأكد من عدم وجود تعديل. |
| `e2e/*.spec.ts` (16 ملفًا) | عدّاد + قراءة `duplicates/atomicity/responsive/session-hardening` | للتوثيق. |
| `tests/*.test.ts` (9 ملفات) | عدّاد | 34 اختبارًا. |
| `src/components/ui/skeleton.tsx` | جزئي | نظام الـSkeleton. |
| `src/lib/idempotency.ts` | كامل | سلوك الواجهة. |
| `src/app/shell.tsx` | جزئي | الترويسة المتجاوبة. |
| `docs/audit/2026-10-20/**` | كامل | الأدلة السابقة. |

## 0.4 ملفات متروكة عمدًا (ولماذا)

| الملف/المسار | السبب |
|---|---|
| `.dev.vars` (وكل `.dev.vars.*` المحتوي على أسرار) | ممنوع بحدود S00.7؛ لم يُفتح محتوى أي منها، سُجّلت بياناتها الوصفية فقط. |
| `.wrangler/state/**` | ممنوع بحدود S00.8؛ لم يُفتح أي ملف SQLite منه (عدّاد الفهرس + بيانات وصفية فقط). |
| ملفات R2 الخاصة (`.wrangler/state/v3/r2/**`) | بيانات ملفات خاصة؛ لم تُنسخ ولم تُقرأ. |
| `node_modules/**` | كمصدر تبعيات فقط (قراءة `vite-plugin` لتحديد مسار التخزين). |
| `docs/qa-screenshots/**` | مخرجات مولَّدة آليًا؛ سُجّلت كملاحظة (9.2)، لم تُراجَع صورةً صورة. |
| `playwright-report/`, `test-results/` | مخرجات مولَّدة؛ خارج نطاق هذا التدقيق. |

## 0.5 تعارضات بين التقريرات (موثّقة)

| # | التعارض | الدليل | الحكم في هذا التدقيق |
|---|---|---|---|
| C-1 | «47/47 مرتين» مقابل «58/58 مرة واحدة» | `docs/ENGINEERING_AUDIT_2026-10-20.md` مقابل `docs/SYSTEM_AUDIT_2026-10-20.md` | **ليس تعارضًا جوهريًا**: 47 كانت مجموعة فرعية من 58 (11 اختبارًا جديدًا: DUP-A..K، ATOM-01..06، RESP-01..05). العدّ الفعلي اليوم: 58 (فُحص آليًا). |
| C-2 | «0005 فقط» مقابل «0005–0007» | التقريران | التقرير الثاني هو الأحدث؛ الترحيلات الفعلية على القرص سبعة. |
| C-3 | «أُغلقت جميع الثغرات الأمنية» مقابل «مخاطر إبطال مفاتيح الـIdempotency عند إعادة الإسناد غير منفَّذة» | `docs/SYSTEM_AUDIT_2026-10-20.md` (قسم 10، R-09) | تقرير النظام نفسه يذكر R-09؛ **العيب قائم** ومؤكَّد هنا (انظر 08). |
| C-4 | «إثبات الترحيلات من الصفر» يُقدَّم كدليل ترقية قائمة | `docs/SYSTEM_AUDIT_2026-10-20.md` (3.8) | **الادعاء غير كافٍ**: هذا التدقيق نفّذ الذراعين C وU منفصلَين (انظر 04). |
| C-5 | الاستيراد «مرتبط بهوية الملف» | تقرير النظام (3.2) | **غير صحيح**: الربط برقم السطر فقط؛ الاختبار IMP-B/B أعد التمييز (انظر 10). |
