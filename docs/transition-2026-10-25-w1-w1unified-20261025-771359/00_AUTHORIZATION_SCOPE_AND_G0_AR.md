# 00 — التفويض والنطاق ونتائج G0

## 1. أمر المالك

| البند | القيمة |
|---|---|
| الأمر | `W1-UNIFIED-EXECUTION-01` |
| التاريخ | 2026-10-25 |
| البوابات المأذونة | `G0 → G5` في أمر واحد |
| نوع التفويض | محلي اصطناعي فقط (fake-auth / SQLite / run-root معزول) |
| العودة للمالك بين البوابات | غير مطلوبة داخل النطاق الآمن |
| بدء W2–W6 | ممنوع |

## 2. قائمة السماح (ما يجوز تعديله)

```
server/**
shared/**
e2e/**
scripts/**
tests/**
vite.config.ts
playwright.config.ts
docs/transition-2026-10-25-w1-<run-id>/**
```

## 3. المحظورات (لم تُخترق)

| المحظور | الالتزام |
|---|---|
| `.wrangler/state` (أي وصول/stat/تعداد) | لم يُلمس |
| `.wrangler-e2e`, `.wrangler-perf`, `.wrangler-reliability-*`, `.wrangler-transition-audit-*` | لم تُدخل |
| `.dev.vars*` / `.env*` الحقيقية أو أسرار المضيف | لم تُقرأ |
| أوامر Git | لم تُنفَّذ |
| Cloudflare Remote / Staging / Production / R2 | لم تُلمس |
| تثبيت/تحديث حزم أو شبكة خارجية | لم تُنفَّذ |
| تعديل `drizzle/migrations/0001..0008` | لم يحدث |
| إنشاء `0009` | لم يحدث |
| اختراع قرار تجاري | لم يحدث |
| Quotation / W3 | لم يبدأ |

## 4. عقد الجذور والبيئة

كل محاولة تُشغَّل على جذر جديد فارغ وفريد:

```
.wrangler-safety-20261021-w1unified-20261025-<runId>
```

القواعد المطبَّقة:

1. الجذر يُنشأ فارغًا، ويُرفض التشغيل إذا كان غير فارغ.
2. `--config` و`--persist-to` صريحان في كل أمر Wrangler.
3. بيئة الأبناء معقّمة بقائمة سماح (OS فقط) + متغيرات العقد.
4. `CLOUDFLARE_ENV=e2e` إلزامي، والتحقق من أن `workerConfigPath` داخل الجذر.
5. ملفات الأسرار الاصطناعية تُكتب داخل الجذر فقط (`.dev.vars.e2e`).
6. لا ربط Remote: `remoteBindings: false` في إعداد Cloudflare Plugin.
7. إيقاف شجرة العمليات بعد كل تشغيل (`taskkill /T`) والتحقق من إغلاق المنفذ.

### الجذور المستخدمة

| المعرّف | الاستخدام |
|---|---|
| `...-771359` | الجذر الرئيسي (أدلة/محاولات أولى) |
| `...-b3fa7f` | تكرار هارنس G1 |
| `...-0ae4d1` | تكرار هارنس G1 |
| `...-6c0d5e` | تكرار هارنس G1 |
| `...-690847` | تكرار هارنس G1 |
| `...-d4685e` | **G1 happy المعتمد** |
| `...-f90db1` | **G1 failure المعتمد** |
| `...-1adb25` | G2 attempt-01 (خطأ توقع في الهارنس) |
| `...-ac4c0e` | G2 attempt-02 (PASS) |
| `...-57c582` | G2 attempt-03 (PASS على الكود النهائي) |

---

## 5. نتائج G0 (تدقيق ساكن وإصلاحات)

### G0-01 — تسريب `dotenv` من جذر المشروع إلى تشغيل Vite الاختباري

**المشكلة (`OBSERVED_SOURCE` قبل الإصلاح):** `envDir` في Vite افتراضيًا هو جذر المشروع، فتُحمَّل `.env` / `.env.local` / `.env.[mode]` الحقيقية أثناء تشغيل E2E، ما يجعل «البيئة الاصطناعية» تختلط بأسرار المطور.

**الإصلاح:**

```ts
const testEnvDir = (() => {
  if (!testMode) return undefined;
  const ownedRoot = process.env.EXPORTFLOW_E2E_ROOT;
  if (!ownedRoot || !String(ownedRoot).trim()) {
    throw new Error("EXPORTFLOW_E2E_ROOT_REQUIRED: test runs must pin an owned Vite env directory");
  }
  const dir = path.join(path.resolve(String(ownedRoot)), "vite-env");
  assertIsolatedPersist(dir, { root: process.cwd(), requireRunMarker: true });
  return dir;
})();

export default defineConfig({
  envDir: testMode ? testEnvDir : undefined,
  ...
});
```

**النتيجة:** وضع التطوير يحتفظ بالسلوك التاريخي؛ وضع الاختبار لا يقرأ أي `.env` من جذر المشروع.

---

### G0-02 — Wrangler في مساعدات E2E بلا `--config` وببيئة موروثة

**المشكلة (`OBSERVED_SOURCE` قبل الإصلاح):** `wranglerSql` / `wranglerRows` كانت تستدعي Wrangler دون `--config`، فيحلّ Wrangler إعداد المشروع، وقد يقرأ `.dev.vars` الحقيقي. كما كانت البيئة موروثة بالكامل.

**الإصلاح:**

```ts
function wranglerConfigPath(): string {
  const config = process.env.EXPORTFLOW_E2E_WRANGLER_CONFIG_PATH;
  if (!config || !String(config).trim()) {
    throw new Error(
      "EXPORTFLOW_E2E_WRANGLER_CONFIG_REQUIRED: E2E SQL helpers must use the generated run-owned Worker config",
    );
  }
  return assertIsolatedPersist(config, { root: process.cwd(), requireRunMarker: true });
}

function wranglerEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of WRANGLER_ENV_ALLOWLIST) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  env.CI = "1";
  env.WRANGLER_SEND_METRICS = "false";
  env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV = "false";
  return env;
}
```

وكل استدعاء أصبح يتضمن `--persist-to <root> --config <generated>` مع `env: wranglerEnv()`.

---

### G0-03 — Playwright يمرّر بيئة المضيف كاملة إلى خادم الاختبار

**المشكلة (`OBSERVED_SOURCE` قبل الإصلاح):** `webServer.env` كانت تحتوي `...process.env`، فتنتقل أسرار المضيف و`CLOUDFLARE_*` وأي `.env` محمّل إلى عملية الخادم.

**الإصلاح:**

```ts
const SERVER_ENV_ALLOWLIST = ["PATH", "SYSTEMDRIVE", "SYSTEMROOT", "WINDIR", "COMSPEC", ...];

function serverEnv(): Record<string, string> { ... }

webServer: {
  command: "node scripts/e2e-server.mjs",
  env: {
    ...serverEnv(),
    EXPORTFLOW_E2E_ROOT: runRoot,
    EXPORTFLOW_PORT: String(port),
  },
}
```

**ملاحظة عقدية:** السلسلة الحرفية `EXPORTFLOW_E2E_ROOT: runRoot` مطلوبة من اختبار `m01a3-setup-import-contract.test.mjs`، وقد بقيت كما هي.

---

### G0-04 — `e2e/**` خارج أي `tsconfig` ⇒ لا فحص أنواع

**المشكلة (`OBSERVED_SOURCE`):** `tsconfig.json` يشير إلى `app` و`node` و`worker`، ولا أحدها يضم `e2e/**`. لذلك لم يكن `tsc -b` يفحص ملفات E2E إطلاقًا.

**الإصلاح:** `scripts/w1/e2e-typecheck.mjs` يبني برنامج TypeScript مستقلًا (strict، `moduleResolution: bundler`، `types: ["node"]`) على `e2e/**/*.ts` + `playwright.config.ts`، ويُرجع `EXIT=1` عند أي خطأ.

**النتيجة الأولى (`g4-e2e-typecheck.log`):** 4 أخطاء موجودة مسبقًا:

| الملف | الخطأ |
|---|---|
| `e2e/checkpoint06-shots.spec.ts:28` | `TS2367` مقارنة ميتة مع `/settings` داخل مجموعة لا تحتويه |
| `e2e/helpers.ts:5` | `TS2305` استيراد نوع `IsolatedPersistOptions` من ملف `.mjs` |
| `e2e/shell-grid.spec.ts:81` | `TS2322` `string \| null` إلى `string` |
| `e2e/shell-grid.spec.ts:110` | `TS2322` نفس السبب |

**النتيجة النهائية (`g4-e2e-typecheck-02.log`):** `PASS` — 0 تشخيصات، 18 ملفًا.

---

## 6. حكم G0

**PASS** — أُغلق مسار تسريب البيئة والأسرار في الطبقات الثلاث (Vite، Playwright، Wrangler)، وأصبح `e2e/**` مغطى بفحص أنواع مستقل. لا تغيير في دلالات التطبيق، ولا تعديل خارج قائمة السماح.
