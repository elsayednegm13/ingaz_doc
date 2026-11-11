# 02 — إثبات تجاوز الفاعل القديم (Stale Actor) قبل/بعد الإصلاح

- **الأمر:** `EXPORTFLOW-W1-EVIDENCE-RECONCILIATION-W2-OWNER-GATE-20261027`
- **معرّف الجولة:** `W1P-20261027-bbd7f047`
- **التاريخ:** 2026-10-27
- **الخلاصة:** عُثر على **عطل منتج حقيقي** في ستة مسارات: جلسة فاعل كانت جذرًا لحظة التحميل، ثم سُحبت
  جذريتها (DENY) قبل تنفيذ الكتابة، كانت **تنجح** في الكتابة (`200/201`). بعد الإصلاح كل المسارات
  تُرجع `403 USER_NOT_AUTHORIZED` ولا يتغيّر الهدف.
- **النطاق:** Worker حقيقي + D1 محلي + HTTP حقيقي على منافذ loopback، جذور `.wrangler-safety-20261021-w1p-*`
  جديدة ومملوكة، بلا Git وبلا قاعدة مطور.

## 1. تعريف «الفاعل القديم» في هذا الاختبار

1. يُنشأ جذران (أو ثلاثة) فعّالان في قاعدة اصطناعية.
2. يسجّل الفاعل الدخول ويُحمَّل `Actor` الخاص به في الطلب (يحمل `users.manage` و`roles.manage`).
3. **قبل** وصول الكتابة إلى الخدمة، يُطبَّق `DENY users.manage` على الفاعل نفسه عبر API إداري آخر.
4. يُترك الطلب الأول يكمل بعد تأخير قراءة موجّه بالمفتاح (`W1_*_DELAY_MS` من config الجولة فقط).
5. يُقاس: رمز الاستجابة، `actorRoot` بعد الطلب، وحالة الهدف في قاعدة البيانات.

هذا يختبر **نافذة القراءة→الكتابة**، لا التعطيل البسيط: الفاعل ما زال يملك جلسة صالحة و`Actor` قديمًا،
لكن جذريته الفعلية في SQL = 0.

## 2. النتيجة قبل الإصلاح (RED)

الأدلة: `evidence/attempt-03-stale-roles-pre` … `attempt-08-stale-create-role-pre`.

| المسار | الاستجابة قبل | `actorRoot` | حالة الهدف قبل | الحكم |
|---|---:|---:|---|---|
| `POST /users/:id/roles` | **200** | 0 | الهدف صار `role-admin` (جذرًا) | **BYPASS** |
| `POST /users/:id/overrides` | **200** | 0 | أُضيف GRANT لـ`users.manage` و`roles.manage` | **BYPASS** |
| `POST /users/:id/active` | **200** | 0 | الهدف بقي فعّالًا بعد محاولة تعطيل | **BYPASS** |
| `POST /roles/:id/permissions` | **200** | 0 | أُضيف `users.manage`/`roles.manage` للدور | **BYPASS** |
| `POST /users` | **201** | 0 | `userCount=1`, `accountCount=1` (مستخدم نصف مبني) | **BYPASS** |
| `POST /roles` | **201** | 0 | `roleExists=true` بصلاحيات مختارة | **BYPASS** |

**لماذا حدث؟** الحارس في الخدمة كان يُقيَّم في JavaScript على `Actor` المحمّل في الطلب، والكتابة نفسها
لم تكن تحمل شرط جذرية الفاعل. لذلك سحب الصلاحية بعد التحميل لم يكن يوقف الكتابة.

## 3. الإصلاح — الشرط أصبح جزءًا من الكتابة

الملف: `server/services/users.ts` (الإصلاح المنتج الوحيد في هذه الجولة).

### 3.1 حارس SQL واحد

```ts
function actorRootGuardSql(alias = "actor"): string {
  return `EXISTS (SELECT 1 FROM user ${alias} WHERE ${alias}.id = ? AND ${effectiveRootCondition(alias)})`;
}
```

`effectiveRootCondition` هو نفسه المستخدم في `countRootAdmins` وفي حماية آخر جذر، فلا يمكن أن تنحرف
تعريفات «الجذر» عن بعضها.

### 3.2 مسبار أولًا، ثم إدراج، ثم حذف

كل دفعة كتابة تبدأ بـ:

```sql
SELECT EXISTS (SELECT 1 FROM user actor WHERE actor.id = ? AND <effectiveRootCondition>) AS is_root
```

- المسبار يحدد نتيجة المعاملة كاملة: إن كان `is_root=0` فالطلب `403` حتى لو لم تكتب أي جملة شيئًا.
- **الإدراج قبل الحذف**: لو حذف الفاعل دوره الإداري أولًا لفشل حارسه في الإدراج التالي؛ الترتيب الجديد
  يجعل «تخفيض الذات» يصل إلى `restoreIfLastRootRemoved` فيُعيد الأدوار ويُرجع `409 LAST_ADMIN`.
- `INSERT OR REPLACE` للتجاوزات يمنع تكرار المفتاح عند إعادة كتابة نفس GRANT/DENY.

### 3.3 مسارات مغطاة

| المسار | الحارس المطبق |
|---|---|
| تغيير أدوار مستخدم | دفعة واحدة: مسبار + إدراج + حذف بشرط `actorRootGuardSql()` |
| تغيير تجاوزات مستخدم | دفعة واحدة: مسبار + `INSERT OR REPLACE` + حذف بشرط الحارس |
| تفعيل/تعطيل مستخدم | `UPDATE user ... WHERE ... AND EXISTS (actor root)` داخل نفس الجملة |
| تغيير صلاحيات دور | دفعة واحدة: مسبار + إدراج + حذف بشرط الحارس |
| إنشاء مستخدم | `INSERT ... WHERE <guard>` للأدوار؛ فشل الحارس ⇒ `403` + تعويض يحذف الحساب النصف مبني |
| إنشاء دور | `INSERT INTO roles ... WHERE <guard>`؛ فشل الحارس ⇒ `403` + حذف الدور إن فشلت صلاحياته |

## 4. النتيجة بعد الإصلاح (GREEN)

الأدلة النهائية على المصدر النهائي: `evidence/attempt-22-stale-roles-final` …
`attempt-27-stale-create-role-final` (كل محاولة 12 فحصًا، `outcome=PASS`).

| المسار | الاستجابة بعد | رمز الخطأ | حالة الهدف بعد |
|---|---:|---|---|
| تغيير الأدوار | **403** | `USER_NOT_AUTHORIZED` | `targetRoot=0`، الأدوار `role-officer` فقط |
| التجاوزات | **403** | `USER_NOT_AUTHORIZED` | لا تجاوزات |
| التعطيل/التفعيل | **403** | `USER_NOT_AUTHORIZED` | `targetActive=0` كما كان |
| صلاحيات الدور | **403** | `USER_NOT_AUTHORIZED` | الصلاحيات الأصلية فقط |
| إنشاء مستخدم | **403** | `USER_NOT_AUTHORIZED` | `userCount=0`, `accountCount=0` (تعويض ناجح) |
| إنشاء دور | **403** | `USER_NOT_AUTHORIZED` | `roleExists=false` |

في كل المحاولات: `no-5xx`، `teardown-port-closed=true`، `teardown-process-gone=true`.

## 5. عطل جانبي اكتُشف وأُصلح أثناء الإصلاح (D3-11)

الترتيب الأول للإصلاح كان **حذفًا قبل إدراج**. هذا جعل تخفيض الذات (self-demotion) يحذف دور الفاعل
قبل أن يُقيَّم حارس الإدراج، فينكسر اختبار `D3-11` (`403` بدل `409`). أُصلح الترتيب إلى **إدراج قبل حذف**
وأُضيف مسبار `is_root` كأول جملة، فصار المسار يصل إلى `restoreIfLastRootRemoved` ويُرجع
`409 LAST_ADMIN` مع استعادة الأدوار.

| الدليل | النتيجة |
|---|---|
| `evidence/attempt-20-d3-11-post` | `D3-11` PASS |
| `evidence/attempt-21-d3-file-post` | ملف `d3.test.ts` كاملًا **13/13** PASS |
| `evidence/attempt-24-stale-active-final` | مسار الفاعل القديم ما زال `403` بعد إعادة الترتيب |

## 6. حدود الإثبات

1. **قاعدة واحدة ومثيل Worker واحد**؛ لا إثبات لسلوك D1 متعدد المناطق أو تزامن عمليات متعددة على
   نفس الصف خارج D1 batch.
2. الاختبار يعتمد على تأخير مُحقَن من **config الجولة**، وليس من عميل HTTP؛ لا يمكن للمهاجم اختياره.
3. الإصلاح يعتمد على دلالة `D1Database.batch` كمعاملة واحدة؛ هذه دلالة Cloudflare المعلنة، ولم تُختبر
   ضد D1 بعيدة في هذه الجولة.
4. لا يُثبت هذا التقرير أن كل مسار كتابة آخر في التطبيق محمي؛ الجرد يقتصر على مسارات المستخدمين
   والأدوار المذكورة أعلاه.
5. `PRAGMA integrity_check` غير مُتحقق: `NOT_VERIFIED_PRAGMA_INTEGRITY_CHECK`.

```text
STALE_ACTOR_PATHS_TESTED: 6
STALE_ACTOR_PATHS_BYPASSED_PRE_FIX: 6
STALE_ACTOR_PATHS_REFUSED_POST_FIX: 6
STALE_ACTOR_ERROR_CODE: USER_NOT_AUTHORIZED
STALE_ACTOR_TARGET_MUTATED_POST_FIX: NO
D3_11_REGRESSION: FIXED
D3_FILE_TESTS: 13/13 PASS
PRAGMA_INTEGRITY_CHECK: NOT_VERIFIED_PRAGMA_INTEGRITY_CHECK
STOP
```
