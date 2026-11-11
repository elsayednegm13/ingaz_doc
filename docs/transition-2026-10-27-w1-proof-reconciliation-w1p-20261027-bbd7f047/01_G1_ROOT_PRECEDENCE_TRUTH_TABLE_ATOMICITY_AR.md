# 01 — أسبقية شرط الجذر الفعلي وجدول الحقيقة وذرّية آخر جذر

- **الأمر:** `EXPORTFLOW-W1-EVIDENCE-RECONCILIATION-W2-OWNER-GATE-20261027`
- **معرّف الجولة:** `W1P-20261027-bbd7f047`
- **التاريخ:** 2026-10-27
- **السؤال الحاكم:** هل التعبير الإنتاجي فعلًا `((ROLE OR GRANT) AND NOT DENY AND ACTIVE)`، أم أن
  الأسبقية الفعلية مختلفة؟ وهل حماية آخر جذر ذرّية داخل الكتابة نفسها؟
- **الجواب:** الأسبقية الفعلية **صحيحة ومقوّسة**: القوس الخارجي يغلّف التعبير كاملًا، والمستوى الأعلى
  `AND` فقط. الحماية ذرّية: شرط «يوجد جذر آخر» وشرط «الفاعل جذر» داخل جملة `UPDATE` نفسها.

## 1. التعبير الفعلي من المصدر (لا نسخة الهارنس)

المصدر: `server/services/users.ts` — `effectiveRootCondition(alias)`.

```ts
const granted = ROOT_PERMISSIONS.map(
  (key) => `EXISTS (SELECT 1 FROM (
      SELECT rp.permission_key AS permission_key
        FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id
       WHERE ur.user_id = ${alias}.id
      UNION
      SELECT o.permission_key AS permission_key
        FROM user_permission_overrides o
       WHERE o.user_id = ${alias}.id AND o.effect = 'GRANT'
    ) g WHERE g.permission_key = '${key}')`,
).join("\n          AND ");
const denied = ROOT_PERMISSIONS.map(
  (key) => `NOT EXISTS (SELECT 1 FROM user_permission_overrides d
                WHERE d.user_id = ${alias}.id AND d.effect = 'DENY' AND d.permission_key = '${key}')`,
).join("\n          AND ");
return `(${alias}.is_active = 1
        AND ${granted}
        AND ${denied})`;
```

مع `ROOT_PERMISSIONS = ["users.manage", "roles.manage"]`، التعبير المولّد فعليًا هو:

```sql
(u.is_active = 1
 AND EXISTS (SELECT 1 FROM (
        SELECT rp.permission_key FROM user_roles ur
          JOIN role_permissions rp ON rp.role_id = ur.role_id
         WHERE ur.user_id = u.id
        UNION
        SELECT o.permission_key FROM user_permission_overrides o
         WHERE o.user_id = u.id AND o.effect = 'GRANT'
      ) g WHERE g.permission_key = 'users.manage')
 AND EXISTS (SELECT 1 FROM ( … نفس الاتحاد … ) g WHERE g.permission_key = 'roles.manage')
 AND NOT EXISTS (SELECT 1 FROM user_permission_overrides d
                  WHERE d.user_id = u.id AND d.effect = 'DENY' AND d.permission_key = 'users.manage')
 AND NOT EXISTS (SELECT 1 FROM user_permission_overrides d
                  WHERE d.user_id = u.id AND d.effect = 'DENY' AND d.permission_key = 'roles.manage'))
```

### 1.1 قياس بنيوي على النص المولّد

سجّله المسبار `proof-sql-top-level-is-and-only` في `evidence/attempt-01-truth/result.json`:

| القياس | القيمة |
|---|---|
| يبدأ بـ`(` وينتهي بـ`)` | نعم |
| عدد `EXISTS` (منح) | 2 |
| عدد `NOT EXISTS` (منع) | 2 |
| عدد `UNION` | 2 (واحد داخل كل `EXISTS`) |
| وجود `OR` في المستوى الأعلى | **لا** |

**الاستنتاج:** الأسبقية ليست مسألة «AND أقوى من OR» هنا، لأن `OR` لم يُستخدم أصلًا في المستوى الأعلى.
المنح يُحسب بـ`UNION` داخل subquery ثم يُختبر بـ`EXISTS` مستقل لكل مفتاح، والمنع بـ`NOT EXISTS` مستقل
لكل مفتاح. النتيجة مطابقة لدلالة `resolveEffectivePermissions`: **المنح من الدور أو من GRANT، ثم يُزال
كل DENY، ثم يُشترط `is_active`**.

### 1.2 هل كان تقرير W1-FINAL خاطئًا؟

تقرير `w1f-20261026-0792a8/01_...AR.md` عرض pseudo-SQL بهذا الشكل:

```sql
EXISTS (SELECT 1 FROM user_roles ur JOIN roles r … AND r.key = 'administrator')
OR EXISTS (SELECT 1 … o.permission_key = 'users.manage' AND o.effect = 'GRANT')
AND NOT EXISTS (… DENY …)
AND <alias>.is_active = 1
```

هذا النص **غير مطابق للمصدر** بثلاثة أوجه:

1. استخدم `r.key = 'administrator'` بدل `role_permissions`، أي ربط الجذر باسم الدور لا بصلاحياته.
2. غطّى `users.manage` فقط ولم يذكر `roles.manage` رغم أن الكود يشترطهما معًا.
3. لم يضع القوس الخارجي، فصار يُقرأ بصريًا كأنه `ROLE OR (GRANT AND …)`.

**التصنيف:** عيب **توثيق** في تقرير سابق، وليس عيبًا في المصدر. المصدر الحالي (والسابق في هذه النقطة)
كان مقوّسًا صحيحًا. أُصلح الوصف في هذه الجولة، ولم يُعدَّل أي ملف تقرير سابق.

## 2. جدول الحقيقة — 13 حالة على التعبير الإنتاجي

التشغيل يتم عبر مسبار اختباري للقراءة فقط (`/__w1/root-flags`) يستورد
`effectiveRootCondition` و`countRootAdmins` من **المصدر الإنتاجي**، وليس نسخة مكتوبة في الهارنس.
الحالات تُزرع مباشرة في D1 الاصطناعي، ثم تُقارن `actual` بـ`expected` وبمجموعة الجذور الفعلية.

| # | ROLE | GRANT | DENY | ACTIVE | متوقع | قبل (attempt-01) | بعد (attempt-15) |
|---|---|---|---|---|---|---|---|
| 01 | 0 | 0 | 0 | 1 | 0 | 0 ✅ | 0 ✅ |
| 02 | 1 | 0 | 0 | 1 | 1 | 1 ✅ | 1 ✅ |
| 03 | 0 | 1 (both keys) | 0 | 1 | 1 | 1 ✅ | 1 ✅ |
| 04 | 1 | 1 (redundant) | 0 | 1 | 1 | 1 ✅ | 1 ✅ |
| 05 | 1 | 0 | users.manage | 1 | 0 | 0 ✅ | 0 ✅ |
| 06 | 0 | users.manage | roles.manage | 1 | 0 | 0 ✅ | 0 ✅ |
| 07 | 1 | 0 | 0 | 0 | 0 | 0 ✅ | 0 ✅ |
| 08 | 0 | 1 | 0 | 0 | 0 | 0 ✅ | 0 ✅ |
| 09 | 1 | users.manage | roles.manage | 0 | 0 | 0 ✅ | 0 ✅ |
| 10 | 0 | 0 | users.manage | 1 | 0 | 0 ✅ | 0 ✅ |
| 11 | 1 | 0 | roles.manage | 1 | 0 | 0 ✅ | 0 ✅ |
| 12 | 0 | users.manage فقط | 0 | 1 | 0 | 0 ✅ | 0 ✅ |
| 13 | 1 | users.manage | roles.manage | 1 | 0 | 0 ✅ | 0 ✅ |

**ملاحظات:**

- الحالات 01–10 هي الجدول المطلوب (بما فيه الحالات الحدّية: DENY على مفتاح واحد، تعطيل الحساب،
  GRANT لمفتاح واحد فقط).
- الحالات 11–13 إضافية تثبت أن **كلا** مفتاحي الجذر مطلوبان، وأن DENY على `roles.manage` وحده يكفي
  لإسقاط الجذرية.
- `proof-truth-root-set` قارن مجموعة المعرّفات الفعلية بالمتوقعة: **4 = 4** في التشغيلين، و`count=4`
  مطابق.
- لم تُسجَّل أي استجابة `5xx`.

الأدلة: `evidence/attempt-01-truth/result.json` (قبل إصلاح الفاعل القديم) و
`evidence/attempt-15-truth-post/result.json` (بعد الإصلاح). وأُعيد التشغيل على المصدر النهائي في
`evidence/attempt-28-truth-final`: **PASS، 23 فحصًا**، ونفس الحالات 13/13 ونفس `root-set` 4/4.

### 2.1 إعادة التشغيل النهائية

| الدليل | الوضع | الفحوص | الحكم |
|---|---|---:|---|
| `attempt-28-truth-final` | جدول الحقيقة على المصدر النهائي | 23 | **PASS** |
| `attempt-29-atomic-final` | الذرّية على المصدر النهائي | 14 | **PASS** |
| `attempt-30-g1-full-final` | G1 الكامل (سباقات + cross-actor) | 122 | **PASS** |

`attempt-30` سجّل: 12 سباقًا، 8 حالات cross-actor، `zeroObserved=0`، `bothSucceeded=0`،
`overlapFailures=0`، و`no-5xx`.

## 3. ذرّية حماية آخر جذر عبر الـAPI الحقيقي

### 3.1 الجملة الفعلية

```sql
UPDATE user
   SET is_active = 0, disabled_at = ?, updated_at = ?
 WHERE id = ?
   AND (
     NOT <effectiveRootCondition("user")>
     OR EXISTS (SELECT 1 FROM user other
                 WHERE other.id != user.id AND <effectiveRootCondition("other")>)
   )
   AND EXISTS (SELECT 1 FROM user actor
                WHERE actor.id = ? AND <effectiveRootCondition("actor")>)
```

ثلاثة شروط في **جملة واحدة**:

1. الهدف ليس جذرًا فعليًا، **أو** يوجد جذر فعلي آخر.
2. الفاعل نفسه ما زال جذرًا فعليًا (يُعاد فحصه في SQL، لا في JavaScript).
3. لا توجد نافذة بين «قرأت أنني جذر» و«كتبت التعطيل».

عند فشل التحديث يقرأ الكود حالة الفاعل فقط **لاختيار رمز الاستجابة**: `403` لفاعل قديم،
`409 LAST_ADMIN` لمحاولة حقيقية لإزالة آخر جذر.

### 3.2 السيناريوهات والنتائج

الأدلة: `evidence/attempt-02-atomic/result.json` (قبل) و`evidence/attempt-16-atomic-post/result.json`
(بعد) — 14 فحصًا لكل منهما، `outcome=PASS` في الحالتين.

| السيناريو | المتوقع | قبل | بعد |
|---|---|---|---|
| جذر واحد فقط يعطّل نفسه | `409 LAST_ADMIN`، يبقى جذرًا واحدًا | `409` / `rootsAfter=1` ✅ | `409` / `rootsAfter=1` ✅ |
| تعطيل جذر حصل على جذريته من GRANT فقط (مع وجود جذر آخر) | `200`، ينقص العدد | `200` / `roots=1` / `active=0` ✅ | مطابق ✅ |
| تعطيل مستخدم غير جذر | `200` | `200` / `roots=1` ✅ | مطابق ✅ |
| تفعيل جذر معطّل (دور + ACTIVE=0) | `200`، يعود الجذر | `200` / `roots=2` / `active=1` ✅ | مطابق ✅ |
| تعطيله مرة أخرى | `200`، يعود العدد إلى 1 | `200` / `roots=1` ✅ | مطابق ✅ |

الحالة الثانية مهمة: تعطيل جذر حصل على جذريته من **GRANT** (لا من دور `administrator`) يجب أن يُسمح به
طالما بقي جذر آخر — وهذا يثبت أن الحماية مبنية على «الجذر الفعلي» لا على اسم الدور.

## 4. حدود الإثبات

1. الجدول يعمل على D1 محلي (SQLite)؛ لم يُختبر على D1 بعيدة.
2. التزامن الحقيقي (طلبان متوازيان) مُغطّى في G1 الكامل (`attempt-17` / `attempt-30`) وليس في هذا
   التقرير.
3. لا إثبات `PRAGMA integrity_check`: الحالة `NOT_VERIFIED_PRAGMA_INTEGRITY_CHECK`.
4. فحص FK/orphans مفصول عن فحص النزاهة، ولا يُستنتج من نجاح الجدول.

```text
EFFECTIVE_ROOT_EXPRESSION: (ACTIVE=1 AND GRANTED(users.manage) AND GRANTED(roles.manage) AND NOT DENIED(users.manage) AND NOT DENIED(roles.manage))
GRANTED(key): EXISTS(key IN (ROLE_PERMISSIONS UNION GRANT_OVERRIDES))
TOP_LEVEL_OPERATOR: AND
OUTER_PARENTHESES: PRESENT
TRUTH_TABLE_CASES: 13
TRUTH_TABLE_RESULT: 13/13 PASS (PRE, POST, FINAL)
FINAL_RERUN: attempt-28 PASS 23; attempt-29 PASS 14; attempt-30 PASS 122
LAST_ROOT_SELF_DISABLE: 409 LAST_ADMIN
GRANT_ONLY_ROOT_DEACTIVATION: 200 ALLOWED WITH ANOTHER ROOT
INACTIVE_ROLE_ROOT_ACTIVATION: 200
ATOMICITY_MECHANISM: SINGLE GUARDED UPDATE
PRIOR_REPORT_01_PSEUDO_SQL: DOCUMENTATION_DEFECT_NOT_SOURCE_DEFECT
PRAGMA_INTEGRITY_CHECK: NOT_VERIFIED_PRAGMA_INTEGRITY_CHECK
STOP
```
