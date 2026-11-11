# M01-A.2 — نطاق التفويض وخط الأساس

**نقطة التفتيش:** `ExportFlow-M01-A.2-2026-10-23`  
**التاريخ:** 2026-10-23  
**الجذر:** `I:\WORK\InjazDocs` — تم التحقق منه بقراءة `AGENTS.md` و`AGANT.MD` و`HANDOFF.MD`، دون أي أمر Git.  
**لغة التقرير:** العربية. أسماء الملفات ورموز المصدر والأخطاء بالإنجليزية كما هي.

---

## 00.1 التفويض وقاعدة العمل

| البند | القيمة |
|---|---|
| أمر المالك | «ابدأ تنفيذ **ExportFlow M01-A.2 فقط**» |
| التكليف الحاكم | `docs/execution-orders/ExportFlow_M01_A2_Static_E2E_Consumer_Closure_Agent_Order_2026-10-23.md` |
| النطاق | إغلاق المسارات التاريخية في سبعة ملفات E2E + تصحيح اختبار العزل القديم + اختبارات اصطناعية + تقرير عربي |
| خارج النطاق | M01-B، M02، Playwright، Wrangler، Vite، Miniflare، D1/الترحيلات، Git، الشبكة/السحابة، تطوير الأعمال |
| التوقف | بعد M01-A.2 مباشرةً؛ لا انتقال تلقائي إلى M01-B/M02 |

**تمت قراءة ما يلي بالترتيب المطلوب، كنص عادي فقط:**

1. `AGENTS.md`، `AGANT.MD`، `HANDOFF.MD`.
2. وثائق التخطيط الثلاث:
   - `docs/project-planning/ExportFlow_Master_Roadmap_To_Operational_GoLive_2026-10-23.md`
   - `docs/project-planning/ExportFlow_Business_Requirements_V0_3_OWNER_REVIEW_2026-10-23.md`
   - `docs/project-planning/ExportFlow_Open_Decisions_V0_3_2026-10-23.md`
3. تقرير M01-A السابق وأدلته:
   - `docs/transition-2026-10-23-m01a-20261023-01/00_SCOPE_AND_AUTHORIZATION_AR.md`
   - `01_SOURCE_PATH_AND_SPAWN_MATRIX_AR.md`
   - `02_STATIC_FIX_REGISTER_AR.md`
   - `03_SYNTHETIC_GUARD_TESTS_AR.md`
   - `04_M01_A_DECISION_AND_M01_B_BOUNDARY_AR.md`
   - `evidence/guard-synthetic-tests.json`
   - `evidence/edited-file-sha256.json`
   - `evidence/executed-commands.txt`
4. الملفات الثمانية القابلة للتعديل، ثم المراجع للقراءة فقط:
   `shared/isolation.ts`, `scripts/isolation-guard.mjs`, `scripts/e2e-server.mjs`, `playwright.config.ts`, `vite.config.ts`, `e2e/helpers.ts`, `e2e/setup.spec.ts`.
5. اختبارا الحارس السابقان في `tests/isolation-safety/` لفحص الاستيرادات والآثار قبل إعادة تشغيلهما.

**لم يُستخدم Git ولا أي أداة استنتجت حالة الفرع.** التحقق من الجذر تم عبر وجود `AGENTS.md` ومحتواه المعروف، لا عبر `.git`.

---

## 00.2 قائمة السماح الفعلية

### 00.2.1 الملفات الثمانية الموجودة — عُدّلت

| الملف | العيب المبلّغ | الحالة |
|---|---|---|
| `e2e/atomicity.spec.ts` | B-01a: `const persist = ".wrangler-e2e/state"` | **معدّل** |
| `e2e/duplicates.spec.ts` | B-01b: `storageState` و`persist` تاريخيان | **معدّل** |
| `e2e/dossier-grid.spec.ts` | B-01c: ثلاثة `wranglerSql(".wrangler-e2e/state", …)` | **معدّل** |
| `e2e/invoice-lock.spec.ts` | B-01d: `persist` و`storageState` تاريخيان | **معدّل** |
| `e2e/security.spec.ts` | B-01e: `wranglerSql(".wrangler-e2e/state", …)` | **معدّل** |
| `e2e/shell-grid.spec.ts` | B-01f: `wranglerSql(".wrangler-e2e/state", …)` مرتين | **معدّل** |
| `e2e/operations.spec.ts` | B-01g: رمز خطأ قديم + مصدر حالة تاريخي | **معدّل** |
| `tests/isolation-guard.test.ts` | B-02/B-03: توقعات قديمة | **معدّل** |

### 00.2.2 الملف الجديد المسموح

| الملف | الغرض |
|---|---|
| `tests/isolation-safety/m01a2-consumer-paths.test.mjs` | اختبارات Node مستقلة: نص ساكن للمستهلكين + حارسان + حالات Windows + عقد تمرير الجذر |

### 00.2.3 دليل الأدلة الجديد

`docs/transition-2026-10-23-m01a2-20261023-01/` — كان **غير موجود** قبل الإنشاء (`EVIDENCE_DIR_EXISTS=False`)، ولم يُستبدل أو يُعاد تسمية أي دليل تاريخي.

---

## 00.3 الممنوعات — ما لم يُنفَّذ

| العملية | الحالة | ملاحظة |
|---|---|---|
| Git بأي شكل | **لم يُنفَّذ** | لا `status/diff/log/add/commit/push/reset/clean/checkout/stash`، ولا قراءة `.git` |
| Wrangler / Vite / Playwright / Miniflare / Worker / dev server | **لم يُشغَّل** | لا `playwright test`، لا `vite`، لا `wrangler`، لا بناء |
| قاعدة بيانات أو ترحيل D1 | **لم يُنفَّذ** | لا `0007→0008`، ولا SQLite اصطناعي |
| قراءة/stat/realpath/enumerate لأي جذر محمي | **لم يحدث** | لا `.wrangler/state`، ولا `.wrangler-e2e` أو أي جذر تاريخي، ولا metadata قبل/بعد |
| `.dev.vars*` أو أسرار أو جلسات محفوظة | **لم تُقرأ** | لم يُستدعَ dotenv ولم تُطبع أي قيمة سرية |
| الشبكة / السحابة / النشر / التثبيت | **لم يحدث** | لا remote ولا dependency changes |
| `tsc -b` / `vitest run` / `npm test` / build / lint شامل | **لم يُشغَّل** | ممنوع في M01-A.2 |
| حذف أو تنظيف موارد موجودة مسبقًا | **لم يحدث** | الحارس القوي استخدم مجلد OS temp جديدًا مملوكًا للاختبار وحده، وأزاله بعد إثبات البادئة |
| تعديل ملف خارج الثمانية | **لم يحدث** | المرجعيات بقيت ببصماتها نفسها |

**ملاحظة أدلة:** لا توجد أي مقارنة metadata لجذور محمية، لأن التكليف يمنع ذلك صراحةً. أي ادعاء بخلاف ذلك غير صحيح.

---

## 00.4 خط الأساس المرصود قبل التعديل

### 00.4.1 الاختبارات السابقة

| البند | القيمة |
|---|---|
| العدد المبلّغ سابقًا | **45/45** (M01-A) — سُجّل كـ`PREVIOUSLY_REPORTED` حتى إعادة التشغيل |
| بصمة `guard-path.test.mjs` قبل M01-A.2 | `9204d3a1…de8b76f` — مطابقة لدليل M01-A |
| بصمة `strong-guard-path.test.mjs` قبل M01-A.2 | `4ab0c18c…3d99cf` — مطابقة لدليل M01-A |
| إعادة التشغيل على المصدر النهائي | **45/45 PASS، 0 فشل، 0 تخطي** |

### 00.4.2 العيوب المرصودة في المصدر الحالي

| المعرّف | الموقع الفعلي قبل التعديل | التصنيف |
|---|---|---|
| B-01a | `e2e/atomicity.spec.ts:6` | مؤكد من النص |
| B-01b | `e2e/duplicates.spec.ts:7-8` | مؤكد من النص |
| B-01c | `e2e/dossier-grid.spec.ts:57,82,83` | مؤكد من النص |
| B-01d | `e2e/invoice-lock.spec.ts:58,110` | مؤكد من النص |
| B-01e | `e2e/security.spec.ts:9` | مؤكد من النص |
| B-01f | `e2e/shell-grid.spec.ts:56-57` | مؤكد من النص |
| B-01g | `e2e/operations.spec.ts:495-496` | مؤكد من النص + رمز خطأ قديم |
| B-02 | `tests/isolation-guard.test.ts:10` | مؤكد من النص |
| B-03 | `tests/isolation-guard.test.ts:16` | مؤكد من النص |
| **OA-01** | `e2e/setup.spec.ts:1-2,41-42` | **عائق جديد خارج قائمة السماح** |

**OA-01 بالتفصيل:** الملف يستخدم `e2eRunRoot()` في السطر 41 و`path.join()` في السطر 42، لكن الاستيرادات الموجودة هي فقط:

- السطر 1: `import { expect, test } from "@playwright/test";`
- السطر 2: `import { adminCreds, clearViteOverlay, login } from "./helpers";`

لا يوجد استيراد لـ`e2eRunRoot` ولا لـ`node:path`. لم يُعثر على تعريف عالمي أو `globalSetup`/preload يوفّرهما. لذلك هذا **عيب ثابت في حل المعرّفات** يمنع setup project من العمل، لكنه **خارج الملفات الثمانية** ولم يُعدَّل. لم يُثبت بالفشل وقت التشغيل لأن Playwright ممنوع في هذه المرحلة.

### 00.4.3 ما تغيّر خارج الملفات الثمانية

لا شيء. بصمات `e2e/setup.spec.ts`, `e2e/helpers.ts`, `shared/isolation.ts`, `scripts/isolation-guard.mjs`, `scripts/e2e-server.mjs`, `playwright.config.ts` بقيت مطابقة لما قبل M01-A.2، وهي مسجلة في `evidence/edited-source-hashes.json`.

---

## 00.5 الأوامر المنفذة فعليًا (ملخص)

| الأمر | الغرض | النتيجة |
|---|---|---|
| `node --test tests/isolation-safety/m01a2-consumer-paths.test.mjs` | الاختبار الجديد | **12/12 PASS**، exit 0 |
| `node --test tests/isolation-safety/guard-path.test.mjs tests/isolation-safety/strong-guard-path.test.mjs` | إعادة تشغيل 45 على المصدر النهائي | **45/45 PASS**، exit 0 |
| `node --test --test-reporter=tap --test-reporter-destination=… tests/…` | دليل TAP موحّد | **57/57 PASS**، exit 0 |
| `node --check` على الملفات الثمانية + الاختبار الجديد | فحص نحوي فقط بلا تنفيذ | exit 0 للجميع |
| `Get-FileHash -Algorithm SHA256` | قبل/بعد لملفات المصدر | مسجل في `edited-source-hashes.json` |
| `node --version` | تثبيت بيئة التشغيل | `v24.19.0` |

**لم يُشغَّل:** `playwright test`, `vite`, `wrangler`, `vitest run`, `npm test`, `tsc -b`, أي build، أي migration، أي اتصال شبكة/سحابة.

---

## 00.6 تفرد دليل الأدلة

| البند | القيمة |
|---|---|
| المسار | `docs/transition-2026-10-23-m01a2-20261023-01/` |
| قبل الإنشاء | **غير موجود** |
| أدلة تاريخية استُبدلت | **لا** |
| ملفات M01-A السابقة | بقيت كما هي، ولم تُعدّل |

## 00.7 الحكم الأولي على النطاق

`A2.0 — AUTHORIZATION / BASELINE: PASS`

- الجذر مؤكد نصيًا.
- الثمانية وعيوبها محددة بـ`file:line`.
- OA-01 مكتشف وموثق خارج السماح.
- لا وصول لجذور محمية أو أسرار.
- دليل M01-A.2 جديد وفريد.
