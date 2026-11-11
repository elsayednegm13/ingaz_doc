# 04 — الترقية وجاهزية المخطط

> **المراجعة:** `ET-2026-10-21-CONTROLLED-REMEDIATION`
> **المبدأ:** لا ترحيل تلقائي. قاعدة أقدم من `0008` ترفض الكتابة برمز ثابت، وتبقى قراءة الصحة الحية متاحة.

## 04.1 كائنات `0008`

| الكائن | النوع | الغرض |
|---|---|---|
| `idempotency_keys.response_expires_at` | عمود `TEXT` | عمر استجابة محمية أقصر من عمر الشاهد |
| `idempotency_keys.outcome_class` | عمود `TEXT` | `COMMITTED` أو `REJECTED` |
| `idempotency_keys.effect_ref` | عمود `TEXT` | مرجع أثر تجاري مختصر |
| `customer_import_operations.file_fingerprint` | عمود `TEXT` | SHA-256 للملف القانوني |
| `customer_import_operations.parser_version` | عمود `TEXT` | `csv-v1` |
| `auth_compensation_incidents` | جدول | حوادث التعويض الحمراء |
| `auth_compensation_incidents_open_idx` | فهرس جزئي | الحوادث غير المحلولة |
| `idempotency_keys_witness_idx` | فهرس | تنظيف الشواهد المنتهية |

## 04.2 لماذا إضافي فقط؟

- لا `DROP` ولا `ALTER COLUMN` ولا إعادة كتابة صفوف.
- الصفوف التاريخية في `idempotency_keys` تحتفظ بقيمها، والأعمدة الجديدة تبقى `NULL`.
- الصفوف التاريخية في `customer_import_operations` تحتفظ بتاريخها، وبصمتها تبقى `NULL`.
- لا تعديل على `0001`–`0007`.

## 04.3 سلوك الجاهزية

`server/services/schema.ts` يفحص ثلاثة أشياء فقط:

| الفحص | الاستعلام | إن غاب |
|---|---|---|
| شاهد التكرار | `SELECT response_expires_at, outcome_class, effect_ref FROM idempotency_keys LIMIT 1` | `idempotency_witness` |
| هوية الاستيراد | `SELECT file_fingerprint, parser_version FROM customer_import_operations LIMIT 1` | `import_file_identity` |
| حوادث التعويض | `SELECT id FROM auth_compensation_incidents LIMIT 1` | `compensation_incidents` |

الفحص غير معدِّل، ولا يقرأ جدول تاريخ الترحيلات، ولا يعتمد على `wrangler`.

## 04.4 سلوك HTTP

| المسار | قاعدة قبل `0008` | قاعدة بعد `0008` |
|---|---|---|
| `GET /api/v1/health/live` | 200 | 200 |
| `GET /api/v1/health` | 503 `schema=upgrade_required` | 200 `schema=ready` |
| أي `POST/PUT/PATCH/DELETE` | 503 `SCHEMA_UPGRADE_REQUIRED` | يمر إلى المعالج |
| `GET` للقراءة | يمر (لا يكشف أسراراً) | يمر |

## 04.5 الاختبارات

| الاختبار | قاعدة | النتيجة |
|---|---|---|
| `schema.test.ts` — pre-0008 | `0007` | صحة 503، حية 200، طفرة 503، `customers=1` |
| `schema.test.ts` — post-0008 | `0007` + `0008` | صحة 200، طفرة 201، `customers=2` |

## 04.6 ماذا يحدث لقاعدة المطور؟

**لا شيء.** لم يُشغَّل `wrangler d1 migrations apply`، ولم يُفتح `.wrangler/state`. الترقية الحقيقية تحتاج إذناً منفصلاً من المالك ولقطة (snapshot) موثقة.

## 04.7 الخلاصة

**فحص الجاهزية: فشل مغلق. الترقية: إضافية إلى الأمام فقط. قاعدة المطور: لم تُلمس.**
