# M01-B.1 — 01: تتبع سلسلة المحمّل والبيئة للإصدارات المثبتة (G0 — ساكن حصريًا)

> كل الأدلة أدناه **OBSERVED_SOURCE** من: (أ) نص المصدر العادي للمشروع، (ب) نص **الحزم المثبتة فعلًا** المطلوب تتبعها في التفويض. لم تُستورد أو تُنفذ أي حزمة/ضبط/أمر؛ ملفات dist المضغوطة سطر واحد فالتوثيق بإزاحات بايت (`@offset`) مع نص الشهادة الحرفي. لا stat/قراءة لأي مسار `.wrangler*` أو `.dev.vars*` أو `.env*` موجود.

**الإصدارات المثبتة (قراءة package.json فقط):** @cloudflare/vite-plugin **1.63.1**، wrangler **4.149.0**، vite **7.3.7**، Node v24.22.1.

---

## 01.1 السلسلة الحاسمة: من خيار `configPath` إلى ملف الأسرار

| # | الحلقة | الدليل |
|---|---|---|
| 1 | الإضافة تحسم الضبط: `configPath = getValidatedWranglerConfigPath(root, pluginConfig.configPath ?? prefixedEnv.CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH)` — **الخيار الصريح مُقدَّم** على متغير البيئة | plugin dist/index.mjs `@2830596` (نص حرفي: `} else configPath = getValidatedWranglerConfigPath(root, pluginConfig.configPath ?? prefixedEnv.CLOUDFLARE_VITE_WRANGLER_CONFIG_PATH);`) |
| 2 | تحقق الامتداد: `jsonc, json or t[oml]` فقط | `@2824445` (`const fileExtension = path.extname(configPath).slice(1)` + رسالة الخطأ الحرفية) |
| 3 | قراءة الضبط ببيئة e2e: `readWorkerConfig(configPath, env) → wrangler.unstable_readConfig({config: configPath, env: env}, {preserveOriginalMain: true})` | `@2817628` |
| 4 | wrangler يجعل المسار الممرَّر هو `userConfigPath` مباشرة | wrangler dist/cli.js `@118145` (`function resolveWranglerConfigPath({config, script})… if (config2 !== void 0) return { userConfigPath: config2, configPath: config2, … }`) |
| 5 | تطبيع الإضافة **لا يحذف** `userConfigPath`: `nullableNonApplicable = ["alias","base_dir","find_additional_modules","minify","no_bundle","preserve_file_names","site","tsconfig"]` (+حذف build/define) | plugin `nullableNonApplicable` definition |
| 6 | وضع serve: `wrangler.unstable_getMiniflareWorkerOptions({...worker.config, assets: void 0}, cloudflareEnv, {remoteProxyConnectionString?, containerBuildId?})` — **بلا envFiles** | plugin `@2830596`-تابع |
| 7 | wrangler: `getBindings2(config2, env6, options?.envFiles, true, void 0, void 0)` → envFiles=undefined | wrangler `@14969064` (نص def `unstable_getMiniflareWorkerOptions` الحرفي) |
| 8 | `getBindings2 → getVarsForDev(configParam.userConfigPath, envFiles=undefined, config.vars, env, false, config.secrets→undefined)` | wrangler `@7954404` |
| 9 | `getVarsForDev`: `configDir = resolve(dirname(userConfigPath))` ثم `loadDotDevDotVars(configDir/.dev.vars, env)` | wrangler `@7946795` |
| 10 | **الحلقة الفاصلة:** `loadDotDevDotVars(envPath, env) = tryLoad(`${envPath}.${env}`) || tryLoad(envPath)` | wrangler `@7950096` |

**النتيجة البنيوية الحاسمة:** مع configPath = `<runRoot>/wrangler.e2e.generated.jsonc` يصبح `dirname(userConfigPath)` = **runRoot**، فأي كون قيمة `CLOUDFLARE_ENV` ما كانت: البحث عن الأسرار يكون `<runRoot>/.dev.vars.e2e` أو — في أسوأ حال عبث البيئة — `<runRoot>/.dev.vars`. **كلا المرشحين داخل الجذر المملوك؛ ملف `.dev.vars` الحقيقي في جذر المشروع يصبح غير قابل للوصول بنيويًا** (وليس مجرد غير مُستشار في المسار السعيد). وغياب الأسرار ينتهي إلى فشل تشغيل fail-closed (لا BETTER_AUTH_SECRET) وليس إلى قراءة بديل من جذر المشروع.

## 01.2 إثبات سلوك remoteBindings (تحذير المالك مؤكد بالنسخة المثبتة)

- الافتراضي في الإضافة: `const remoteBindings = prefixedEnv.CLOUDFLARE_VITE_FORCE_LOCAL === "true" ? false : pluginConfig.remoteBindings ?? true;` — **الافتراضي true** (`@2829886`). إذن تمرير `remoteBindings: false` صراحةً إلزامي في وضع الاختبار.
- بوابة الجلسة البعيدة (موضعا الاستدعاء): `const remoteProxySessionData = !resolvedPluginConfig.remoteBindings ? null : await maybeStartOrUpdateRemoteProxySession(...)` (`@3816462` serve، `@3825844` preview) — مع false: **لا جلسة بعيدة، لا مصادقة، لا حساب**.
- `pickRemoteBindings` يلتقط فقط الروابط ذات `remote: true` الصريح (`@3721485`) — الضبط المُولَّد لن يحتوي أيًا منها (تحقق في validate + اختبارات).

## 01.3 العمال المساعدون واكتشاف الضبط

- وضع serve: `const auxiliaryWorkersResolvedConfigs = []; for (const auxiliaryWorker of pluginConfig.auxiliaryWorkers ?? [])` — **لا اكتشاف تلقائي** لضبط جذر المشروع؛ `getWorkerConfigs(root, …)` (قارئ `.wrangler/deploy/config.json`) مستخدم في مسار preview فقط.
- `writeDeployConfig` (كتابة `.wrangler/deploy/config.json`): مواضع استدعائها كلها خطافات **build** (`writeBundle`/`generateBundle`) — مشغّل E2E (serve) لا يكتبها. (نقطة `.wrangler/deploy` خارج `.wrangler/state` أصلاً، لكن الوثوق بها غير لازم لأنها لا تُستدعى في serve.)

## 01.4 حل المسارات النسبية في الضبط المُولَّد

- `main`: `normalizeAndValidateMainField` يحله على `dirname(configPath)` مع بقاء المطلق مطلقًا (`@1876706`) — لذلك الضبط المُولَّد يكتب **main مطلقًا** = `<projectRoot>/worker/index.ts`.
- `migrations_dir`: `resolveMigrationsConfig` يجعل `projectPath = dirname(configPath)` (= runRoot) و`getMigrationsPath` يفعل `resolve(projectPath, migrationsDir)` (wrangler `@9635426`, `@9638465`) — مع **migrations_dir مطلق** الناتج = `<projectRoot>/drizzle/migrations` بغض النظر عن projectPath.
- أمر الترحيل نفسه: `resolveWranglerConfigPath({config})` يجعل `--config` هو userConfigPath مباشرة (`@118145`)؛ ومسار `d1 migrations apply` **لا يستدعي** `getVarsForDev` إطلاقًا (مواضع الاستدعاء الثلاثة المفحوصة: getBindings2/dev، توليد الأنواع، التصدير) — لا أسرار تُحمَّل في الترحيل أصلًا.

## 01.5 مسارات `.env` وprocess.env المستقلة (محاسبة كاملة)

1. الإضافة: `prefixedEnv = vite.loadEnv(viteEnv.mode, root, ["CLOUDFLARE_", "WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_"]); Object.assign(process.env, prefixedEnv);` (`@2829738`) — قيم `CLOUDFLARE_*` من ملفات `.env` في جذر المشروع تندمج. لا يمكن فحص وجود `.env*` (محظور) ⇒ **UNVERIFIED** وجودها.
2. حياد الخطر: `CLOUDFLARE_ENV` يُمرَّر صراحةً في بيئة الابن من مشغّل E2E، و`vite.config.ts` يفشل مغلقًا إن اختلفت (`EXPORTFLOW_E2E_ENV_MISMATCH`)؛ واختيار الضبط لا يتأثر بأي حال (الخيار الصريح مُقدَّم على متغير البيئة — 01.1#1)؛ وحتى مع عبث اسم البيئة يبقى البحث داخل runRoot (01.1 النتيجة البنيوية)؛ وأخطر ناتج ممكن = غياب الأسرار → فشل تشغيل، وليس تسريب.
3. `CLOUDFLARE_INCLUDE_PROCESS_ENV` افتراضي false (wrangler `@1004320`) — process.env لا يُدمج في متغيرات العامل.
4. `CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV` افتراضي true (فرع `.env` البديل عند غياب أي ملف `.dev.vars`) — **لا يُبلغ** في عقدنا لأن فرع `.dev.vars.e2e` ينجح أولًا (`||` يقصر)، ومع ذلك نضبطه `false` في بيئة الابن حماية إضافية.
5. Vite `import.meta.env` (عميل): بادئة `VITE_*` الافتراضية — لا علاقة لها بسلسلة أسرار العامل؛ وبيئة الابن المعقّمة تمنع وراثة أي `VITE_*`/`CLOUDFLARE_*` من الأب.
6. بيئة الابن الحالية `{...process.env, …}` ترث كل شيء — يُستبدل بقائمة سماح صارمة (G1).

## 01.6 توافق الضبط المُولَّد مع مدخل العامل/الأصول/الروابط

- الحقول المنسوخة عمدًا من `wrangler.jsonc` (عام بلا أسرار، لا account/routes/remote فيه أصلًا — مُتحقق منه): `name`, `compatibility_date`, `compatibility_flags:["nodejs_compat"]`, `assets` (SPA + `run_worker_first:["/api/*"]`), D1 (binding `DB`, name `exportflow-local`, database_id الاصطناعي المحلي الموجود), R2 (binding `DOCUMENTS`, bucket محلي), `triggers.crons`, و`vars` العامة (يقرؤها كود العامل: MAX_UPLOAD_BYTES وغيرها). تُستبعد أي حقول بعيدة (لا يوجد فيها أصلًا).
- `preserveOriginalMain: true` في قراءة الإضافة يحمي main كما هو.
- متسق مع `e2e-server` الحالي: نفس database_name في أمر `d1 migrations apply`.

## 01.7 سلامة التدفقات الأخرى (قبل التعديل)

- `vite.reliability.config.ts` مستقل (لا يستورد vite.config، بلا cloudflare plugin) — لا يتأثر.
- `EXPORTFLOW_TEST` بلا مستهلكين غير فحص testMode نفسه.
- وضع dev العادي (بلا CI): testMode=false → العقد الجديد غير مفعّل؛ مسار `.wrangler/state` الافتراضي للطوّار يبقى كما هو (خارج وضع الاختبار فقط، كما هو اليوم).
- `pnpm build`/preview تحت CI: كانوا يفشلون أصلًا عند `EXPORTFLOW_PERSIST_REQUIRED` — لا تدفق عامل ينكسر بتضييق العقد.

## 01.8 قرار G0

**`G0: PASS_STATIC_APPROACH_SAFE_TO_PATCH`** — مقترح M01-B (ضبط مُولَّد داخل الجذر المملوك + `configPath` + `remoteBindings:false`) مُثبت صالحًا لهذا الثنائي المثبت بالضبط (plugin 1.63.1 + wrangler 4.149.0)، مع عقود G1 المقيدة في تقرير `02`. عناصر UNVERIFIED معلنة: وجود ملفات `.env*` في جذر المشروع (محظور فحصها)، وسلوك loadEnv الدقيق في المزاجة (INFERRED من دلالات Vite stdlib) — كلاهما محيَّد بنيويًا كما في 01.5.
