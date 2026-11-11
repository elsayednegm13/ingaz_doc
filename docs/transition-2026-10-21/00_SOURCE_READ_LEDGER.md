# 00 — سجل قراءة المصادر ونطاق الوصول

> **المراجعة:** `ET-2026-10-21-CONTROLLED-REMEDIATION`
> **التاريخ:** 2026-10-21
> **الفرع:** `main` — **HEAD:** `d9106ee`
> **حالة هذا الملف:** مكتمل — يسجل ما قُرئ، وما لم يُقرأ، ولماذا.

## 00.1 الغرض

هذا السجل يثبت أن الإصلاح تم على نسخة المصدر داخل مساحة العمل فقط، وأن حالة المطور المحمية لم تُفتح ولم تُنسخ ولم تُهاجَر. كل قراءة موثقة أدناه كانت قراءة نصية لملفات المصدر أو قراءة **بيانات وصفية** (metadata) لمجلدات الحالة المحمية. لم تُقرأ أي قاعدة SQLite خاصة بالمطور، ولم يُقرأ ملف `.dev.vars`.

## 00.2 المصادر المقروءة

| # | المسار | الغرض | نوع القراءة |
|---|---|---|---|
| 1 | `server/services/idempotency.ts` | فهم الحالة الحالية لسجل التكرار | نصية |
| 2 | `server/services/imports.ts` | فهم استيراد العملاء والاستئناف | نصية |
| 3 | `server/services/reports.ts` | فهم معاينة الاستيراد | نصية |
| 4 | `server/services/users.ts` | فهم الأدوار والتجاوزات والتعطيل | نصية |
| 5 | `server/http/app.ts` | فهم المسارات وmiddleware وbootstrap | نصية |
| 6 | `server/services/customers.ts` | فهم إنشاء العميل والكتابة الذرية | نصية |
| 7 | `server/services/actor.ts` | فهم الصلاحيات ونطاق الحالة | نصية |
| 8 | `server/services/bank-courier.ts` | فهم حالات البنك وال Courier | نصية |
| 9 | `server/services/cases.ts` | فهم الفواتير والتصحيحات | نصية |
| 10 | `server/services/reminders.ts` | فهم الإشعارات والتذكيرات | نصية |
| 11 | `server/services/tracking.ts` | فهم روابط التتبع | نصية |
| 12 | `server/services/bookings.ts` | فهم الحجوزات والحاويات | نصية |
| 13 | `server/services/compensation.ts` | فهم التعويض والحوادث | نصية |
| 14 | `server/services/schema.ts` | فهم فحص الجاهزية | نصية |
| 15 | `server/auth.ts` | فهم تكامل Better Auth | نصية |
| 16 | `shared/enums.ts` | التحقق من قيم الحالات | نصية |
| 17 | `shared/permissions.ts` | التحقق من صلاحيات الأدوار | نصية |
| 18 | `drizzle/migrations/0001_init.sql` | مخطط الجداول | نصية |
| 19 | `drizzle/migrations/0002_seed.sql` | بيانات الأدوار وأنواع المستندات | نصية |
| 20 | `drizzle/migrations/0005_idempotency.sql` | مخطط سجل التكرار | نصية |
| 21 | `drizzle/migrations/0006_customer_imports.sql` | مخطط عمليات الاستيراد | نصية |
| 22 | `drizzle/migrations/0007_performance_indexes.sql` | الفهارس السابقة | نصية |
| 23 | `src/lib/api.ts` | سلوك إعادة المحاولة | نصية |
| 24 | `src/lib/idempotency.ts` | الاحتفاظ بمفتاح العميل | نصية |
| 25 | `scripts/e2e-server.mjs` | عزل خادم E2E | نصية |
| 26 | `vite.config.ts` | حماية persist في وضع الاختبار | نصية |
| 27 | `shared/isolation.ts` | حارس العزل المتساوي | نصية |
| 28 | `docs/transition-2026-10-20/FINAL_ENGINEERING_TRANSITION_REPORT_AR.md` | الأدلة السابقة D-1/D-2/D-3 | نصية |

## 00.3 ما لم يُقرأ

| المسار | الحالة | السبب |
|---|---|---|
| `.wrangler/state/**` | **لم يُفتح** | حالة مطور محمية؛ يُسمح بالبيانات الوصفية فقط |
| `.dev.vars` | **لم يُقرأ** | أسرار بيئة محمية |
| `.wrangler-e2e/**` | **لم يُفتح** | جذر اختبار قائم محمي |
| `.wrangler-perf/**` | **لم يُفتح** | جذر أداء قائم محمي |
| `.wrangler-reliability-b/**` | **لم يُفتح** | جذر موثوقية قائم محمي |
| `.wrangler-transition-audit-20261020-*` | **لم يُفتح** | جذور مراجعات سابقة محمية |
| أي قاعدة D1 بعيدة | **لم يُتصل بها** | لا Cloudflare ولا D1 ولا R2 ولا Workers |

## 00.4 بصمات المصدر قبل/بعد

تم تسجيل بصمات SHA-256 للملفات المصدرية قبل التعديل في:

- `docs/transition-2026-10-21/evidence/source-hashes-pre.json`
- `docs/transition-2026-10-21/evidence/source-hashes-post.json`

أمثلة من البصمات قبل التعديل:

| المسار | SHA-256 قبل | الحجم قبل |
|---|---|---|
| `server/services/idempotency.ts` | `DC68EF57…97340C1` | 7,834 بايت |
| `server/services/imports.ts` | `A349377B…91E1B473` | 6,693 بايت |
| `server/services/users.ts` | `F3350764…C08803B1` | 8,967 بايت |
| `server/http/app.ts` | `2BE393CD…DF35D4CC` | 42,788 بايت |
| `server/services/reports.ts` | `2AA012F7…C744D6` | 6,351 بايت |
| `shared/isolation.ts` | `D576D7BE…33B782` | 363 بايت |
| `vite.config.ts` | `14BCBE2A…B086CC` | 5,923 بايت |
| `scripts/e2e-server.mjs` | `56042D1A…1DBE8B` | 1,968 بايت |

## 00.5 قيود القراءة

- لم تُشغَّل أي أوامر `wrangler` أو `vite` أو `playwright` أو `pnpm build`.
- لم تُشغَّل أي أوامر Git تغيّر الحالة: لا `add` ولا `commit` ولا `push` ولا `reset` ولا `clean` ولا `checkout` ولا تبديل فرع.
- أوامر Git المستخدمة كانت للقراءة فقط: `status --short` و`diff --stat` و`diff --numstat`.
- لم يُستخدم أي اعتماد (credential) أو اتصال شبكي بعيد.
- كل اختبارات هذه المراجعة استخدمت قاعدة `node:sqlite` مؤقتة تحت `%TEMP%/et-20261021-*`.

## 00.6 الخلاصة

**قراءة المصدر: مكتملة. الوصول إلى حالة المطور: صفر. الوصول إلى الأسرار: صفر. الاتصالات البعيدة: صفر.**
