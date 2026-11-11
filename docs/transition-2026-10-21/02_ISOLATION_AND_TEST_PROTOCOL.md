# 02 — بروتوكول العزل والاختبار

> **المراجعة:** `ET-2026-10-21-CONTROLLED-REMEDIATION`
> **المبدأ:** لا يُشغَّل أي طفل يمكنه الوصول إلى حالة المطور قبل إثبات العزل ميكانيكياً.

## 02.1 القاعدة الحاكمة

1. لا `wrangler dev` ولا `vite` ولا `playwright` ولا `pnpm build` في هذه المراجعة.
2. لا قراءة أو نسخ أو ترحيل أو تجزئة (hash) لأي ملف SQLite تحت `.wrangler/state`.
3. لا قراءة `.dev.vars`.
4. لا فتح الجذور القائمة `.wrangler-e2e` و`.wrangler-perf` و`.wrangler-reliability-b` وجذور المراجعات السابقة.
5. لا اتصال بـCloudflare أو D1 أو R2 أو Workers أو KV.
6. لا Git commit/add/push/reset/clean/checkout أو تبديل فرع.
7. كل قاعدة اختبار تُنشأ في `%TEMP%/et-20261021-*` وتُغلق وتُحذف بعد الاختبار.

## 02.2 حارس العزل

### 02.2.1 الحارس القوي (Node)

`scripts/isolation-guard.mjs` يطبق:

| الفحص | السلوك |
|---|---|
| مسار فارغ | `PERSIST_PATH_REQUIRED` |
| خارج جذر المشروع | `PERSIST_OUTSIDE_PROJECT` |
| `.wrangler/state` بأي حالة أحرف أو اتجاه شرطة | `PROTECTED_STATE_FORBIDDEN` |
| أي جذر اختبار قائم | `PROTECTED_STATE_FORBIDDEN` |
| جذر غير موسوم بـ`.wrangler-safety-20261021-` | `AUDIT_ROOT_REQUIRED` |
| مسار قانوني موسوم | `ISOLATION_OK` |

يُطبّع الحارس حالة الأحرف على Windows واتجاه الشرطة و`realpath` للروابط الرمزية قبل المقارنة. لا يعتمد على `startsWith` النصي فقط.

### 02.2.2 الحارس المتساوي (Worker/Browser)

`shared/isolation.ts` يرفض `.wrangler/state` في أي مسار، بما في ذلك `C:\repo\.wrangler\state\v3`، ويُستخدم في اختبارات الوحدة وأدوات المتصفح.

### 02.2.3 حماية Vite

`vite.config.ts` يفشل مغلقاً في وضع CI/الاختبار إذا لم يُحدد `EXPORTFLOW_PERSIST` صراحةً، ولا يستخدم القيمة الافتراضية `.wrangler/state`.

### 02.2.4 حماية E2E

`scripts/e2e-server.mjs` ينشئ جذراً مملوكاً للتشغيل ويتحقق منه، ولا يحذف `.wrangler-e2e` القائم. لم يُشغَّل هذا الملف في هذه المراجعة.

## 02.3 الجذور المحمية

| الجذر | النوع | الإجراء |
|---|---|---|
| `.wrangler/state` | حالة مطور D1 | بيانات وصفية فقط |
| `.dev.vars` | أسرار بيئة | بيانات وصفية فقط |
| `.wrangler-e2e` | اختبار E2E قائم | لم يُفتح |
| `.wrangler-perf` | أداء قائم | لم يُفتح |
| `.wrangler-reliability-b` | موثوقية قائمة | لم يُفتح |
| `.wrangler-0653` | مراجعة سابقة | لم يُفتح |
| `.wrangler-0654-drain` | مراجعة سابقة | لم يُفتح |
| `.wrangler-0654-race` | مراجعة سابقة | لم يُفتح |
| `.wrangler-verify` | تحقق سابق | لم يُفتح |
| `.wrangler-transition-audit-20261020-*` | مراجعات سابقة | لم تُفتح |

## 02.4 بيئة الاختبار

| العنصر | القيمة |
|---|---|
| Node | `v24.19.0` |
| قاعدة الاختبار | `node:sqlite` في الذاكرة/ملف مؤقت |
| D1 shim | `tests/transition-2026-10-21/harness/d1.ts` |
| الترحيلات | `0001`–`0008` تُطبق نصياً على قاعدة مؤقتة |
| المصادقة | `createFakeAuth` تُحقن عبر `createApp(deps)` |
| المستخدم | `x-test-actor` |
| مفتاح التكرار | `idempotency-key` |
| جذر قاعدة الاختبار | `os.tmpdir()/et-20261021-*` |
| الحذف | `sqlite.close()` ثم `rmSync` |

## 02.5 لماذا لا يُستخدم Wrangler/Miniflare؟

لأن أي تشغيل لـWrangler قد يحل مسار `.wrangler/state` افتراضياً، حتى لو مررنا `--persist-to`. الاختبارات هنا تستدعي `createApp` مباشرةً في Node، مع D1 shim حقيقي ومنفصل. هذا يثبت منطق التطبيق دون فتح حالة المطور.

## 02.6 أوامر الاختبار

```powershell
# فحص الأنواع
node node_modules/typescript/bin/tsc -b --pretty false

# الفحص الساكن
node node_modules/oxlint/bin/oxlint src server worker shared tests scripts

# الاختبارات المعزولة
node node_modules/vitest/vitest.mjs run tests/transition-2026-10-21 --reporter=json --outputFile=docs/transition-2026-10-21/evidence/vitest.json
```

## 02.7 ما لم يُشغَّل

| الأمر | الحالة | السبب |
|---|---|---|
| `wrangler dev` | لم يُشغَّل | قد يحل حالة المطور |
| `vite` / `vite dev` | لم يُشغَّل | قد يحل حالة المطور |
| `playwright` | لم يُشغَّل | E2E محجوب بالعزل |
| `pnpm build` | لم يُشغَّل | خارج نطاق الإصلاح |
| `wrangler d1 migrations apply` | لم يُشغَّل | قاعدة المطور محمية |
| أي نشر | لم يُشغَّل | ممنوع |

## 02.8 الخلاصة

**العزل: مُثبت ميكانيكياً. الاختبارات: 53/53 في بيئة مؤقتة. حالة المطور: لم تُفتح. E2E: محجوب عن قصد.**
