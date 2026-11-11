# 03 — دليل منصة الاختبار المعزولة

> **المراجعة:** `ET-2026-10-21-CONTROLLED-REMEDIATION`
> **النتيجة:** 53 اختباراً ناجحاً من 53، و6 ملفات اختبار، و0 فشل.

## 03.1 مكونات المنصة

| المكوّن | الملف | الوظيفة |
|---|---|---|
| D1 shim | `tests/transition-2026-10-21/harness/d1.ts` | يحاكي `prepare/bind/first/all/run/batch` فوق `node:sqlite` |
| قاعدة الاختبار | `tests/transition-2026-10-21/harness/db.ts` | ينشئ قاعدة مؤقتة ويطبق الترحيلات ويزرع البيانات |
| المصادقة الوهمية | `tests/transition-2026-10-21/harness/fake-auth.ts` | تحاكي `createUser/linkAccount/findUserByEmail/updatePassword/changePassword` |
| التطبيق | `tests/transition-2026-10-21/harness/app.ts` | يستدعي `createApp(deps)` ويحقن `DB` و`DOCUMENTS` والمصادقة |
| اختبار الدخان | `tests/transition-2026-10-21/smoke.test.ts` | يثبت الصحة وإنشاء عميل وإعادة تشغيله |
| اختبارات D-1 | `tests/transition-2026-10-21/d1.test.ts` | 18 اختباراً |
| اختبارات D-2 | `tests/transition-2026-10-21/d2.test.ts` | 13 اختباراً |
| اختبارات D-3 | `tests/transition-2026-10-21/d3.test.ts` | 13 اختباراً |
| اختبار الجاهزية | `tests/transition-2026-10-21/schema.test.ts` | 2 اختبار |
| اختبار العزل | `tests/transition-2026-10-21/isolation.test.ts` | 6 اختبارات |

## 03.2 D1 shim

يدعم:

- `prepare(sql)` ثم `bind(...params)` ثم `first/all/run`.
- `batch([...])` داخل `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`.
- `meta.changes` و`meta.last_row_id`.
- كشف الاستعلامات عبر `SELECT|WITH|PRAGMA|EXPLAIN`.
- رفض أي مسار قاعدة خارج `%TEMP%`.

## 03.3 الترحيلات

| الترحيل | الغرض | طُبق في الاختبار |
|---|---|---|
| `0001_init.sql` | المخطط الأساسي | نعم |
| `0002_seed.sql` | الأدوار وأنواع المستندات | نعم |
| `0003_checkpoint.sql` | checkpoint | نعم |
| `0004_invoice_revisions.sql` | مراجعات الفواتير | نعم |
| `0005_idempotency.sql` | سجل التكرار | نعم |
| `0006_customer_imports.sql` | عمليات الاستيراد | نعم |
| `0007_performance_indexes.sql` | الفهارس | نعم |
| `0008_replay_safety_and_import_identity.sql` | إصلاح D-1/D-2/D-3 | نعم |

## 03.4 البيانات المزروعة

| الكيان | القيمة |
|---|---|
| `user-admin` | مدير جذر |
| `user-officer` | ضابط تصدير |
| `user-viewer` | عارض |
| `user-outsider` | خارجي بلا دور |
| `customer-1` | عميل قائم |
| `case-1` | حالة تصدير `BANK_ROUTE` مسندة للضابط |
| `requirement-1` | متطلب مستند `dt-ci` |
| `company_settings.bootstrap_consumed` | 1 افتراضياً، و0 في اختبارات bootstrap |

## 03.5 نتائج الاختبارات

| الملف | الاختبارات | الناجحة | الفاشلة | المدة التقريبية |
|---|---:|---:|---:|---:|
| `d1.test.ts` | 18 | 18 | 0 | ~18 ثانية |
| `d2.test.ts` | 13 | 13 | 0 | ~16 ثانية |
| `d3.test.ts` | 13 | 13 | 0 | ~15 ثانية |
| `isolation.test.ts` | 6 | 6 | 0 | ~0.3 ثانية |
| `schema.test.ts` | 2 | 2 | 0 | ~1.8 ثانية |
| `smoke.test.ts` | 1 | 1 | 0 | ~1 ثانية |
| **الإجمالي** | **53** | **53** | **0** | **~22 ثانية** |

> المدد مأخوذة من `evidence/vitest.json`؛ الإجمالي يشمل زمن التجميع والإعداد.

## 03.6 فحوص الجودة

| الفحص | الأمر | النتيجة |
|---|---|---|
| TypeScript | `node node_modules/typescript/bin/tsc -b --pretty false` | `EXIT=0` |
| Oxlint | `node node_modules/oxlint/bin/oxlint src server worker shared tests scripts` | `EXIT=0` مع تحذير سابق واحد في `CustomFieldsPanel.tsx` |
| Vitest | `node node_modules/vitest/vitest.mjs run tests/transition-2026-10-21 --reporter=json` | `success=true` |

## 03.7 حدود المنصة

| الحد | الأثر | التصنيف |
|---|---|---|
| عملية Node واحدة | لا يثبت سباقاً بين isolates متعددة | `NOT_TESTED` |
| مصادقة وهمية | لا تختبر تشفير كلمات المرور الحقيقي | مقبول لوحدة التعويض |
| D1 shim وليس D1 حقيقياً | لا يختبر سلوك D1 البعيد أو القيود الشبكية | مقبول للعزل |
| لا Playwright | لا يثبت واجهة المستخدم أو visual | `E2E_BLOCKED_ISOLATION` |
| لا قاعدة مطور | لا يثبت ترقية بيانات تاريخية حقيقية | `NOT_TESTED` |

## 03.8 الخلاصة

**المنصة المعزولة: ناجحة. 53/53. لا فشل. لا اتصال بحالة المطور.**
