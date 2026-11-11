# M01-B RESUME — 01: مصفوفة G0 النسخية للمسارات/البيئة/العمليات (لا تشغيل)

> **القرار: `G0_SOURCE_PREFLIGHT: PASS_SOURCE_SAFE_FOR_BOUNDED_RUNTIME`** — على المصدر النهائي بعد M01-B.1. أدلة `OBSERVED_SOURCE` إلا حيث يُذكر غير ذلك. الحزم: plugin 1.63.1، wrangler 4.149.0، vite 7.3.7، playwright 1.64.0، Node v24.22.1 (مُتحقَّق اليوم بقراءة package.json).

## 01.0 سلامة الأساس (لا انحدار صامت)

- بصمات الملفين المعدلين **مطابقة تمامًا** لما سجلته M01-B.1 بعد التعديل: `scripts/e2e-server.mjs` = `6b4e08a3…` (9403 بايت)، `vite.config.ts` = `151a4913…` (10162 بايت) → لا انحدار.
- الإصدارات المثبتة كما كانت → أدلة M01-B.1 الساكنة تبقى صالحة لهذا الثنائي بالضبط (شرط التفويض 01: «مismatch يبطل الإثبات» — لا mismatch).
- إعادة تأكيد سريعة (exit 0) لسلاسل dist الحرجة: configPath مُقدَّم على متغير البيئة؛ remoteBindings افتراضي true وبوابة الجلسة البعيدة `!remoteBindings ? null : …`؛ `userConfigPath: config2`؛ `getVarsForDev(configParam.userConfigPath,…)`؛ `.dev.vars.<env>` أولًا ثم العام؛ `CLOUDFLARE_INCLUDE_PROCESS_ENV` افتراضي false.
- المستندات: AGANTS/AGANT/HANDOFF + تقارير M01-A/A.2/A.3/M01-B/M01-B.1 مقروءة. `docs/project-planning/ExportFlow_Master_Roadmap_To_Operational_GoLive_2026-10-23.md` وملف أمر التشغيل على القرص: **لم يُعثر على الملف في المسار** (`MISSING_ON_DISK`) — النص الكامل للتفويض وصل في رسالة المالك فاعتُمد مرجعًا؛ الفجوة موثقة في `evidence/blockers-and-unverified.json`.

## 01.1 مصفوفة سلسلة الإقلاع (entry → teardown)

```
node scripts/e2e-server.mjs            [cwd=جذر المشروع، env من الـharness]
 ├─ حراسة: EXPORTFLOW_E2E_ROOT إلزامي (e2e-server.mjs:11-15) → assertIsolatedPersist({root:cwd})
 │         بعلامة `.wrangler-safety-20261021-` (isolation-guard.mjs:16,115-119) → رفض غير الفارغ (:18-21)
 ├─ persist = assertIsolatedPersist(<runRoot>/state) → mkdir (:22-23) ثم <runRoot>/tmp
 ├─ بناء + تدقيق الضبط المولّد <runRoot>/wrangler.e2e.generated.jsonc (ذهاب-إياب) (:190-206 تقريبًا)
 ├─ كتابة <runRoot>/.dev.vars.e2e + validateSyntheticDevVars قبل أول spawn
 ├─ spawn wrangler d1 migrations apply exportflow-local --local --persist-to <runRoot>/state
 │    --config <runRoot>/wrangler.e2e.generated.jsonc   [SYNTHETIC_SCHEMA_BOOTSTRAP، env معقم، CI=1]
 └─ spawn node vite --host 127.0.0.1 --port P         [env معقم + CLOUDFLARE_ENV=e2e]
      ├─ vite.config.ts: testMode → EXPORTFLOW_PERSIST إلزامي + رفض المحمي/التاريخي (128-142)
      ├─ e2eWranglerConfigPath: 7 فحوص فشل-مغلق قبل بناء plugin (146-186)
      ├─ cloudflare({persistState:{path:<runRoot>/state}, inspectorPort:false(CI), configPath, remoteBindings:false})
      ├─ plugin: loadEnv(CLOUDFLARE_*, root) → Object.assign(process.env, …) [انظر 01.4]
      ├─ wrangler: userConfigPath=الضبط المولّد → getVarsForDev → try(<runRoot>/.dev.vars.e2e) ✓
      ├─ remoteBindings:false → لا جلسة بعيدة إطلاقًا (بوابة مُثبتة نصيًا في المثبت)
      └─ أبناء: workerd (dispatch محلي) + esbuild — الشبكة loopback 127.0.0.1 فقط
 الإغلاق: SIGTERM/SIGINT إلى e2e-server → vite.kill (e2e-server.mjs الأخير)؛ wrangler ينتهي ذاتيًا قبل الإقلاع
```

## 01.2 الفحوص الإلزامية الثلاثة عشر

| # | الفحص | النتيجة والدليل |
|---|---|---|
| 1 | ترقيع M01-B.1 حاضر بلا انحدار؛ إصدارات مطابقة | **PASS** — 01.0 |
| 2 | الجذر/العلامة/persist/configPath إلزامية ومتفقة عبر config/setup/helpers/server/plugin | **PASS** — playwright.config.ts:10-26,59-71؛ e2e/helpers.ts:17-26؛ e2e/setup.spec.ts:1-3,42-43؛ vite.config.ts:128-186؛ e2e-server.mjs:11-23 (كلها تُفشل قبل spawn) |
| 3 | الضبط المولّد قائمة سماح بلا حساب/مسارات/remote؛ main/assets/D1/migrations_dir صحيحة مع تغيّر مجلد الضبط | **PASS** — مطلقان يُحسمان بمعجمية المطلق في normalizeAndValidateMainField وgetMigrationsPath (تقرير M01-B.1 01.1/01.4، مُعاد تأكيده اليوم)؛ المدقق يرمي على أي حقل محظور (اختبار T07 حي في 84/84) |
| 4 | سلسلة plugin→normalize→userConfigPath→getMiniflareWorkerOptions→getVarsForDev→loadDotDevDotVars آمنة لـe2e؛ حتى fallback العام داخل runRoot | **PASS** — dirname(userConfigPath)=runRoot يقيّد **كلا** المرشحين؛ لا مسار إلى جذر المشروع مهما كانت قيمة env |
| 5 | remoteBindings:false؛ لا remote لكل رابط؛ لا عمال مساعدون تلقائيون؛ لا deploy writes؛ لا قياسات/طلبات خارجية | **PASS** — البوابة `!remoteBindings ? null : maybeStart…` في الموضعين؛ serve يكتشف `pluginConfig.auxiliaryWorkers` فقط (لا شيء)؛ writeDeployConfig في build فقط؛ `WRANGLER_SEND_METRICS=false` + CI=1 في بيئة الابن |
| 6 | Vite dotenv + تعقيم بيئة الابن: لا Worker/Wrangler يقرأ dotenv حقيقي، لا وراثة tokens، لا تسريب أسرار للسجلات | **PASSWorker/Wrangler + residual موثق لـVite** — انظر 01.4: سلسلة أسرار العامل مغلقة بنيويًا داخل runRoot؛ بيئة الابن قائمة سماح (T12)؛ **Vite نفسه يقرأ ملفات `.env*` من جذر المشروع لبيئة العميل (VITE_*) بشكل قياسي غير قابل للتعطيل بدون تعديل مصدر (envDir)** — وجودها لا يمكن فحصه (محظور)، وأثرها محصور بالعميل ولا يمس سلسلة أسرار العامل ولا يكتب شيئًا؛ سُجل كنقطة عمى + مقترح M01-B.2 اختياري (envDir في testMode) دون تنفيذ |
| 7 | تدقيق ملف الأسرار قبل spawn: وجود/غير فارغ/مفاتيح/مجلد الضبط؛ لا symlink غير آمن | **PASS** — validateSyntheticDevVars قبل أول spawn (ترتيب مُثبت T04)؛ الكتابة داخل runRoot المار بالحارس القوي؛ الـjunction مرفوض (T09) |
| 8 | كل مسارات persist للابن وteardown مرتبطة بالجذر المملوك؛ لا سقوط حتى عند shutdown/WAL | **PASS** — `--persist-to <runRoot>/state` صريح للأمرين؛ plugin persistState.path نفسه؛ WAL/SHM يُنشأان داخل `<runRoot>/state` حصرًا (miniflare)؛ لا مرجع `.wrangler/state` في الملفين (T13) |
| 9 | خطافات fixtures/setup وملكية admin.json/admin-state.json/stamp | **PASS** — setup.spec.ts يستورد helpers فقط (نقي عند الاستيراد — M01-A.3)؛ كلها `<runRoot>/*` من نفس الجذر؛ لا globalSetup |
| 10 | كل مسارات الكتابة/الكاش/مؤقت/مخرجات محسوبة؛ لا تثبيت/تنزيل/قياسات | **PASS + محسوبة** — TMP/TEMP→`<runRoot>/tmp`؛ node_modules/.vite (كاش vite محلي غير محمي/غير سري) = استثناء موثق يُحسَب قبل/بعد؛ Chrome = قناة النظام (لا تنزيل)؛ Playwright output → `--output <runRoot>/pw-test-results` + `--reporter=line` (تجاوز html في جذر المشروع) |
| 11 | قائمة أوامر ضيقة، شجرة PIDs متوقعة، خطة إشارات/إغلاق، منفذ 127.0.0.1 فقط، لا قتل لعمليات أجنبية | **PASS** — الأوامر الثلاثة (e2e-server مباشرة، بروفة الرفض، playwright setup-only)؛ 43174 حر (مُتحقَّق bind probe) وP لـG2a عشوائي حر؛ SIGTERM للمملوك فقط؛ تحقق اليتامى بـ`kill(pid,0)` + استعلام CIM مقيد بـPIDs المملوكة |
| 12 | مراجعة ساكنة للـbootstrap الأولي: سلسلة الاعتماد، الضبط، هدف D1 المطلق، العمليات والمخطط المتوقع | **PASS (SYNTHETIC_SCHEMA_BOOTSTRAP فقط)** — 0001→0008 على D1 جديدة فارغة كليًا داخل `<runRoot>/state` عبر الضبط المولّد؛ **لا** يثبت 0007→0008 مأهولة |
| 13 | لا مقارنات metadata لجذور محمية كدليل | **PASS** — لن يُنفذ أي فحص قبل/بعد على المحميات؛ الفحوص كلها داخل الجذور المملوكة |

## 01.3 قيود تسمية الجذر (اكتشاف G0 مهم)

مثال التفويض `.wrangler-safety-m01b-20261025-<id>` **سيُرفض بالحارس** (`AUDIT_ROOT_REQUIRED`) لأن العلامة الفعلية هي `.wrangler-safety-20261021-` (isolation-guard.mjs:16). الصيغة المطابقة للاتفاقية والفريدة لهذه الجولة: **`.wrangler-safety-20261021-m01b-resume-<id>`**. وشرط الطزاجة: الـharness **لا يُنشئ الجذر مسبقًا** — يمرر مسارًا غير موجود وe2e-server ينشئه بنفسه (يرفض غير الفارغ).

## 01.4 النقطة العالقة الوحيدة (check 6 — Vite dotenv) — تحليل القرار

- **Worker/Wrangler: مُثبت مغلقًا.** كلا مرشحي أسرار العامل داخل `<runRoot>` بنيويًا؛ فرعا `.env`/process.env معطلان أو غير مرتبطين؛ بيئة الابن قائمة سماح.
- **Vite العميل:** يقرأ Vite 7 قياسيًا `.env/.env.local/.env.<mode>/.env.<mode>.local` من envDir=الجذر لمفاتيح `VITE_*` (وplugin يقرأ بادئة `CLOUDFLARE_*`) — **لا آلية تعطيل بلا تعديل مصدر** (envDir خيار config فقط؛ التعديل غير مصرّح هنا). وجود الملفات لا يمكن فحصه (محظور). الأثر المقيَّد: مفاتيح VITE_* تبقى في حزمة العميل عبر loopback (سلوك `pnpm dev` اليومي نفسه)، ولا يكتب Vite شيئًا خارج الجذور المملوكة/الكاش المحسوب، ولا يمس سلسلة أسرار العامل (مثبتة في #4)، والـCLOUDFLARE_ENV الصريح في بيئة الابن هو المعتمد عند الخلاف (وإلا فالفشل مغلقًا عند 7 فحوص vite.config).
- **التصنيف:** ليس OB-01 (فئة fallback أسرار العامل — مغلقة)، بل نقطة عمى رصدية موثقة (`guard-and-safety-observation-limits.json`) مع مقترح M01-B.2 اختياري (سطر واحد envDir في testMode) **لا يُنفذ في هذه الجولة**.

## 01.5 خطة التنفيذ المعتمدة بعد G0

- **G2a:** جذر `​.wrangler-safety-20261021-m01b-resume-12d9ecd5e8a2` (غير موجود مسبقًا)، منفذ حر عشوائي (probe)، e2e-server عبر harness مملوك جديد؛ SYNTHETIC_SCHEMA_BOOTSTRAP ثم vite؛ poll `/api/v1/health/live` ثم `/api/v1/health` (503 المخطط ليس فشل دورة حياة)؛ SIGTERM مملوك؛ جرد `<runRoot>` + فحص يتامى مقيد.
- **G2b:** جذر ثانٍ جديد مملوك **يُنشأ مسبقًا بملف dummy** → يجب `EXPORTFLOW_E2E_ROOT_NOT_FRESH` exit 2 قبل أي spawn (لا أبناء إطلاقًا).
- **G2c (اختياري، بعد إثبات ساكن):** `node node_modules/@playwright/test/cli.js test --project=setup --grep "E2E-01 bootstrap" --reporter=line --output <runRoot>/pw-test-results` بـ`EXPORTFLOW_E2E_ROOT` جذر ثالث مملوك + TMP موجه + منفذ 43174 (حر)؛ التحقق: عدم إطلاق مشاريع أخرى، ووجود admin-state.json في نفس الجذر (حجم/وجود فقط — لا محتوى).
