# M01-B.1 — 02: عقد الضبط المُولَّد والمسارات

## 02.1 الضبط المُولَّد: `<runRoot>/wrangler.e2e.generated.jsonc`

يُبنى بـ`buildGeneratedWorkerConfig({projectRoot})` ويُكتب داخل الجذر المملوك حصرًا. الحقول (قائمة سماح، منسوخة من الإعداد العام المحلي للمشروع فقط — بلا حساب/مسارات/عن بُعد، ولا يوجد فيها أصلًا):

| الحقل | القيمة | السبب |
|---|---|---|
| `name` | `exportflow` | هوية العامل المحلية (نفس الاسم للتوافق مع miniflare persist) |
| `compatibility_date` | `2026-10-11` | نفس المشروع |
| `compatibility_flags` | `["nodejs_compat"]` | يفرضه كود server |
| `main` | **مطلق** `<projectRoot>/worker/index.ts` | `normalizeAndValidateMainField` يحل النسبي على dirname(configPath)=runRoot — المطلق فقط صحيح |
| `assets` | SPA + `run_worker_first:["/api/*"]` | نفس سلوك SPA/API الحالي |
| `d1_databases[0]` | binding `DB`، name `exportflow-local`، database_id الاصطناعي المحلي، **migrations_dir مطلق** `<projectRoot>/drizzle/migrations` | نفس الروابط؛ `resolveMigrationsConfig` يجعل projectPath=dirname(configPath) فالمطلق يحسم الهدف |
| `r2_buckets[0]` | binding `DOCUMENTS`، bucket `exportflow-documents-local` (محاكاة محلية) | نفس الرابط المحلي |
| `triggers.crons` | `["* * * * *"]` | parity مع سلوك scheduled الحالي |
| `vars` | القيم العامة الخمس (APP_NAME، COMPANY_TIMEZONE، INCOTERMS، MAX_UPLOAD_BYTES، UPLOAD_PART_SIZE) | يقرؤها كود العامل؛ عامة بلا أسرار |

**مستبعد عمدًا:** أي `account_id/routes/route/zone_id/send_metrics/services/kv_namespaces/queues/secrets` وأي `remote: true` — و`validateGeneratedWorkerConfig` يرمي `GENERATED_WORKER_CONFIG_INVALID` عند أي منها (اختبار سلوكي T07).

## 02.2 عقد المسار المغلق (الملفان)

**e2e-server.mjs (قبل أي spawn):**
1. حراسات M01-A محفوظة: `EXPORTFLOW_E2E_ROOT_REQUIRED` → `assertIsolatedPersist(explicitRoot,{root})` (علامة الجذر) → رفض غير الفارغ `EXPORTFLOW_E2E_ROOT_NOT_FRESH` → persist = `<runRoot>/state` عبر الحارس.
2. `assertIsolatedPersist(generatedConfigPath,{root})` و`assertIsolatedPersist(devVarsPath,{root})` + تحقق `dirname === runRoot` للاثنين (`GENERATED_ARTIFACT_NOT_IN_RUN_ROOT`).
3. بناء + تحقق الضبط، ثم فحص وجود `main` و`migrations_dir` (`WORKER_ENTRY_MISSING`/`MIGRATIONS_DIR_MISSING`)، ثم الكتابة، ثم **تحقق ذهاب-إياب** (`JSON.parse(readFileSync(...))` → نفس المدقق) — الملف الممرَّر هو المُتحقق منه بالضبط (T02).
4. كتابة `<runRoot>/.dev.vars.e2e` (نفس القيم الاصطناعية العشوائية السابقة) ثم `validateSyntheticDevVars` — يرمي على مفقود/فارغ/مكرر/مشوه `SYNTHETIC_DEV_VARS_*` **قبل أول spawn** (T04: ترتيب مُثبت).
5. `run.json` يوثق `workerConfigPath`؛ `<runRoot>/tmp` يُنشأ لتوجيه TMP/TEMP.

**vite.config.ts (فرع E2E فقط):**
- `e2eWranglerConfigPath` IIFE: خارج testMode → undefined (سلوك dev/prod كما هو حرفيًا). في testMode: `EXPORTFLOW_E2E_WRANGLER_CONFIG_REQUIRED` إن غاب؛ فحوص متسلسلة: `EXPORTFLOW_E2E_ROOT_REQUIRED`، `EXPORTFLOW_E2E_ENV_MISMATCH` (CLOUDFLARE_ENV يجب أن يساوي e2e)، `EXPORTFLOW_E2E_CONFIG_NOT_ABSOLUTE`، `EXPORTFLOW_E2E_CONFIG_NOT_IN_RUN_ROOT` (path.relative)، `assertIsolatedPersist(configPath,{root:cwd,requireRunMarker:true})` (حارس معجمي مشترك)، `EXPORTFLOW_E2E_CONFIG_MISSING`، `EXPORTFLOW_E2E_DEV_VARS_MISSING` (وجود ملف الأسرار الشقيق) — كلها **قبل بناء plugin أو أي عملية**.
- التمرير: `cloudflare({ …, ...(e2eWranglerConfigPath ? { configPath, remoteBindings: false as const } : {}) })` — spread شرطي فارغ في غير E2E = نفس كائن الخيارات السابق تمامًا (T11).

## 02.3 سلسلة الأسرار بعد الإصلاح (النسخة المثبتة، تقرير 01 للتفاصيل)

`pluginConfig.configPath (صراحي) → getValidatedWranglerConfigPath (jsonc/json/toml) → unstable_readConfig({config,env:"e2e"}) → userConfigPath = المسار الممرَّر → (التطبيع لا يحذف userConfigPath) → getMiniflareWorkerOptions (بلا envFiles) → getBindings2 → getVarsForDev(userConfigPath, undefined, …) → loadDotDevDotVars(<runRoot>/.dev.vars, "e2e") = try(<runRoot>/.dev.vars.e2e) || try(<runRoot>/.dev.vars)`.

- **OB-01 مُغلق بنيويًا:** كل مرشحي البحث داخل runRoot؛ `.dev.vars` الحقيقي غير قابل للوصول حتى مع عبث CLOUDFLARE_ENV.
- **OB-02 مُغلق وظيفيًا:** الملف الأول في الترتيب هو نفسه الذي يكتبه المشغّل (`||` يقصر) — الأسرار الاصطناعية تصل العامل فعلًا.
- الفرعان الاحتياطيان معطلان: `.env` عبر `CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false` (افتراضي true في wrangler 4.149.0 — مُثبت)، وprocess.env عبر `CLOUDFLARE_INCLUDE_PROCESS_ENV` الافتراضي false (مُثبت).

## 02.4 أوامر الترحيل والإقلاع بعد التعديل

- الترحيل: `wrangler d1 migrations apply exportflow-local --local --persist-to <runRoot>/state --config <runRoot>/wrangler.e2e.generated.jsonc` — userConfigPath = المُولَّد؛ migrations_dir المطلق يحسم `<projectRoot>/drizzle/migrations`؛ ومسار d1 لا يستدعي `getVarsForDev` أصلًا (مُتتبَّع).
- الإقلاع: vite ببيئة ابن معقمة + `{...childEnv, CLOUDFLARE_ENV: "e2e"}` — الضبط المُولَّد هو الفعّال؛ لا بديل ولا سقوط لضبط المشروع (`findWranglerConfig` وذِكر `wrangler.jsonc` معدومان من الملفين — T10/T13).
- SCHEMA_BOOTSTRAP_ONLY: تهيئة أولى لقاعدة جديدة كليًا داخل الجذر المملوك فقط عند التشغيل المستقبلي المصرّح به؛ ليست ترحيل 0007→0008 مأهولة.
