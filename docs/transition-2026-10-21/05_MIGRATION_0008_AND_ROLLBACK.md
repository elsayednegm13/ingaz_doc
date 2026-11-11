# 05 — الترحيل 0008 وتحليل التراجع

> **المراجعة:** `ET-2026-10-21-CONTROLLED-REMEDIATION`
> **الملف:** `drizzle/migrations/0008_replay_safety_and_import_identity.sql`
> **النوع:** إضافي، إلى الأمام فقط.

## 05.1 محتوى الترحيل

| السطر | العملية | الأثر |
|---|---|---|
| 13 | `ALTER TABLE idempotency_keys ADD COLUMN response_expires_at TEXT` | عمر الاستجابة المحمية |
| 14 | `ALTER TABLE idempotency_keys ADD COLUMN outcome_class TEXT` | تصنيف الأثر |
| 15 | `ALTER TABLE idempotency_keys ADD COLUMN effect_ref TEXT` | مرجع الأثر |
| 20 | `ALTER TABLE customer_import_operations ADD COLUMN file_fingerprint TEXT` | بصمة الملف |
| 21 | `ALTER TABLE customer_import_operations ADD COLUMN parser_version TEXT` | إصدار المحلل |
| 25 | `CREATE TABLE IF NOT EXISTS auth_compensation_incidents` | سجل الحوادث |
| 36 | فهرس جزئي للحوادث المفتوحة | استعلام تشغيلي |
| 38 | فهرس `expires_at` | تنظيف الشواهد |

## 05.2 سلامة البيانات

| السؤال | الجواب |
|---|---|
| هل تُحذف صفوف؟ | لا |
| هل تُعاد كتابة صفوف تاريخية؟ | لا |
| هل تتغير قيود `NOT NULL`؟ | لا؛ الأعمدة الجديدة nullable |
| هل يتأثر `UNIQUE (actor_id, idempotency_key)`؟ | لا |
| هل يتأثر `UNIQUE (import_id, row_index)`؟ | لا |
| هل تُعدّل `0001`–`0007`؟ | لا |
| هل الترحيل قابل للتكرار؟ | الجدول والفهارس `IF NOT EXISTS`؛ الأعمدة لا، لذا يُطبق مرة واحدة |

## 05.3 الصفوف التاريخية

| الحالة | السلوك |
|---|---|
| `idempotency_keys` قديم مكتمل بلا `response_expires_at` | إعادة التشغيل تعيد `409 IDEMPOTENCY_RESULT_EXPIRED` ولا تنفذ المعالج |
| `idempotency_keys` قديم `IN_PROGRESS` | بعد انتهاء lease يصبح `UNKNOWN`، ولا يُنفذ تلقائياً |
| `customer_import_operations` قديم بلا بصمة | استئناف بنفس المعرّف يعيد `409 IMPORT_FINGERPRINT_MISSING` |
| `customer_import_operations` قديم بلا `parser_version` | يُعامل كـlegacy؛ لا يُخمَّن |

هذا هو **الفشل المغلق**: لا نخمّن هوية ملف قديم، ولا نعيد تنفيذ عملية قديمة.

## 05.4 خطة التراجع

الترحيل إلى الأمام فقط. لا يوجد `DOWN` آمن لأن حذف الأعمدة قد يفقد أدلة. خيارات التراجع:

| الخيار | متى | الإجراء | الأثر |
|---|---|---|---|
| `ROLLBACK-APP` | فشل منطقي بعد النشر | إعادة نشر الإصدار السابق مع إبقاء `0008` | آمن؛ الأعمدة الإضافية لا تضر |
| `RESTORE-SNAPSHOT` | فشل بيانات | استعادة لقطة D1 موثقة قبل الترحيل | يفقد الكتابات اللاحقة |
| `FORWARD-FIX` | خلل في الترحيل | ترحيل `0009` تصحيحي | المفضل |
| `DROP-0008` | غير موصى به | حذف الجدول/الأعمدة يدوياً | يفقد حوادث وبصمات |

## 05.5 مخاطر الترقية الحقيقية

| الخطر | الاحتمال | التخفيف |
|---|---|---|
| قاعدة مطور قديمة جداً | متوسط | فحص الجاهزية 503 قبل أي طفرة |
| صفوف `idempotency_keys` قديمة بلا بصمة استجابة | مرتفع | `EXPIRED` fail-closed |
| عمليات استيراد قديمة بلا بصمة | مرتفع | `IMPORT_FINGERPRINT_MISSING` |
| تعارض أعمدة إن أُضيفت يدوياً | منخفض | فحص مسبق للعمود |
| قفل كتابة أثناء `ALTER TABLE` | منخفض | تنفيذ في نافذة صيانة |

## 05.6 ما لم يُثبت

- لم تُطبق `0008` على قاعدة المطور.
- لم تُختبر ترقية بيانات تاريخية حقيقية.
- لم تُختبر استعادة لقطة D1 حقيقية.
- لم يُختبر `ALTER TABLE` تحت حمل إنتاجي.

## 05.7 الخلاصة

**الترحيل: إضافي وآمن بنيوياً. التراجع: إعادة نشر أو لقطة أو إصلاح إلى الأمام. الترقية الحقيقية: بانتظار إذن المالك.**
