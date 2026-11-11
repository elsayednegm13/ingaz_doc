# 03 — أدلة الحزمة المعزولة (Isolated Harness Evidence)

**التدقيق:** ET-2026-10-20 · **التاريخ:** 2026-10-20/21

## 3.1 مكوّنات الحزمة (OBSERVED_TEST)

| المكوّن | القيمة | ملاحظة |
|---|---|---|
| قاعدة D1 | `.wrangler-transition-audit-20261020-h` | هاش الملف `5bcd8b73…sqlite` (مختلف عن المطوّر) |
| منفذ الاستماع | `http://127.0.0.1:43199` | منفذ مخصّص للتدقيق؛ لم يُستخدم 43173 (خادم المطوّر) ولا 43174 (خادم E2E) |
| وقت التشغيل | wrangler dev --local (4.149.0) + workerd | بديل عن خادم Vite تفاديًا للأثر الجانبي على مسار التخزين (2.6) |
| إعداد Wrangler | `fixtures/wrangler.audit.dev.jsonc` | `main=../../../worker/index.ts`، D1 وR2 اصطناعيان |
| الأسرار | `--var` على سطر الأوامر | `BETTER_AUTH_SECRET`، `BETTER_AUTH_URL`، `BOOTSTRAP_SECRET`، `EXPORTFLOW_TEST_FAULTS=1` — قيم اصطناعية، ولم تُقرأ `.dev.vars` |
| سجل الخادم | `evidence/harness-dev-server.log` | يعرض `Environment Variable (hidden)` لكل سرّ |
| إعادة التهيئة | `probes/harness-reset.ps1` | يوقف **منفذ التدقيق فقط**، يحذف **متجر التدقيق فقط**، يطبّق الترحيلات، ثم يبدأ |

## 3.2 بوّابة العزل قبل أي كتابة (Hard-stop gate)

| البوابة | كيف تم التحقق | النتيجة |
|---|---|---|
| المسار الهدف مملوك للتدقيق | كل استدعاء لـ `wrangler` يحمل `--persist-to` و`--cwd` و`--config` صريحة | **PASS** |
| المعرّف لا يشير إلى مورد بعيد | `database_id = audit-only-not-a-remote-id` | **PASS** |
| `.dev.vars` غير مقروء | الأسرار عبر `--var` فقط؛ سجل الخادم يعرض `(hidden)` | **PASS** |
| قاعدة المطوّر لم تُفتح | جرد قبل/بعد: الحجم والطوابع مطابقة | **PASS** |
| لا استدعاء سحابي | لا `--remote` ولا SDK سحابي في أي أمر | **PASS** |

## 3.3 جرد المسارات المحمية (بيانات وصفية فقط)

| الملف | القياس |
|---|---|
| `evidence/protected-paths/before-audit.json` | قبل أي أمر تدقيق |
| `evidence/protected-paths/after-mig-U1.json` | بعد أول ترحيل تدقيق |
| `evidence/protected-paths/after-harness-start.json` | بعد تشغيل حزمة التشغيل |
| `evidence/protected-paths/after-all-audit-runs.json` | بعد كل المقاييس |
| `evidence/protected-paths/final.json` | بعد إيقاف الحزمة نهائيًا |
| `evidence/developer-db-access-note.md` | **قيد صريح**: انحراف طفيف في بيانات المطوّر الوصفية (تفصيله أدناه) |

**الفرق النهائي (before ↔ final):**

| المسار | البايت | أحدث ملف ابن | النتيجة |
|---|---|---|---|
| `.wrangler/state` | 70,286,836 → 70,089,236 | 2026-10-20T21:02:51Z → 2026-10-20T22:28:32Z | **‎-197,600 بايت / ‎-2 ملف** ⚠️ |
| `.dev.vars` | 152 → 152 | 2026-10-12T19:31:51Z → 2026-10-12T19:31:51Z | بلا تغيير |
| `.dev.vars.e2e` | 177 → 177 | 2026-10-20T21:02:38Z → 2026-10-20T21:02:38Z | بلا تغيير |
| `.wrangler-e2e` | 27,186,522 → 27,186,522 | 2026-10-20T21:18:28Z → 2026-10-20T21:18:28Z | بلا تغيير |
| `.wrangler-perf` | 128,845,960 → 128,845,960 | 2026-10-16T21:50:04Z → 2026-10-16T21:50:04Z | بلا تغيير |

### 3.3.1 القيد الصريح: انحراف في بيانات المطوّر الوصفية (G01 ⇒ FAIL)

عند **إيقاف** حزمة التشغيل (22:27:48Z – 22:28:32Z) أغلقت SQLite اتصالاتها في المسار الافتراضي، فأسفرت عن:

| الملف | الأثر |
|---|---|
| `e086a16c….sqlite-wal` (164,832 بايت) | **حُذف** بعد checkpoint |
| `e086a16c….sqlite-shm` (32,768 بايت) | **حُذف** |
| `metadata.sqlite-shm` و`observability/…-shm` | لمسة طابع فقط |
| **الملف الرئيسي `e086a16c….sqlite`** | **864,256 بايت — بلا تغيير** (لا صفوف مكتوبة ولا مقروءة) |

- **السبب المرجَّح (`INFERENCE`):** نسخة Miniflare فرعية داخل `wrangler dev` فتحت قاعدة D1 في المسار الافتراضي؛ إغلاقها نفّذ checkpoint طبيعيًا في SQLite.
- **لم يحدث:** أي قراءة محتوى أو كتابة صفوف أو ترحيل أو نسخ أو بذر على قاعدة المطوّر.
- **الأثر:** منخفض (لا فقدان بيانات: تم الدمج قبل الحذف)، لكنه **انحراف صريح** عن قاعدة S00.8 ⇒ `DEVELOPER_DB_ACCESS: VIOLATION` (بيانات وصفية فقط، بلا محتوى).
- **التوصية:** عدم استخدام `wrangler dev` لحزم التدقيق على هذا المضيف؛ التفاصيل في `evidence/developer-db-access-note.md`.

> كل أوامر `wrangler d1 … --persist-to … --cwd … --config …` (سجل 19) **لم تغيّر** أي بايت في `.wrangler/state` (لقطتا `after-mig-U1` و`after-all-audit-runs` متطابقتان).

## 3.4 المتاجر المملوكة للتدقيق (Usage ledger)

| المتجر | الغرض | الحجم النهائي | مصيره |
|---|---|---|---|
| `.wrangler-transition-audit-20261020-c` | الذراع C (0001→0007 نظيف) | قاعدة 0007 كاملة | باقٍ كدليل |
| `.wrangler-transition-audit-20261020-u` | الذراع U (0004→0007 مموّه) | 57 جدولًا / 283 صفًا | باقٍ كدليل |
| `.wrangler-transition-audit-20261020-p` | نسخة Bulk لقياس خطط الاستعلام | 5004 طلبًا | باقٍ كدليل |
| `.wrangler-transition-audit-20261020-f` | ذراع الفشل (ترحيل مكسور) | 52 جدولًا | باقٍ كدليل |
| `.wrangler-transition-audit-20261020-h` | حزمة التشغيل والمقاييس الحية | بيانات اصطناعية | باقٍ كدليل |
| `.wrangler-transition-audit-20261020-cwd` | مرساة `--cwd` | `cache/cf.json` فقط | باقٍ كدليل |

## 3.5 سجل الأوامر (مختصر) — التفصيل في 19

| # | الأمر | الغرض | النتيجة |
|---|---|---|---|
| H-01 | `wrangler d1 migrations apply exportflow-audit-local --local --persist-to <U> --cwd <cwd> --config <0004>` | بناء قاعدة 0004 | exit 0 |
| H-02 | `wrangler d1 execute … --file fixtures/seed/legacy-0004.sql` | بذر بيانات اصطناعية | exit 0 |
| H-03 | `node probes/snapshot-db.mjs --persist <U>` | لقطة محتوى + بصمات | 54 جدولًا / 280 صفًا |
| H-04 | `wrangler d1 migrations apply … --config <all>` | الترقية 0004→0007 | exit 0 (3 ترحيلات فقط) |
| H-05 | `node probes/snapshot-db.mjs --persist <U>` | لقطة بعد الترقية | 57 جدولًا / 283 صفًا |
| H-06 | `wrangler d1 migrations apply … --persist-to <C> --config <all>` | الذراع C | exit 0 |
| H-07 | `wrangler d1 migrations apply … --persist-to <C>` (إعادة) | اختبار السجل | «No migrations to apply!» |
| H-08 | `node probes/break-fixture.mjs --persist <F> --drop roles` | كسر متعمّد | table dropped |
| H-09 | `wrangler d1 migrations apply … --persist-to <F> --config <all>` | اختبار الفشل | **exit 1** + `no such table: main.roles` |
| H-10 | `node probes/bulk-fill.mjs --persist <P>` | بيانات ضخمة لقياس الخطة | 5004 طلبًا |
| H-11 | `powershell -File probes/harness-reset.ps1` | تهيئة حزمة التشغيل | جاهز |
| H-12 | `node probes/runtime-probes.mjs` | 26_probe | 26 PASS / 2 FAIL / 1 PARTIAL / 1 LATENT / 2 OBSERVED |
| H-13 | `node probes/probes-2.mjs` | مقاييس تغيير الصلاحيات | 5 PASS / 2 FAIL |

## 3.6 حدود الحزمة

| الحد | التفصيل |
|---|---|
| عزل حقيقي للـ Worker | غير متاح محليًا ⇒ لا ادعاء عن سباق عبر Multiple isolates (S05/IDEM-P). |
| خادم Vite | لم يُستخدم عمدًا (سبب في 2.6). |
| Sporadic crash | سُجّل في `evidence/harness-dev-server.log`: «The Workers runtime crashed unexpectedly and is being restarted (crash #1)» ثم استُؤنف. أُعيدت تهيئة الحزمة قبل كل دفعة مقاييس. |
| تسلسل الطلبات | أُضيف تبريد 350ms بين الطلبات ذات الجسم (نفس علة workerd الموصوفة في `vite.config.ts`) ⇒ **مقاييس التزامن في الدفعة الأولى مُسلسلة زمنيًا لا truly concurrent** (مُصرَّح في 08). |
