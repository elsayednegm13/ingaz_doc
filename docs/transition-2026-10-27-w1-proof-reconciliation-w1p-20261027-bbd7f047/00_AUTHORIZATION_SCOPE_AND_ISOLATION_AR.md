# 00 — التفويض والنطاق وإثبات العزل

- **الأمر:** `EXPORTFLOW-W1-EVIDENCE-RECONCILIATION-W2-OWNER-GATE-20261027`
- **معرّف الجولة:** `W1P-20261027-bbd7f047`
- **الجذر:** `docs/transition-2026-10-27-w1-proof-reconciliation-w1p-20261027-bbd7f047/`
- **التاريخ:** 2026-10-27
- **الوكيل/الأدوات:** OpenCode — Node.js + Wrangler local (workerd) + local D1 + Vitest + Playwright (Chrome channel).
- **الحكم المختصر:** `LOCAL/PARTIAL` — لا توقيع مالك، ولا إذن W2، ولا staging/production.

## 1. التفويض — ما سُمح به

1. إثبات أو نفي **أسبقية `effectiveRootCondition`** الفعلية من المصدر، وتشغيل جدول حقيقة على
   التعبير الإنتاجي نفسه لا على نسخة من الهارنس.
2. إثبات **ذرّية حماية آخر جذر** عبر الـAPI الحقيقي (تعطيل/تفعيل/تغيير أدوار/تجاوزات).
3. اختبار **تجاوز الفاعل القديم** (stale actor) بعد سحب صلاحيته، لا الاكتفاء بالتعطيل.
4. مصالحة أدلة الجولات السابقة والأرقام المعلنة، وفصل `SNAPSHOT_DELTA` عن `TOTAL_RUN_FILES_CREATED`.
5. إصلاح عطل منتج **مُثبت** فقط، داخل قائمة السماح:
   `server/services/users.ts`, `tests/w1/**`, `scripts/w1final/**`, `e2e/**`.
6. إنتاج حزمة قرار مالك **غير موقعة**، وقرارات W2 أولًا، مع إعادة تصنيف `W2-UAT-02/03` إلى W3.
7. تشغيل Playwright موجّه 10/10 مرتين على جذور جديدة بعد آخر تعديل مصدر.

## 2. التفويض — ما مُنع صراحةً

| الممنوع | الحالة |
|---|---|
| أي أمر Git (status/diff/commit/reset/clean) | **لم يُنفَّذ** |
| `.wrangler/state` أو أي `.wrangler-*` تاريخي | **لم يُقرأ محتواه ولم يُكتب** |
| `.dev.vars*` أو `.env*` الحقيقي | **لم يُقرأ** |
| قاعدة المطور D1 أو أي migration عليها | **لم تُفتح ولم تُطبَّق** |
| remote / staging / production / R2 / سحابة | **لا اتصال** |
| تثبيت حزم أو تغيير lockfile | **لم يحدث** |
| تعديل `0001..0009` أو إنشاء `0010`/`0011` | **لم يحدث** |
| كود Quotation/Proforma أو صلاحيات W2 | **لم يُكتب** |
| توقيع آلي لأي قرار أو ادعاء توقيع مالك | **لم يحدث** |

## 3. عزل التشغيل

كل تشغيل Runtime في هذه الجولة استخدم:

| الضابط | التطبيق |
|---|---|
| جذر جديد | `.wrangler-safety-20261021-w1p-<scenario>-<hex>` يُنشأ لكل محاولة |
| منفذ | loopback حر يُختار لحظة التشغيل (لا 43174 إلا Playwright) |
| config | `--config <runRoot>/wrangler.w1final.generated.jsonc` صريح |
| persist | `--persist-to <runRoot>/state` صريح |
| أسرار | `BETTER_AUTH_SECRET` و`BOOTSTRAP_SECRET` مولّدة عشوائيًا داخل الجذر |
| `.dev.vars` | ملف اصطناعي داخل الجذر فقط |
| مسبار الإنتاج | `/__w1/*` محمي بـ`W1_PROBE_TOKEN` عشوائي داخل config الجولة؛ للقراءة فقط |
| تأخيرات السباق | متغيّرات config فقط (`W1_*_DELAY_MS`)، لا يمكن لعميل HTTP اختيارها |
| التنظيف | `taskkill /PID <owned> /T /F` + التحقق من إغلاق المنفذ وغياب العملية |

**حارس العزل:** `scripts/isolation-guard.mjs` يرفض أي مسار ليس داخل
`.wrangler-safety-20261021-*`، ويرفض `.wrangler/state` والجذور التاريخية قبل أي `existsSync`.

## 4. دورة الحياة — إثبات الإغلاق

كل محاولة سجّلت في `result.json`:

- `cleanup.portClosed = true`
- `cleanup.processGone = true`
- `cleanup.taskkillExit = 0`

ولم تُسجَّل أي عملية `workerd` أو `wrangler` متبقية بعد انتهاء الدفعات. لا يوجد `reuseExistingServer`
في Playwright، والمنفذ 43174 كان حرًا قبل كل تشغيل.

## 5. المسارات المحمية — قياس وصفي

القياس **بيانات وصفية فقط** (عدد/حجم/أحدث mtime)، بلا قراءة محتوى:

| الحقل | القيمة |
|---|---|
| ملف القياس | `evidence/protected-metadata-late.json` |
| وقت الالتقاط | بعد معظم تشغيلات الجولة |
| عدد الجذور المحمية المرصودة | 67 |
| إجمالي الملفات | 5,199 |
| إجمالي البايتات | 920,646,855 |
| `.wrangler` (قاعدة المطور) | 45 ملفًا / 71,907,938 بايت |
| أحدث mtime داخل `.wrangler` | `2026-10-20T23:16:13.5746909Z` |

**قراءة النتيجة:** أحدث mtime داخل `.wrangler` يسبق هذه الجولة بأسبوع، ولم يتغيّر أثناءها. هذا **لا**
يثبت عدم وجود كاتب خارجي، لكنه يتوافق مع عدم لمس الجولة له.

**قيد يجب التصريح به:** لم تُلتقط لقطة «قبل» لبيانات المسارات المحمية في بداية هذه الجولة. اللقطة
المتاحة هي «متأخرة» ثم «نهائية». لذلك:

```text
PROTECTED_PATH_METADATA_BEFORE_AT_RUN_START: NOT_CAPTURED
PROTECTED_PATH_METADATA_LATE: CAPTURED
PROTECTED_PATH_METADATA_POST: CAPTURED
```

هذا قيد إثبات، وليس إثبات تلاعب. لا يجوز تحويله إلى `PASS` كامل.

## 6. الجذور التي أنشأتها الجولة

أُنشئ جذر لكل محاولة تحت `.wrangler-safety-20261021-w1p-*`، وعددها النهائي ونتيجة حذفها المملوك
مسجّلان في `evidence/cleanup-owned.json`. الجذور التاريخية (`w1c`, `w1f`, `w1unified`, `.wrangler-e2e`,
`.wrangler-perf`, …) **لم تُحذف ولم تُعدَّل**.

## 7. ما لم يُثبت في هذا التقرير

1. لا إثبات Git HEAD/status؛ Git ممنوع بأمر صريح، والجرد بديل SHA-256.
2. لا إثبات سلامة `PRAGMA integrity_check`؛ الحالة `NOT_VERIFIED_PRAGMA_INTEGRITY_CHECK`.
3. لا فحص FK/orphans شامل في هذه الجولة؛ فصلناه عن فحص النزاهة.
4. لا إثبات أداء أو حمل أو multi-instance أو D1 بعيدة.
5. لا إثبات أن المسارات المحمية لم يمسّها كاتب خارجي أثناء الجولة.

```text
RUN_ID: W1P-20261027-bbd7f047
ISOLATION_MODE: FRESH_RUN_OWNED_ROOTS_ONLY
EXPLICIT_CONFIG: YES
EXPLICIT_PERSIST: YES
SYNTHETIC_SECRETS: YES
REAL_DEV_VARS_READ: NO
DEVELOPER_D1_ACCESS: NO
HISTORICAL_ROOTS_TOUCHED: NO
GIT_ACCESS: NO
CLOUD_REMOTE_ACCESS: NO
PROTECTED_PATH_METADATA_BEFORE_AT_RUN_START: NOT_CAPTURED
PROTECTED_PATH_METADATA_POST: CAPTURED
PRAGMA_INTEGRITY_CHECK: NOT_VERIFIED_PRAGMA_INTEGRITY_CHECK
STOP
```
