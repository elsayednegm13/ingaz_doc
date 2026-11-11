# 04 — الفجوات GAP-01..15 وقرارات العقود

## 1. الجدول الجامع

| الفجوة | الوصف | الخطورة | الحالة | الدليل/الاختبار | المتبقي |
|---|---|---|---|---|---|
| **GAP-01** | الإغلاق الطبيعي كان يسمح بـ4/5 إذا اكتمل مسارا المستندات والبضائع | عالية | **مُغلقة** | W1-01..04 | OD-09 يبقى قرار المالك |
| **GAP-02** | نسخة مستند جديدة كانت ترث `APPROVED` من السابقة | عالية | **مُغلقة** | W1-07, W1-08 | — |
| **GAP-03** | حذف متطلب مستند بين الفحص والحذف (TOCTOU) + فقدان النسخ | متوسطة | **مُغلقة** | W1-09..11 | — |
| **GAP-04** | تأكيد حجز بلا `UCR` | متوسطة | **مُغلقة** | W1-12, W1-13 | — |
| **GAP-05** | خفض `expected_containers` يخفض سقف الإغلاق | عالية | **مُغلقة دفاعيًا** | W1-05, W1-06 | سياسة تغيير العدد ← OD-12/W3 |
| **GAP-06** | لا سجل إصدارات لتعديلات الحجز (`booking_versions`) | متوسطة | **مؤجَّلة** | — | W3 |
| **GAP-07** | `reports.view_all` غير قابل للفصل عن `reports.view` | متوسطة | **BLOCKED_SCHEMA** | — | ترحيل 0009 + تفويض |
| **GAP-08** | حماية آخر مدير جذر كانت «فحص ثم تنفيذ» | عالية | **مُغلقة لمسار التعطيل** | W1-14..16 | سباق الأدوار/الصلاحيات P2 |
| **GAP-09** | فشل تسجيل حادثة التعويض كان يُبتلع | عالية | **مُغلقة** | W1-17, W1-18 | — |
| **GAP-10** | `0005` يستخدم `ON DELETE CASCADE` على شاهد الـidempotency | متوسطة | **مسودة مقترحة فقط** | — | ترحيل إضافي + تفويض |
| **GAP-11** | بصمة النطاق تعتمد على `pathname + search` فقط | منخفضة | **P2 موثَّق** | — | لا تغيير في الدلالات |
| **GAP-12** | بعض نقاط الكتابة لا تفرض `Idempotency-Key` | منخفضة | **P2 موثَّق** | — | لا تغيير في الدلالات |
| **GAP-13** | دورة حياة الفاتورة/الاعتماد بلا آلة حالة كاملة | متوسطة | **مؤجَّلة** | — | W3 |
| **GAP-14** | سلسلة أسرار E2E: `.env` من جذر المشروع + Wrangler بلا `--config` | عالية | **مُغلقة** | فحص مصدري + G2 | — |
| **GAP-15** | Playwright يورّث `process.env` كاملًا للخادم | عالية | **مُغلقة** | فحص مصدري + G2 | — |

### 1.1 الإحصاء

| الحالة | العدد |
|---|---|
| مُغلقة | 9 (01, 02, 03, 04, 05, 08, 09, 14, 15) |
| مؤجَّلة | 2 (06, 13) |
| محجوبة بنيويًا | 1 (07) |
| مسودة مقترحة | 1 (10) |
| P2 موثَّق | 2 (11, 12) |

> ملاحظة: GAP-05 «مُغلقة دفاعيًا» لأن الإصلاح يمنع الاستغلال، لكن **سياسة** تغيير عدد الحاويات بعد التأكيد لم يُحسم بعد (OD-12).

---

## 2. تفصيل الإصلاحات الحرجة

### GAP-01 — سقف الإغلاق

**قبل:** كان `canCompleteCase` يعتمد على `goodsTrackComplete` الذي يستثني الحاويات الملغاة، ثم يعلن النجاح إذا اكتمل مسار المستندات والبضائع. النتيجة: حالة بـ5 حاويات متوقعة، 4 مسلَّمة وواحدة ملغاة، تُغلق بنجاح.

**بعد:** شرط صريح قبل أي نجاح:

```ts
if (input.expectedContainerCount > 0 && input.deliveredContainerCount < input.expectedContainerCount) {
  return { ok: false, code: "CONTAINERS_NOT_ALL_DELIVERED", ... };
}
```

**لماذا قبل النجاح المبكر؟** لأن `goodsTrackComplete` يعيد `true` عندما تكون كل الحاويات غير الملغاة مسلَّمة؛ وضعه بعد `if (docsDone && goodsDone)` كان سيجعل الفحص ميتًا.

---

### GAP-05 — لا يخفض العميل السقف

```ts
const activeContainerCount = containers.filter((c) => c.status !== "CANCELLED").length;
const expectedContainerCount = Math.max(booking?.expected_containers ?? 0, activeContainerCount);
```

**الأثر:** تعديل `expected_containers` إلى رقم أقل من الفتحات الفعلية لا يسمح بإغلاق مبكر. سياسة «هل يجوز تعديل العدد أصلًا؟» تُركت لـOD-12.

---

### GAP-08 — الحماية الذرية

```sql
UPDATE user SET is_active = 0, updated_at = ?
WHERE id = ?
  AND EXISTS (
    SELECT 1 FROM user u2
    WHERE u2.id != user.id
      AND u2.is_active = 1
      AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id
                  WHERE ur.user_id = u2.id AND rp.permission_key = 'users.manage')
      AND EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_id = ur.role_id
                  WHERE ur.user_id = u2.id AND rp.permission_key = 'roles.manage')
  )
```

ثم:

```ts
if ((result.meta.changes ?? 0) === 0) {
  throw errors.conflict("The last active administrator cannot be removed or disabled.", "LAST_ADMIN");
}
```

**الاختبار W1-16:** ثلاثة تعطيلات متزامنة ⇒ 2 نجاح + 1 رفض + مدير جذر فعّال واحد. النتيجة ثابتة مهما كان الترتيب.

---

### GAP-09 — لا ابتلاع لفشل الحوادث

```ts
export async function recordCompensationIncident(...): Promise<{ correlationId: string; persisted: boolean }>
```

عند فشل الإدراج: `persisted: false` + `console.error` + إرجاع `correlationId`، ويظهر ذلك في الاستجابة عبر `incidentPersisted`.

---

## 3. قرارات العقود (Owner Decisions)

| المعرّف | الموضوع | الحالة | ما نُفِّذ | ما لم يُنفَّذ |
|---|---|---|---|---|
| **OD-08** | حذف أم أرشفة العملاء/الحالات | **BLOCKED_CONTRACT** | لا شيء | لم تُفترض سياسة، ولم يُغيَّر سلوك الحذف |
| **OD-09** | سياسة الإغلاق الاستثنائي | **BLOCKED_CONTRACT** | بقي السلوك القائم: استثناء بشرط `export_cases.close` + سبب | لم يُوسَّع النطاق، ولم تُخترع قواعد جديدة |
| **OD-12** | سياسة تغيير عدد الحاويات بعد التأكيد | **مؤجَّلة إلى W3** | حماية دفاعية `max(...)` | لم تُمنع الزيادة/النقصان تشغيليًا |
| **OD-06/OD-13** | إصدارات الحجز ودورة الفاتورة | مؤجَّلة | لا شيء | W3 |

**قاعدة الالتزام:** لم يُخترع أي قرار تجاري، ولم يُترجم أي سؤال مفتوح إلى كود يبدو وكأنه حسمه.

---

## 4. مسودات مقترحة (غير منفَّذة وغير مأذونة)

### 4.1 مسودة `0009` — فصل صلاحية التقارير (GAP-07)

```sql
-- PROPOSAL ONLY — DO NOT APPLY
INSERT INTO permissions (key, description) VALUES ('reports.view_all', 'View all reports across cases');
INSERT INTO role_permissions (role_id, permission_key)
  SELECT 'role-admin', 'reports.view_all';
```

**ما تحتاجه قبل التنفيذ:** تفويض صريح بإنشاء ترحيل جديد + تحديد الأدوار المستهدفة (قرار مالك) + تحديث `requirePermission` في نقاط التقارير + اختبارات.

### 4.2 مسودة `0010` — إزالة `CASCADE` من شاهد الـidempotency (GAP-10)

الفكرة: إعادة بناء الجدول المتأثر بعلاقة `RESTRICT`/`SET NULL` بدل `CASCADE`، حتى لا يُمحى الشاهد عند حذف الكيان المرتبط.

**ما تحتاجه:** تحليل أثر على البيانات القائمة + قرار OD-08 (لأن الحذف نفسه قد يتغير) + تفويض.

**الحالة:** `NOT_RUN` — لم يُنشأ أي ملف ترحيل.

---

## 5. البند الوحيد الذي لا يمكن إغلاقه بالكود

`GAP-07` ليس نقصًا في التنفيذ، بل **نقص في المخطط**. أي محاولة «إغلاقه» دون ترحيل ستكون إما:

- صلاحية وهمية في الكود لا وجود لها في `permissions` ⇒ تفشل دائمًا، أو
- تجاوزًا لفحص الصلاحيات ⇒ ثغرة أمنية.

لذلك أُبقي مفتوحًا بتصنيف `BLOCKED_SCHEMA`، وهو التصنيف الصحيح.
