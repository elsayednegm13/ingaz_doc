# 06 — تحليل خطأ الترحيل والتراجع (Migration Error & Rollback Analysis)

**التدقيق:** ET-2026-10-20 · **الأدلة:** `evidence/mig-F2-broken-apply.log`، `evidence/armF-after-broken-apply.json`

## 6.1 كيف فشلت عملية الترحيل (اختبار MIG-05)

| الخطوة | الإجراء | النتيجة |
|---|---|---|
| F1 | تطبيق 0001–0003 على متجر `.wrangler-transition-audit-20261020-f` | exit 0، 3 ترحيلات |
| F2 | `probes/break-fixture.mjs --drop roles` | حُذف جدول `roles` من **قاعدة التدقيق فقط** (مع `PRAGMA foreign_keys=OFF`) ⇒Fixture مكسور مقصودًا |
| F3 | `wrangler d1 migrations apply … --config wrangler.audit.all.jsonc` | **exit 1**، «About to apply 4 migration(s)» ثم: `ERROR no such table: main.roles: SQLITE_ERROR` |

**لم يُعدَّل أي ملف ترحيل مُسلَّم** — العطل مُدخَل عبر كسر البيانات، وهو ما طلبته المهمّة (S04.2: «Test migration failure only on disposable DB … never by editing shipped migration»).

## 6.2 حالة قاعدة البيانات بعد الفشل (OBSERVED_TEST)

| الفحص | القيمة | القراءة |
|---|---|---|
| `d1_migrations` | `0001_init.sql`, `0002_seed.sql`, `0003_checkpoint.sql` | **الترحيل الفاشل 0004 لم يُسجَّل** ⇒ لا «تطبيق نصي» |
| `invoice_revisions` (جدول 0004) | غير موجود | لم يُنشأ |
| `idempotency_keys` (0005) | غير موجود | لم يُنشأ ⇒ توقّف التنفيذ عند أول خطأ |
| `customer_import_operations` (0006) | غير موجود | لم يُنشأ |
| `roles` | غير موجود | **لم يُعَد إنشاؤه تلقائيًا** ⇒ لا «إصلاح» صامت |
| `PRAGMA integrity_check` | `ok` | البنية سليمة (العطل منطقي لا تلف) |
| PRAGMA foreign_key_check | 95 مخالفة | **متوقّع**: حذف جدول الأصل ترك صفوفًا أبناء يتيمة — هذا هو العطل المُدخَل، لا عيب في الترحيل |

## 6.3 سلوك أداة الترحيل الرسمية (مقتبس من `wrangler d1 migrations apply --help`)

> «If applying a migration results in an error, this migration will be rolled back, and the previous successful migration will remain applied.»

**ما تحقّق فعليًا:** الترحيلات 0001–0003 بقيت مُطبَّقة، و0004 لم يُسجَّل، و0005–0007 لم تُنفَّذ. ⇒ **لا تراجع جزئي، ولا إصلاح تلقائي، ولا فجوة صامتة.**

## 6.4 هل الترحيل يفشل مغلقًا على قاعدة إصدار قديم؟ (S04.2 / §19)

| السؤال | الإجابة | الدليل |
|---|---|---|
| هل يفحص التطبيق إصدار المخطط عند الإقلاع؟ | **لا** | `server/http/app.ts`: لا يوجد أي استعلام لـ `d1_migrations` ولا تحقق من `schema_version` |
| هل `/api/v1/health` يكشف قاعدة ناقصة الترحيلات؟ | **لا** — يفحص اتصال D1 فقط | `server/http/app.ts:217-244` |
| ماذا يحدث عند `POST /api/v1/customers` على قاعدة 0004 (بلا `idempotency_keys`)؟ | **500** من SQLite (`no such table: idempotency_keys`) بعد أن يكون الوسيط قدclaimed المفتاح | `server/http/app.ts:376` يستدعي `beginIdempotent` قبل المعالج |
| ماذا يحدث عند POST /api/v1/customers على قاعدة 0004 (بلا idempotency_keys)؟ | **500** من SQLite (
o such table: idempotency_keys) بعد أن يكون الوسيط قد claimed المفتاح | server/http/app.ts:376 يستدعي eginIdempotent قبل المعالج |

**الحكم: `FAIL` لاشتراط «FAIL CLOSED with actionable message».**
التطبيق لا يعرف أنه على مخطط قديم، ويُظهر خطأ 500 غامضًا بدل رسالة واضحة مثل «قاعدة البيانات على إصدار 0004؛ تُرجى تطبيق الترحيلات 0005–0007».

### 6.4.1 قياس مُAxes: هل Readiness يمرّ على قاعدة 0004؟

`UNVERIFIED` (لم يُشغَّل خادم على قاعدة 0004 خالصة في هذه الجولة لتفادي البذرة «U» المموّهة؛ لكن الفحص الشجري: مسار `/api/v1/health` لا يشير إلى أي جدول من 0005–0007 ⇒ `INFERENCE` أن الجاهزية ستُبلّغ «ok»).

> **قرار مطلوب من المالك:** أضِف فحص إصدار المخطط إلى `/api/v1/health` (root) أو إلى مسار readiness منفصل، مع رسالة actionable. **لم يُطبَّق** (خارج نطاق التدقيق).

## 6.5 خلاصة المخاطر

| # | المخاطرة | الشدة | الحالة | المقترح (غير مطبَّق) |
|---|---|---|---|---|
| M-01 | لا فحص إصدار مخطط ⇒ 500 غامض على قاعدة قديمة | متوسطة | مفتوحة | `schema_version` في `company_settings` + فحص في readiness + رسالة ترحيل مطلوبة |
| M-02 | الترحيل الفاشل يترك قاعدة في حالة 0003 مع FK مكسورة (عطل مُدخَل) | منخفضة | سلوك موثّق | لا إجراء: الحالة نصف متّسقة ومكتشَفة عبر `foreign_key_check` |
| M-03 | «نسخة احتياطية تلقائية» بعد كل ترحيل (ذكرها الأداة) | منخفضة | `UNVERIFIED` | التحقق من موضع النسخة في المتجر المحلي عند أول ترحيل على قاعدة المطوّر |
| M-04 | الترحيلات 0005–0007 **غير قابلة للعكس** (إضافة فقط، بلا DOWN) | منخفضة | موثّق | لا يلزم تراجع: الترقية إضافة فقط، والتراجع = حذف الجداول الجديدة (يفقد سجلات الـIdempotency/الاستيراد فقط) |
