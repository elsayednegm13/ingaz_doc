# 12 — مصفوفة أعطال التعويض في المصادقة والـBootstrap (Auth/Bootstrap Compensation Fault Matrix)

**التدقيق:** ET-2026-10-20 · **المصدر:** `server/http/app.ts:258-309` (Bootstrap)، `server/http/app.ts:513-579` (إنشاء المستخدم)، `server/services/users.ts`
**الأدلة:** `evidence/runtime-probes.json`، `evidence/runtime-probes-2.json`

## 12.1 حدود المعاملات في التدقيق

| المعاملة | الحدود | ملاحظة |
|---|---|---|
| Bootstrap | (1) استهلاك السرّ، (2) إنشاء مستخدم Better Auth، (3) ربط الحساب credential، (4) ضبط `must_change_password`، (5) منح دور المدير، (6) كتابة سجل التدقيق | 6 عمليات منفصلة عبر **حدود معاملات** |
| إنشاء المستخدم | (1) `createUser`، (2) `linkAccount` + تحديث، (3) `setUserRoles` | 3 عمليات، مع تعويض عند الفشل |

## 12.2 AUTH-01 … AUTH-10

| # | السيناريو | Oracle | النتيجة | الحكم | الدليل |
|---|---|---|---|---|---|
| AUTH-01 | خطأ تحقّق قبل أي إدراج | صفوف `user` | 422 `VALIDATION_ERROR`؛ عدد المستخدمين **قبل=3 بعد=3** | **PASS** | `runtime-probes.json` |
| AUTH-02 | إنشاء المستخدم نجح، منح الدور فشل، التعويض نجح | صفوف `user`/`user_roles`/`account` | **لا يمكن حقن هذا الفشل** دون تعديل الشيفرة (لا خطّاف حقن لأخطاء `setUserRoles`) ⇒ `INCONCLUSIVE` (تحليل مصدر: `app.ts:560-577` يعوض بـbatch يحذف account/session/user_roles/overrides/preferences/user) | **INCONCLUSIVE** | `OBSERVED_SOURCE` |
| AUTH-03 | نجح التعويض أيضًا؟ أي فشل التعويض نفسه | detect orphan | **لا يوجد خطّاف**، ولا مراقبة، ولا مهمة إصلاح ⇒ **الحالة غير قابلة للكشف** | **FAIL** | تحليل مصدر |
| AUTH-04 | الدور مُنح، الرد ضاع، إعادة المحاولة بنفس المفتاح | صفوف `user` + `user_roles` | 201 ثم 201 بإعادة تشغيل؛ **حساب واحد** لمنحة دور واحدة | **PASS** | `runtime-probes.json` |
| AUTH-05 | Bootstrap بجسم غير صالح | `bootstrap_consumed` | 422؛ `bootstrap_consumed` يبقى **0** ⇒ السرّ **غير مستهلك** | **PASS** | ↑ |
| AUTH-06 | Bootstrap فشل بعد الاستهلاك | `bootstrap_consumed` + صفوف `user` | **لا يوجد خطّاف** لحقن الفشل بعد الاستهلاك ⇒ `INCONCLUSIVE`؛ تحليل المصدر: `app.ts:291-308` يعوّض بـbatch (يُحرّر السرّ ويحذف المستخدم الجزئي) | **INCONCLUSIVE** | `OBSERVED_SOURCE` |
| AUTH-07 | محاولتا Bootstrap متزامنتان | صفوف `user` | 409 + 409؛ مستخدم **واحد** | **PASS** | `runtime-probes.json` |
| AUTH-08 | إجبار تغيير كلمة المرور | رمز الحالة على مسار محمي | 403 `PASSWORD_CHANGE_REQUIRED` قبل وبعد `mustChangePassword=true`؛ بعد التغيير يعمل المسار | **PASS** | ↑ |
| AUTH-09 | تعطيل مستخدم ثم استخدام جلسته | رمز الحالة | 200 قبل ⇒ **401 SESSION_EXPIRED** بعد التعطيل؛ `is_active=0` | **PASS** | `runtime-probes-2.json` |
| AUTH-10 | أثر المحاولات في سجل التدقيق | صفوف `audit_log` | **19** صفًا لـ`entity_type='user'` محفوظة | **PASS** | ↑ |

## 12.3 AUTH-06: تحليل تفصيلي لمسار الفشل (OBSERVED_SOURCE)

```
POST /api/v1/auth/bootstrap
  ├─ تحقق من السرّ                                    app.ts:260
  ├─ تحقق من الجسم (بريد + طول كلمة المرور)          app.ts:262-265   ← قبل الاستهلاك
  ├─ UPDATE company_settings SET bootstrap_consumed=1  app.ts:266-269   ← استهلاك ذرّي
  │     (لو كانت القيمة 1 مسبقًا ⇒ 409 "Bootstrap is no longer available")
  ├─ ctx.internalAdapter.createUser                   app.ts:274-279
  ├─ ctx.password.hash                                 app.ts:280
  ├─ ctx.internalAdapter.linkAccount                  app.ts:281-286
  ├─ UPDATE user SET must_change_password=1           app.ts:287
  ├─ ensureAdminRole                                   app.ts:288
  ├─ writeAudit                                        app.ts:289
  └─ catch:
        batch[ UPDATE company_settings SET bootstrap_consumed=0,
               DELETE account, session, user_roles, user_permission_overrides,
                      user_preferences, user  (إن كان createdUserId) ]   app.ts:295-307
        ثم rethrow
```

**نقاط الضعف المحدَّدة:**

| # | النقطة | الأثر |
|---|---|---|
| W-1 | ensureAdminRole + writeAudit **خارج** الـbatch | إن فشل writeAudit بعد منح دور المدير ⇒ المستخدم الجزئي يُحذف (التعويض يحذف user_roles أيضًا) ⇒ **الاحتمال منخفض**. لكن إن فشل الـbatch نفسه ⇒ **صفّ جزئي** من ADMIN في user_roles (FK ON DELETE CASCADE ⇒ حذف user يزيل الدور تلقائيًا). |
| W-2 | فشل الـbatch التعويضي | يبقى `bootstrap_consumed=1` ⇒ **الـBootstrap bricked** + بقاء مدير جزئي ⇒ لا مسار استرجاع (لا reset endpoint، لا مهمة دورية) |
| W-3 | لا رصد/تنبيه | لا قياس ولا log منظّم على فشل التعويض |
| W-4 | لا `provisioning_state` | لا حالة دائمة تُظهر «إنشاء قيد التقدّم/فاشل» |

**تقييم AUTH-06:** المسار **الأساسي** (فشل قبل أو أثناء `createUser`/`linkAccount`) مُعوَّض بمعاملة واحدة ⇒ لا يترك مديرًا جزئيًا. **المسار الحرج** (فشل الـbatch نفسه) **غير قابل للكشف** ⇒ باب P1 مفتوح.

## 12.4 AUTH-02/03: مسار إنشاء المستخدم

```
POST /api/v1/users
  ├─ requirePermission(users.manage) + actorIsRoot          app.ts:514-519
  ├─ تحقق (بريد/كلمة مرور/اسم/أدوار)                        app.ts:521-542
  ├─ تحقّق عدم تكرار البريد                                  app.ts:543-544
  ├─ ctx.internalAdapter.createUser  (خارج batch)            app.ts:549-558
  ├─ ctx.password.hash                                     app.ts:559
  └─ try { linkAccount + UPDATE user + setUserRoles }        app.ts:560-563
     catch { batch[ DELETE account, session, user_roles,
                     user_permission_overrides, user_preferences, user ] }   app.ts:568-575
```

**المpositive:** `setUserRoles` يستدعي `restoreIfLastRootRemoved` ⇒ لا يمكن إزالة آخر مدير (مُثبت: 409 `LAST_ADMIN`).
**المسلبي:** نفس W-2/W-3: فشل الـbatch ⇒ حساب بلا دور قد يبقى (قابل للتعيين لاحقًا، غير نشط فعليًا لأن `must_change_password=1` و`disableSignUp`… لكن الحساب **مفعّل** و`must_change_password=1` ⇒ لا يستطيع الدخول دون تغيير كلمة المرور ⇒ خطر منخفض لكن غير صفري).

**تقييم AUTH-02:** `INCONCLUSIVE` (لا خطّاف حقن لفشل `setUserRoles`).
**تقييم AUTH-03:** `FAIL` (لا كشف ولا استرجاع).

## 12.5 الحالة النهائية لكل مفتاح

| البند | الحكم النهائي | سبب مختصر |
|---|---|---|
| AUTH-01 | PASS | مقيس |
| AUTH-02 | INCONCLUSIVE | لا خطّاف حقن |
| AUTH-03 | **FAIL** | لا كشف/استرجاع عند فشل التعويض |
| AUTH-04 | PASS | مقيس |
| AUTH-05 | PASS | مقيس |
| AUTH-06 | INCONCLUSIVE (المسار الأساسي سليم) | لا خطّاف حقن لما بعد الاستهلاك |
| AUTH-07 | PASS | مقيس |
| AUTH-08 | PASS | مقيس |
| AUTH-09 | PASS | مقيس |
| AUTH-10 | PASS | مقيس |
