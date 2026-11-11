# 05 — فرق المخطط وحفظ البيانات (Schema Diff & Data Preservation)

**التدقيق:** ET-2026-10-20 · **الأدلة:** `evidence/armU-before-0004.json` ↔ `evidence/armU-after-0007.json`، `evidence/armC-after-0007.json`

## 5.1 ماذا تغيّر في المخطط بالضبط (OBSERVED_TEST)

| العنصر | قبل (0004) | بعد (0007) | الحكم |
|---|---|---|---|
| عدد الجداول | 54 | 57 | **+3 جداول جديدة فقط** |
| الجداول الجديدة | — | `idempotency_keys`، `customer_import_operations`، `customer_import_rows` | إضافة فقط |
| أوامر ALTER على جداول قائمة | — | **لا شيء** | لا مساس بالجداول القديمة |
| الفهارس | 26 | 32 | **+6 فهارس** (0007) |
| `PRAGMA foreign_keys` | 1 | 1 | متطابق |
| `PRAGMA integrity_check` | ok | ok | سليم |
| `PRAGMA foreign_key_check` | 0 مخالفة | 0 مخالفة | سليم |
| سجل الترحيلات `d1_migrations` | 4 مدخلات | 7 مدخلات | متوقّع |

**نصوص 0005–0007 (كما شُحنت، لم تُعدَّل):**

| الترحيل | ما ينشئه | ينشئ/يعدّل بيانات قائمة؟ |
|---|---|---|
| `0005_idempotency.sql` | جدول `idempotency_keys` + فهرس انتهاء | لا |
| `0006_customer_imports.sql` | `customer_import_operations` + `customer_import_rows` | لا |
| `0007_performance_indexes.sql` | 6 فهارس `CREATE INDEX IF NOT EXISTS` | لا |

## 5.2 حفظ البيانات: مقارنة البصمات قبل/بعد (OBSERVED_TEST)

طريقة المقارنة: لكل جدول، تُرتَّب الصفوف بعد ترتيب أعمدةها أبجديًا، ويُحسب SHA-256 للمحتوى المتسلسل، ثم تُقارَن البصمات.

| نتيجة المقارنة | الجداول | التفصيل |
|---|---|---|
| **بصمة متطابقة** (لا تغيير) | **51 جدولًا تجاريًا** | customers, customer_contacts, customer_addresses, customer_bank_accounts, export_cases, export_case_customer_snapshots, export_invoices, invoice_revisions, document_versions, document_reviews, operation_document_requirements, bank_submissions, bank_events, courier_shipments, courier_tracking_events, bookings, containers, container_events, reminder_instances, notification_deliveries, notification_reads, customer_tracking_links, tracking_link_access_events, upload_sessions, upload_parts, audit_log, case_events, import_jobs, user, session, account, roles, role_permissions, user_roles, user_permission_overrides, user_preferences, custom_field_definitions, custom_field_values, payment_term_types, ports, company_settings, document_type_definitions, document_template_sets, document_template_items, reminder_rule_definitions, verification, login_attempts, rate_limit_buckets, physical_original_events, booking_attachments |
| **تغيّر متوقّع** | `d1_migrations` | سجلّ أداة الترحيل (4 → 7) |
| **تغيّر داخلي** | `_cf_METADATA`، `sqlite_sequence` | جداول Miniflare/SQLite الداخلية، خارج نطاق التطبيق |
| **جديد** | `idempotency_keys` (0 صف)، `customer_import_operations` (0 صف)، `customer_import_rows` (0 صف) | فارغة كما يُتوقع |

**إجمالي الصفوف:** 280 → 283 (الفرق = 3 صفوف داخلية في `d1_migrations` + `sqlite_sequence`).

## 5.3 ثوابت العمل التي تحقّقت (تحقّق انتقائي مُعمَّق)

| # | الثابت | طريقة التحقق | النتيجة |
|---|---|---|---|
| INV-1 | الفاتورة لا تُعاد حساباتها | `export_invoices` صف CFR: `goods=250000`، `invoiced_freight=50000`، **`invoice_total=310000`** | القيم محفوظة حرفيًا (البصمة متطابقة) ⇒ لا إعادة حساب |
| INV-2 | لقطة العميل لا تتبع تغيّر البيانات الرئيسية | `export_case_customer_snapshots` 4 صفوف | محفوظة كما هي |
| INV-3 | سجل مراجعة الفاتورة (0004) باقٍ | `invoice_revisions` صف واحد | محفوظ |
| INV-4 | مراجعات المستندات مرتبطة بالإصدار | `document_reviews` 4 صفوف على 4 إصدارات مختلفة | محفوظة |
| INV-5 | فتحات الحاويات المخططة ≠ الأرقام الفعلية | `containers`: فتحتان `official_number=NULL` وواحدة `MSCU1234567` | محفوظ |
| INV-6 | BANK ≠ DIRECT | `export_cases`: مساران بنكيان وواحد مباشر | محفوظ |
| INV-7 | القيم الخاصة والحدود | اسم بعلامة اقتباس وشرطة وعلامات عربية؛ `created_at='1970-01-01'`، `updated_at='2099-12-31'` | محفوظة بلا اقتطاع |
| INV-8 | رابط تتبع ملغى | `customer_tracking_links`: واحد `revoked_at` | محفوظ |

## 5.4 معقولية فهارس 0007 (MIG-04) — قياس لا استنتاج

`0007` ينشئ 6 فهارس. القياس على قاعدة U بعد **تعبئتها بـ 2000 عميل و5004 طلب و5002 تذكير و5001 جلسة رفع** (بيانات اصطناعية):

| الاستعلام | خطة SQLite قبل القياس التوضيحي | خطة SQLite بعد 0007 | النتيجة |
|---|---|---|---|
| `SELECT * FROM export_cases WHERE customer_id=? ORDER BY created_at DESC` | مسح كامل للجدول | `SEARCH export_cases USING INDEX export_cases_customer_idx (customer_id=?)` | **الفهرس مستخدم** |
| `SELECT * FROM customer_contacts WHERE customer_id=?` | مسح كامل | `SEARCH customer_contacts USING INDEX customer_contacts_customer_idx` | **مستخدم** |
| `SELECT * FROM reminder_instances WHERE case_id=?` | مسح كامل | `SEARCH reminder_instances USING INDEX reminder_instances_case_idx` | **مستخدم** |
| `SELECT * FROM upload_sessions WHERE parent_type=? AND parent_id=?` | مسح كامل | `SEARCH upload_sessions USING INDEX upload_sessions_parent_idx` | **مستخدم** |

> **حدّ صريح:** هذا يثبت **استخدام الفهارس في المخطِّط** على بيانات اصطناعية محلية. **لا** يثبت فائدة زمنية على Cloudflare ولا في الإنتاج، ولا يُشتكي من غياب قياس زمني (S11).

**دليل الفهرسين المتبقيَّين** (`customer_addresses_customer_idx`، `customer_bank_accounts_customer_idx`): لم يظهرا في القياس لأن البذرة الاصطناعية لا تحمّل عناوين/بنوك كثيرة؛ فائدتهما `INFERENCE` (نفس النمط) لا `OBSERVED_TEST`.

## 5.5 تكافؤ المخطط: نظيف ↔ مرقّى

| المقارنة | النتيجة |
|---|---|
| قائمة الجداول (C مقابل U) | **متطابقة تمامًا** |
| قائمة الفهارس (C مقابل U) | **متطابقة تمامًا** |
| `foreign_keys` | 1 في كليهما |
| `integrity_check` | ok في كليهما |
| الفروق المعروفة المشروعة | C: صف واحد في `d1_migrations` لكل ترحيل؛ U: نفس thing + بيانات пред الترقية (هذا هو **الفرق المطلوب**، لا عيب) |

## 5.6 «الترحيل النظيف ليس إثباتًا للترقية» (S04 / §18)

| ما يثبته البناء النظيف | ما لا يثبته |
|---|---|
| أن ملفات الترحيلات صحيحة نحويًا وأنها تُطبَّق بترتيبها | أن ترحيل قاعدة قائمة لا يمسّ المعرّفات القديمة ولا الصفوف ولا القيود |
| أن المخطط النهائي متسق | أن `NOT NULL`/`UNIQUE`/`FK` الجديدة لا تصطدم ببيانات قديمة |
| أن الفهارس تُنشأ | أن البيانات القديمة تُقرأ بالمخطّط الجديد بشكل صحيح |

**الحالة في هذا التدقيق:** الذراع U يغطّي الفجوة ببذرة اصطناعية غنية (51 جدولًا، 280 صفًا، بكل القيود). **المتبقّي:** U-REAL (لقطة حقيقية من عند المطوّر) = UNVERIFIED — يتطلب تفويضًا صريحًا (20-5).
