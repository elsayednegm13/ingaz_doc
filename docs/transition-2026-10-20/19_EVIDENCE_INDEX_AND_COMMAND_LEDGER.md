# 19 — فهرس الأدلة وسجل الأوامر (Evidence Index & Command Ledger)

**التدقيق:** ET-2026-10-20 · **الجذر:** `I:\WORK\InjazDocs` (كل الأوامر من الجذر ما لم يُذكر خلاف ذلك)

## 19.1 سجل الأوامر (Command ledger)

| # | الأمر (مختصر) | CWD | الهدف المحلول | الغرض | كتابات متوقَّعة | Exit | السجل |
|---|---|---|---|---|---|---|---|
| CL-01 | `git status --short` / `git log -3` | الجذر | — | خط الأساس | لا شيء | 0 | `01_…md` §1.1 |
| CL-02 | `Get-ChildItem .wrangler/state -Recurse` (بيانات وصفية) | الجذر | `.wrangler/state` | جرد المسارات المحمية | **لا شيء** (قراءة بيانات وصفية فقط) | 0 | `evidence/protected-paths/before-audit.json` |
| CL-03 | `wrangler d1 migrations apply exportflow-audit-local --local --persist-to <U> --cwd <cwd> --config fixtures/wrangler.audit.0004.jsonc` | الجذر | `<U>` فقط | بناء قاعدة 0004 | ملف D1 داخل `<U>` | 0 | `evidence/mig-U1-apply-0001-0004.log` |
| CL-04 | `wrangler d1 execute … --file fixtures/seed/legacy-0004.sql` | الجذر | `<U>` | بذر بيانات اصطناعية | صفوف داخل `<U>` | 0 | `evidence/mig-U2-seed.log` |
| CL-05 | `node probes/snapshot-db.mjs --persist <U> --out …` | الجذر | `<U>` (قراءة فقط) | خط أساس الترقية | **لا شيء** (قراءة) | 0 | `evidence/armU-before-0004.json` |
| CL-06 | `wrangler d1 migrations apply … --config fixtures/wrangler.audit.all.jsonc` | الجذر | `<U>` | **الترقية 0004→0007** | 3 جداول + 6 فهارس داخل `<U>` | 0 | `evidence/mig-U3-upgrade-0005-0007.log` |
| CL-07 | `node probes/snapshot-db.mjs --persist <U>` | الجذر | `<U>` | خط ما بعد الترقية | لا شيء | 0 | `evidence/armU-after-0007.json` |
| CL-08 | `wrangler d1 migrations apply … --persist-to <C> --config <all>` | الجذر | `<C>` | الذراع النظيف | قاعدة 0007 | 0 | `evidence/mig-C1-apply-0001-0007.log` |
| CL-09 | `wrangler d1 migrations apply … --persist-to <C>` (إعادة) | الجذر | `<C>` | اختبار السجل | لا شيء («No migrations to apply!») | 0 | `evidence/mig-C2-rerun.log` |
| CL-10 | `node probes/break-fixture.mjs --persist <F> --drop roles` | الجذر | `<F>` | كسر متعمّد | حذف جدول داخل `<F>` فقط | 0 | مخرجات الطرفية |
| CL-11 | `wrangler d1 migrations apply … --persist-to <F> --config <all>` | الجذر | `<F>` | اختبار فشل الترحيل | لا شيء (فشل مبكّر) | **1** | `evidence/mig-F2-broken-apply.log` |
| CL-12 | `node probes/snapshot-db.mjs --persist <F>` | الجذر | `<F>` | حالة ما بعد الفشل | لا شيء | 0 | `evidence/armF-after-broken-apply.json` |
| CL-13 | `node probes/bulk-fill.mjs --persist <P>` | الجذر | `<P>` | بيانات ضخمة + خطط الاستعلام | صفوف داخل `<P>` | 0 | مخرجات الطرفية (مقتبسة في 05 §5.4) |
| CL-14 | `powershell -File probes/harness-reset.ps1` | الجذر | `<H>` + منفذ 43199 | تهيئة حزمة التشغيل | حذف `<H>` + ترحيلات + تشغيل | 0 | `evidence/harness-dev-server.log` |
| CL-15 | `node probes/runtime-probes.mjs --base http://127.0.0.1:43199 --persist <H>` | الجذر | `<H>` (عبر HTTP) | 31 مقياسًا | بيانات اصطناعية داخل `<H>` | 0 | `evidence/runtime-probes.json` |
| CL-16 | `node probes/probes-2.mjs --base … --persist <H>` | الجذر | `<H>` | 7 مقاييس سياسات | بيانات اصطناعية | 0 | `evidence/runtime-probes-2.json` |
| CL-17 | `node probes/debug-signin.mjs` / `debug-create-user.mjs` | الجذر | `<H>` | تشخيص | لا شيء | 0 | مخرجات الطرفية |
| CL-18 | `Get-FileHash` على 38 ملفًا | الجذر | ملفات المشروع | بصمة SHA-256 | `evidence/source-manifest.json` | 0 | ↑ |
| CL-19 | `git diff d9106ee -- e2e/` | الجذر | — | تدقيق جودة الاختبارات | لا شيء | 0 | مخرجات الطرفية (15.2) |

**الأوامر التي لم تُنفَّذ عمدًا:** أي `--remote`، أي `wrangler deploy`، أي `d1 execute` على `.wrangler/state`، أي `sqlite3`/`node:sqlite` على `.wrangler/state`، أي تشغيل لخادم Vite (المطوّر أو E2E)، أي `git commit/push/reset/clean`.

## 19.2 فهرس الأدلة

| الملف | النوع | المحتوى |
|---|---|---|
| `evidence/runtime-probes.json` | `OBSERVED_TEST` | 31 مقياسًا (IDEM/AUTH/IMP) مع رموز الحالة وأعداد الصفوف |
| `evidence/runtime-probes-2.json` | `OBSERVED_TEST` | 7 مقاييس سياسات + IDs |
| `evidence/armU-before-0004.json` | `OBSERVED_TEST` | بصمات 54 جدولًا + سجل الترحيلات + سلامة |
| `evidence/armU-after-0007.json` | `OBSERVED_TEST` | بصمات 57 جدولًا بعد الترقية |
| `evidence/armC-after-0007.json` | `OBSERVED_TEST` | قاعدة نظيفة 0007 (مقارنة المخطط) |
| `evidence/armF-after-broken-apply.json` | `OBSERVED_TEST` | حالة ما بعد فشل الترحيل |
| `evidence/mig-*.log` | `OBSERVED_TEST` | مخرجات الأداة الرسمية |
| `evidence/protected-paths/*.json` | `OBSERVED_TEST` | جرد المسارات المحمية (قبل/بعد) |
| `evidence/source-manifest.json` | `OBSERVED_TEST` | 38 بصمة SHA-256 + أحجام + طوابع |
| `evidence/harness-dev-server.log` | `OBSERVED_TEST` | سجل حزمة التشغيل (الأسرار مخفية) |
| `evidence/e2e-prior-phase-58.log` | `PRIOR_REPORT` | سجل الجولة السابقة: 58/58 |
| `evidence/matrix-summary.json` | `OBSERVED_TEST` | ملخص عدّاد المصفوفات (آلي) |

## 19.3 إعادة إنتاج النتائج

```powershell
# 1) بناء الذراع النظيف
node node_modules/wrangler/bin/wrangler.js d1 migrations apply exportflow-audit-local --local `
  --persist-to .wrangler-transition-audit-20261020-c --cwd .wrangler-transition-audit-20261020-cwd `
  --config docs/transition-2026-10-20/fixtures/wrangler.audit.all.jsonc

# 2) الذراع المموّه (ترقية قاعدة مأهولة)
#    أ) 0001..0004  ب) البذرة  ج) 0005..0007  د) لقطتان للمقارنة
#    (انظر 04_UPGRADE_MATRIX.md §4.3)

# 3) الحزمة الحية والمقاييس
powershell -ExecutionPolicy Bypass -File docs/transition-2026-10-20/probes/harness-reset.ps1
node docs/transition-2026-10-20/probes/runtime-probes.mjs --base http://127.0.0.1:43199 `
  --secret audit-only-bootstrap-secret --persist .wrangler-transition-audit-20261020-h `
  --out docs/transition-2026-10-20/evidence/runtime-probes.json
```

## 19.4 خصائص الأدلة: ما يمكن استنتاجه وما لا يمكن

| الأداة | قوة الدليل | الحدّ |
|---|---|---|
| `wrangler d1 migrations apply` | أداة المشروع الرسمية ⇒Paths الترحيل والاستبدال | بيئة محلية، D1 واحد |
| `node:sqlite` (قراءة) | بصمة محتوى دقيقة | لا يقرأ WAL غير المدمج إلا بعد checkpoint ⇒ استُخدم بعد توقف الخادم |
| فحوص HTTP | حالة حقيقية من الخادم | عامل واحد محلي، لا Multi-Isolate |
| `git diff` | مقارنة شيفرة دقيقة | لا يثبت نية المطور |
| لقطات الشاشة | ما رُسم | لا يثبت عدم تداخل في بقية الحالات |
