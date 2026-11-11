# 04 — مصدر أدلة D3، وتراجع D3-11، والفصل عن Playwright

- **الأمر:** `EXPORTFLOW-W1-EVIDENCE-RECONCILIATION-W2-OWNER-GATE-20261027`
- **معرّف الجولة:** `W1P-20261027-bbd7f047`
- **التاريخ:** 2026-10-27
- **الغرض:** تثبيت أن أدلة D3 رباعية الأنماط هي **دليل جولة سابقة مُراجَع**، وأن إصلاح هذه الجولة
  أعاد اختبار D3-11 إلى النجاح، وأن Playwright الموجّه **ليس** دليل D3 ولا يُعاد تسميته.

## 1. ما هو D3 رباعي الأنماط؟

مسار حقيقي: Worker/Hono + Better Auth حقيقي + D1 محلي + HTTP حقيقي، بمدخل اختباري
`tests/w1/d3-worker.ts` لا يُستخدم في الإنتاج. الأنماط تُختار من **Worker vars** في config الجولة فقط،
ولا يمكن لعميل HTTP اختيارها.

| النمط | ماذا يفعل | الغرض |
|---|---|---|
| `CONTROL` | `createApp()` بلا حقن | إثبات المسار السعيد |
| `LINK_FAIL` | فشل مُحقَن في `internalAdapter.linkAccount` | هل يُعوَّض المستخدم النصف مبني؟ |
| `COMPENSATION_FAIL` | `LINK_FAIL` + `failUserCompensation: true` | هل يفشل الطلب بأمان عند فشل التعويض؟ |
| `INCIDENT_FAIL` | `COMPENSATION_FAIL` + فشل كتابة `auth_compensation_incidents` | هل يبقى الفشل مغلقًا بلا حادثة مسجّلة؟ |

## 2. الأدلة الأصلية (جولة `w1c-20261025-e15f4c`)

هذه **ليست** قياسات هذه الجولة. أُعيد قراءة `result.json` الخام لكل محاولة، ولُقطت بصمات 33 ملفًا
في `evidence/prior-d3-evidence-hashes.json` لإثبات أن القراءة لم تعدّل شيئًا.

| المحاولة | النمط | الفحوص | الحكم | ملاحظة |
|---|---|---:|---|---|
| `attempt-d3-final-control` | `CONTROL` | 24 | **PASS** | `createUser=201` |
| `attempt-d3-final-r1-link-fail` | `LINK_FAIL` | 24 | **PASS** | `500 SERVER_TEMPORARILY_UNAVAILABLE`، لا مستخدم متبقٍ |
| `attempt-d3-final-r2-compensation-fail` | `COMPENSATION_FAIL` | 27 | **PASS** | `500 USER_RECOVERY_REQUIRED` + حادثة |
| `attempt-d3-final-r3-incident-fail` | `INCIDENT_FAIL` | 15 | **FAIL** | توقف قبل فحوص DB/cleanup لأن نمط الفشل يمنع كتابة الحادثة |
| `attempt-d3-final-r3b-incident-fail` | `INCIDENT_FAIL` | 26 | **PASS** | نفس النمط مع هارنس مصحح يتحقق من الفشل المغلق |

**الإفصاح:** `r3` الأولى فشلت فعلًا وسُجّلت فشلًا، ولم تُحوَّل إلى نجاح. سبب الفشل كان **قيد إثبات في
الهارنس** (تعذّر الوصول إلى DB/cleanup بعد فشل الحادثة)، لا عطل منتج. `r3b` أعادت النمط نفسه بهارنس
يستطيع إكمال الفحوص، فنجحت 26/26. هذا يظل `PRIOR_VERIFIED_LOG_REVIEW` وليس إعادة تشغيل في هذه الجولة.

## 3. تراجع D3-11 في هذه الجولة

### 3.1 العطل

أول إصلاح للفاعل القديم رتّب الكتابة **حذفًا قبل إدراج**. في تخفيض الذات (self-demotion):

1. يُحذف دور الفاعل (`role-admin`) أولًا.
2. يصبح الفاعل غير جذر داخل المعاملة نفسها.
3. يفشل حارس الإدراج التالي.
4. النتيجة: `403` بدل `409 LAST_ADMIN`، وأدوار غير مستعادة.

اكتُشف عبر `tests/transition-2026-10-21/d3.test.ts::D3-11`، وهو اختبار قائم لم يُعدَّل.

### 3.2 الإصلاح

- إدراج الصفوف المضافة **قبل** حذف الصفوف المُزالة.
- مسبار `SELECT <guard> AS is_root` كأول جملة في الدفعة، لتحديد الرفض بـ`403` عند فاعل قديم،
  وترك مسار «آخر جذر» يصل إلى `restoreIfLastRootRemoved` فيُرجع `409 LAST_ADMIN` ويستعيد الأدوار.

### 3.3 النتيجة

| الدليل | الأمر | النتيجة |
|---|---|---|
| `evidence/attempt-20-d3-11-post` | `vitest run d3.test.ts -t "D3-11"` | **PASS** (1 passed / 12 skipped) |
| `evidence/attempt-21-d3-file-post` | `vitest run d3.test.ts` | **13/13 PASS** |
| `evidence/attempt-24-stale-active-final` | سيناريو الفاعل القديم بعد إعادة الترتيب | **PASS** (`403 USER_NOT_AUTHORIZED`) |

## 4. الفصل بين D3 وPlaywright

| البُعد | D3 رباعي الأنماط | Playwright الموجّه |
|---|---|---|
| النوع | تكامل Worker/Hono/Better Auth/D1/HTTP | متصفح Chrome + واجهة |
| الأنماط | 4 (CONTROL/LINK_FAIL/COMPENSATION_FAIL/INCIDENT_FAIL) | سيناريوهات وظيفية |
| الجولة | `w1c-20261025-e15f4c` (سابقة) | تُشغَّل في هذه الجولة على المصدر النهائي |
| الحكم | `PRIOR_VERIFIED_LOG_REVIEW` | يُسجَّل بحكمه المستقل |
| يُعاد تسميته D3؟ | — | **لا** |

**قاعدة:** نجاح Playwright 10/10 مرتين لا يُثبت أي نمط من أنماط D3 الأربعة، وفشل D3 لا يُستنتج من
Playwright. كلاهما بوابتان منفصلتان.

## 5. ما لم يُثبت

1. لم يُعَد تشغيل D3 رباعي الأنماط على المصدر النهائي لهذه الجولة؛ الحكم عليه يبقى على أدلة الجولة
   السابقة.
2. `d3.test.ts` يستخدم fake auth + SQLite في الذاكرة، وليس Better Auth حقيقيًا؛ لذلك 13/13 ليست بديلًا
   عن D3 رباعي الأنماط.
3. لا إثبات `PRAGMA integrity_check`: `NOT_VERIFIED_PRAGMA_INTEGRITY_CHECK`.

```text
D3_FOUR_MODE_SOURCE_RUN: w1c-20261025-e15f4c
D3_FOUR_MODE_CLASSIFICATION: PRIOR_VERIFIED_LOG_REVIEW
D3_CONTROL: PASS 24
D3_LINK_FAIL: PASS 24
D3_COMPENSATION_FAIL: PASS 27
D3_INCIDENT_FAIL_FIRST: FAIL 15 (DISCLOSED, HARNESS LIMIT)
D3_INCIDENT_FAIL_RERUN: PASS 26
D3_11_AFTER_FIX: PASS
D3_FILE_AFTER_FIX: 13/13 PASS
PLAYWRIGHT_IS_D3: NO
PRAGMA_INTEGRITY_CHECK: NOT_VERIFIED_PRAGMA_INTEGRITY_CHECK
STOP
```
