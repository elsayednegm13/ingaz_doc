# 02 — G2: صلاحية `reports.view_all` والترحيل `0009`

- **البوابة:** `G2` — `REPORTS_VIEW_ALL_PERMISSION` + `MIGRATION_0009_LOCAL_POPULATED`
- **الحكم:** `PASS` بدليلين منفصلين: سلوك HTTP حقيقي، وترحيل مُطبَّق على قاعدة محلية مأهولة.
- **الترحيل:** `drizzle/migrations/0009_reports_view_all.sql` — إضافي فقط، افتراضي المنع.
- **`0010`:** غير مُنشأ وغير مُطبَّق (تحليل فقط في التقرير `03`).

## 1. المشكلة قبل الإصلاح

كانت منافذ التقارير — `/reports/overview`، `/reports/delays`، `/exports/csv` — تستخدم نطاق
`export_cases.view_all` التشغيلي. أي موظف عمليات يملك رؤية كل الحالات تشغيليًا كان يحصل
تلقائيًا على **كل** التقارير، بلا صلاحية مستقلة. هذا توسع صلاحيات ضمني:

- لا يمكن منح «رؤية كل التقارير» لشخص واحد دون منحه رؤية كل الحالات التشغيلية.
- ولا يمكن سحب رؤية التقارير الشاملة دون سحب الرؤية التشغيلية.
- الصلاحية غير موجودة في كتالوج الصلاحيات أصلًا، فلا يمكن تدقيقها.

كما كان `/reports/delays` يفشل بـ`500` بسبب:

1. عمود `status` غامض في استعلام مشترك (`SQLITE_ERROR: ambiguous column name: status`).
2. استعلام البنك يفتقد `JOIN export_cases c` مع أنه يشير إلى أعمدتها.

## 2. التصميم بعد الإصلاح

### 2.1 صلاحية مستقلة

`reports.view_all` أصبحت صلاحية مستقلة في `shared/permissions.ts`، ومفصولة تمامًا عن
`export_cases.view_all`:

| النطاق | يُستخدم في | الشرط |
|---|---|---|
| `caseVisibilitySql` | `/dashboard` وشاشات الحالات | ملكية/إسناد أو `export_cases.view_all` |
| `reportVisibilitySql` | `/reports/overview`، `/reports/delays`، `/exports/csv` | كل الحالات فقط مع `reports.view_all`، وإلا ملك/مسند |

قاعدة صريحة: **لا تُشتق `reports.view_all` من `export_cases.view_all`، ولا العكس.**
`/reports/overview` يتطلب أيضًا `reports.view` الأساسية، فلا تكفي `reports.view_all` وحدها
لدخول صفحة التقارير.

`/dashboard` بقي على `caseVisibilitySql` عمدًا: لوحة التشغيل ليست تقريرًا، ومن يملك رؤية
كل الحالات تشغيليًا يجب أن يراها هناك. الدليل يوضح هذا الفرق: موظف العمليات يرى 8 حالات
في اللوحة، و5 فقط في التقارير.

### 2.2 `0009` — إضافي وافتراضي المنع

```sql
INSERT OR IGNORE INTO permissions (key, description)
VALUES ('reports.view_all', 'View and export every export case in reports, regardless of assignment');

INSERT OR IGNORE INTO role_permissions (role_id, permission_key)
SELECT r.id, 'reports.view_all'
  FROM roles r
 WHERE r.key = 'administrator';
```

| الخاصية | القيمة |
|---|---|
| نوع التغيير | صفّا كتالوج فقط؛ لا جدول جديد، لا عمود، لا إعادة بناء |
| المنح | `role-admin` فقط، مطابقةً `ROLE_TEMPLATES.administrator = PERMISSIONS` |
| `operations_manager` | **لا منح** — قرار مالك صريح، فتبقى التقارير مقيدة افتراضيًا |
| التكرار | `INSERT OR IGNORE` — إعادة التطبيق لا تغيّر شيئًا |
| الحذف/التدمير | لا يوجد `DELETE` ولا `DROP` ولا `ALTER` |
| القاعدة الافتراضية | المنع: من لا يملك المفتاح لا يرى إلا ملكه/مسنده |

عدم منح `operations_manager` مقصود: كان يملك `export_cases.view_all` تشغيليًا، وبعد الفصل
يفقد التقارير الشاملة **حتى يُمنح المفتاح صراحةً**. هذا هو معنى افتراضي المنع.

## 3. الأدلة قبل الإصلاح

`attempt-08-g2-prefix-reports-scope` — **FAIL** (23 فحصًا، 8 حالات فشل):

| الفحص | النتيجة |
|---|---|
| `g2-ops-overview-scoped` | `total=8` والمتوقع 5 |
| `g2-ops-csv-scoped` | `rows=8` والمتوقع 5 |
| `g2-ops-delays-scoped` | `docs=-1` (أي `500`) بدل 15 |
| `g2-grant-reports-view-all` | `422 VALIDATION_ERROR` — المفتاح غير موجود |
| `g2-permission-catalog-row` | `0` |
| `g2-administrator-granted` | `0` |
| `no-5xx` | `5xx=2` (`g2-delays-admin`, `g2-delays-ops`) |

هذا أثبت ثلاث حقائق دفعة واحدة: النطاق خاطئ، والصلاحية غير موجودة، واستعلام التأخير معطوب.

## 4. المسار التكراري (محفوظ بالكامل)

| المحاولة | النتيجة | سبب الفشل |
|---|---|---|
| `attempt-09` | FAIL | الإصلاح الأول أضاف النطاق لكن الخدمة ظلّت ترجع إلى `export_cases.view_all` التشغيلي: 8/8 في العرض وCSV، و24 بدل 15 مستندًا. |
| `attempt-10` | FAIL | العرض وCSV صارا 5؛ بقي `/reports/delays` بـ`500` بسبب `JOIN export_cases c` الناقص في استعلام البنك. |
| `attempt-11` | **PASS** | 32 فحصًا، صفر فشل، صفر `5xx`. |

لم يُستبدل أي سجل: `attempt-09` و`attempt-10` يبقيان دليلًا على أن الإصلاح لم ينجح من أول مرة.

## 5. الدليل النهائي — `attempt-11`

### 5.1 موظف العمليات بلا `reports.view_all`

| المنفذ | النتيجة | المتوقع |
|---|---|---|
| `/reports/overview` | 5 من 8 | 5 (ملكه/مسنده) |
| `/reports/overview?scope=all` | 5 | تجاهل المعامل بلا صلاحية |
| `/reports/delays` | 15 مستندًا | 15 مما يملكه، لا 24 |
| `/exports/csv` | 5 صفوف | 5 |
| `/dashboard` | 8 حالات | 8 (نطاق تشغيلي منفصل) |

### 5.2 بعد منح `reports.view_all` للموظف

| المنفذ | النتيجة |
|---|---|
| `PATCH /api/v1/users/:id/permissions` (منح) | `200` |
| `/reports/overview` | 8 من 8 |
| `/reports/delays` | 24 مستندًا |
| `/exports/csv` | 8 صفوف |

### 5.3 بعد سحب المنح (DENY أو إزالة)

| المنفذ | النتيجة |
|---|---|
| `/reports/overview` | 5 من 8 |
| `/reports/delays` | 15 |
| `/exports/csv` | 5 |

### 5.4 كتالوج الصلاحيات

| القياس | القيمة |
|---|---|
| صف `reports.view_all` في الكتالوج | 1 |
| منح `administrator` | 1 |
| منح `operations_manager` | **0** |

## 6. دليل الترحيل `0009` على قاعدة مأهولة

### 6.1 المحاولة الأولى — `attempt-12` (FAIL محفوظ)

فشلت لسبب واحد فقط: الفحص استخدم `PRAGMA integrity_check`، وD1 المحلية أعادت
`SQLITE_AUTH` لهذا الـPRAGMA. لم يكن فشل ترحيل: `apply-0009` نفسه نجح. المحاولة محفوظة
بكل سجلاتها، واستُبدل الفحص غير المتاح بفحصين متاحين ومكافئين وظيفيًا:

- `PRAGMA foreign_key_check` (فارغ = لا كسر مراجع).
- فحص صريح لصفوف `role_permissions` اليتيمة.

### 6.2 المحاولة الثانية — `attempt-13` (PASS، 23 فحصًا)

| الفحص | النتيجة |
|---|---|
| تطبيق `0001..0008` | `exit=0` |
| تعبئة بيانات أعمال (مستخدمون، أدوار، حالات، فاتورة، مفتاح idempotency) | `exit=0` |
| قبل `0009`: لا يوجد `reports.view_all` | `[]` |
| قبل `0009`: `foreign_key_check` | `rows=0` |
| تطبيق `0009` | `exit=0` |
| الملف المطبق | `0009` وحده فوق `0001..0008` |
| صفوف الأعمال بعد الترحيل | لم تتغير |
| صف الكتالوج | `1` |
| منح administrator | `admin=1 any=1` |
| الجهة الوحيدة الممنوحة | `[{"key":"administrator","n":1}]` |
| `permissions` | `37 → 38` |
| `role_permissions` | `96 → 97` |
| `foreign_key_check` بعد | `rows=0` |
| منح يتيمة | `orphans=0` |
| **بصمة المخطط** | `790b9d8b0cdd` قبل وبعد، `162` كائنًا — **متطابقة** |
| إعادة تطبيق `0009` | `exit=0` |
| إعادة التطبيق | لا تغيير في أي عدّاد |
| تعطيل `0009` صناعيًا (فشل محقون) | `exit=1` |
| الصف اليتيم بعد الفشل | `0` |
| منح غير مقصود بعد الفشل | `permissionRows=0`, `anyGrant=0`, `orphanGrant=0` |
| الاسترداد بعد الفشل | `permissionRows=1`, `adminGrant=1` |

**لماذا بصمة المخطط متطابقة؟** لأن `0009` لا ينشئ كائنات schema؛ يضيف صفوف كتالوج ومنحًا
فقط. لذلك لا يتغير عدد الجداول/الفهارس/الـtriggers، ولا تحتاج إعادة بناء جدول.

## 7. التنظيف

| العنصر | الحالة |
|---|---|
| بورتات 44025–44028 | مغلقة |
| عملية Worker لكل محاولة | اُنهيت بـ`taskkill /T /F` على PID مملوك، و`portClosed=true`, `processGone=true` |
| جذور G2 | محفوظة كدليل: `g2-pre`، `g2-post`، `g2-post2`، `g2-post3` |
| قاعدة الترحيل | جذور منفصلة `mig` و`mig2`، لم تُلمس قاعدة المطور |

## 8. ما لا يثبته هذا الدليل

1. لم يُطبَّق `0009` على قاعدة المطور ولا remote ولا staging ولا production؛ كل شيء محلي ملك الجولة.
2. لا يثبت سلوك D1 البعيدة تجاه `INSERT OR IGNORE` تحت تزامن عالٍ.
3. لا يثبت أن كل منافذ التقارير المستقبلية ستستخدم `reportVisibilitySql`؛ يثبت المنافذ الثلاثة الحالية.
4. لا يثبت قرار منح `operations_manager`؛ هذا قرار مالك لم يُتخذ، والافتراضي هو المنع.

```text
GATE: G2
RESULT: PASS
REPORTS_VIEW_ALL_PERMISSION: PASS
REPORT_PORTS_SCOPED: 3/3
OPERATIONAL_VISIBILITY_DECOUPLED: YES
MIGRATION_0009_LOCAL_POPULATED: PASS
PERMISSIONS: 37 -> 38
ROLE_PERMISSIONS: 96 -> 97
SCHEMA_DIGEST_UNCHANGED: YES
REAPPLY_IDEMPOTENT: YES
INDUCED_FAILURE_ROLLBACK: PASS
ADMIN_ONLY_GRANT: YES
OPERATIONS_MANAGER_GRANT: NO
DEVELOPER_D1_MIGRATION: NOT_AUTHORIZED_NOT_RUN
REMOTE_D1_MIGRATION: NOT_AUTHORIZED_NOT_RUN
STOP
```
