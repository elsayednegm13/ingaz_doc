# 02 — أدلة الاختبار والتشغيل

كل النتائج هنا مأخوذة من ملفات محفوظة تحت `evidence/`. لا يوجد رقم في هذا الملف بلا سجل مقابل.

---

## 1. G1 — ترحيل D1 مأهول `0007 → 0008`

### 1.1 المسار الناجح (`attempt-06`)

| البند | القيمة |
|---|---|
| الجذر | `.wrangler-safety-20261021-w1unified-20261025-d4685e` |
| قاعدة البيانات | `g1-happy/state/v3/d1/miniflare-D1DatabaseObject/e086...sqlite` |
| الترحيلات المطبَّقة | `0001..0008` |
| نتيجة `0007` | exit 0 |
| نتيجة `0008` | exit 0 |
| جداول قبل | 56 |
| جداول بعد | 57 |
| جداول محفوظة حرفيًا | 54 |
| جداول متغيرة | 0 |
| جداول مضافة | `auth_compensation_incidents` |
| أعمدة مضافة | `customer_import_operations`: `file_fingerprint`, `parser_version` — `idempotency_keys`: `response_expires_at`, `outcome_class`, `effect_ref` |
| فهارس مضافة | `auth_compensation_incidents_open_idx`, `idempotency_keys_witness_idx` |
| `foreign_key_check` | 0 |
| `integrity_check` | `ok` |
| أرقام فواتير مكررة | 0 |
| صفوف الحوادث | 0 |

**الدليل:** `evidence/attempt-06/g1-summary-happy.json` + لقطات `step-05` (قبل) و`step-07` (بعد) و`step-08` (الفرق).

**التصنيف:** `OBSERVED_RUNTIME`.

### 1.2 مسار الفشل الذري (`attempt-07-failure`)

الاختبار يزرع **VIEW** بنفس اسم الجدول الجديد `auth_compensation_incidents` قبل تطبيق 0008، لإجبار فشل الترحيل في منتصفه.

| البند | القيمة |
|---|---|
| الجذر | `.wrangler-safety-20261021-w1unified-20261025-f90db1` |
| الشروط المسبقة | VIEW مضاد بالاسم نفسه |
| نتيجة `0008` | **exit 1** |
| جداول بعد الفشل | 56 (بلا تغيير) |
| جداول مضافة | 0 |
| أعمدة مضافة | 0 |
| `d1_migrations` | 7 (لم تُسجَّل 0008) |
| `foreign_key_check` | 0 |
| `integrity_check` | `ok` |
| البيانات | سليمة |

**الخلاصة:** D1 يعامل ملف الترحيل كوحدة ذرية: لا أعمدة جزئية، ولا صف ترحيل وهمي.

**الدليل:** `evidence/attempt-07-failure/g1-summary-failure.json` + `step-07`..`step-10`.

**التصنيف:** `OBSERVED_RUNTIME`.

> **ملاحظة:** المحاولات `attempt-01..05` لم تُعتمد لأن الهارنس كان قيد التصحيح: `01/02` بلا ملخص، `03` خلل مقارنة جداول، `04` لقطة «قبل» فارغة (`tablesBefore=0`)، `05` لم يسمح بتغيّر `d1_migrations` المتوقع. المعتمد هو `attempt-06` و`attempt-07-failure`.

---

## 2. G2 — تكامل حقيقي Worker / Hono / Better Auth / D1

### 2.1 الإعداد

| البند | القيمة |
|---|---|
| المشغّل | `scripts/e2e-server.mjs` (M01 launcher) — لم يُعدَّل |
| الجذر | `.wrangler-safety-20261021-w1unified-20261025-57c582` |
| المنفذ | `127.0.0.1:43219` |
| قاعدة D1 | جذر معزول جديد، ترحيلات `0001..0008` |
| الأسرار | `.dev.vars.e2e` اصطناعية داخل الجذر |
| الشبكة | localhost فقط |
| المتصفح | لم يُستخدم |

### 2.2 تسلسل الطلبات (`g2-attempt-03`)

| # | الطلب | النتيجة | الملاحظة |
|---|---|---|---|
| 1 | `GET /api/v1/health` | **200** | أول محاولة `fetch failed` بعد 86ms؛ جاهز بعد **52 محاولة / 26.3s** |
| 2 | `POST /api/v1/auth/bootstrap` | **201** | إنشاء مدير حقيقي + اعتماد + دور |
| 3 | نفس الطلب مرة ثانية | **409** | one-shot |
| 4 | `POST /api/auth/sign-in/email` | **200** | Better Auth حقيقي + Set-Cookie |
| 5 | `GET /api/v1/me` | **200** | جلسة حقيقية + تحميل Actor من D1 |
| 6 | `POST /api/v1/me/password` | **200** | تغيير كلمة مرور حقيقي |
| 7 | إعادة تسجيل الدخول بالكلمة الجديدة | **200** | نجاح الدخول الجديد؛ إبطال الجلسة القديمة لم يُختبر في W1 |
| 8 | `POST /api/v1/customers` + `Idempotency-Key` | **201** | إنشاء عميل |
| 9 | إعادة نفس الطلب بنفس المفتاح | **201** | **نفس الجسم حرفيًا** |
| 10 | نفس المفتاح بجسم مختلف | **422** `IDEMPOTENCY_KEY_REUSED` | العقد الثابت في `app.ts:506` |
| 11 | طلبان متزامنان بمفتاح جديد | **201 / 201** | جسمان متطابقان، أثر واحد |
| 12 | `POST /imports/customers/preview` | **200** | بصمة `14caf70e...48a5` |
| 13 | `POST /imports/customers/commit` | **200** | عملية استيراد واحدة |
| 14 | إعادة الـcommit بنفس `importId` | **200** | استئناف بلا تكرار |
| 15 | نفس `importId` بملف مختلف | **409** `IMPORT_FILE_MISMATCH` | حماية الهوية |

### 2.3 حالة D1 بعد التشغيل

| القياس | القيمة |
|---|---|
| عملاء `W1 Runtime%` / `W1 Import%` | **4** |
| صفوف `idempotency_keys` | **2** |
| عمليات استيراد | **1** |
| صفوف استيراد | **3** (`2 IMPORTED` + `1 FAILED`) |
| صفوف مرتبطة بعملاء | 2 فقط |

**الاستنتاج:** إعادة التشغيل والطلبات المتزامنة لم تُنشئ أثرًا مكررًا، والاستيراد الجزئي سُجِّل بحالة `PARTIAL` مع فشل صف واحد فقط.

**الدليل:** `evidence/g2-attempt-03/g2-integration.json` + `g2-server-{stdout,stderr}.log`.

**التصنيف:** `OBSERVED_RUNTIME`.

#### ملاحظتان من `stderr` (موجودتان مسبقًا، لا علاقة لهما بإصلاحات W1)

1. **Wrangler:** تحذير بأن `--env=e2e` مستخدم بينما الإعداد المولَّد لا يحتوي قسم `[env.e2e]`. التحذير لا يوقف التشغيل، وهو سلوك M01 القائم.
2. **Better Auth:** `Rate limiting could not determine a client IP and is falling back to a single shared per-path bucket`. أي أن تحديد المعدّل في التشغيل المحلي يستخدم دلوًا مشتركًا لعدم وجود ترويسة IP موثوقة. على Cloudflare الحقيقي تُمرَّر `CF-Connecting-IP`، لكن هذا يستوجب التحقق عند Staging.

### 2.4 الاحتواء بعد الإيقاف

| الفحص | النتيجة |
|---|---|
| عمليات Node يشير سطر أوامرها إلى الجذور `d4685e`, `f90db1`, `1adb25`, `ac4c0e`, `57c582` | **0** |
| مستمعون على المنفذ 43219 | **0** |

**الدليل:** `evidence/g2-containment-check.txt` (`OBSERVED_RUNTIME`).

### 2.5 محاولات G2

| المحاولة | الجذر | النتيجة | التفسير |
|---|---|---|---|
| `g2-attempt-01` | `1adb25` | FAIL | توقع الهارنس `409` بينما العقد `422`؛ سلوك المنتج صحيح |
| `g2-attempt-02` | `ac4c0e` | PASS | بعد تصحيح التوقع |
| `g2-attempt-03` | `57c582` | **PASS** | على الكود النهائي بعد تنظيف oxlint |

### 2.6 ما لم يُثبَت في G2

| البند | الحالة |
|---|---|
| D-3 (تعويض الحوادث) عبر HTTP حقيقي | `NOT_VERIFIED` — لا مسار عام لإجبار فشل داخلي |
| Playwright / متصفح حقيقي | `NOT_RUN` |
| Remote / Staging / R2 | `NOT_RUN` |

---

## 3. اختبارات W1 (18/18)

| المعرّف | يغطي | النتيجة |
|---|---|---|
| W1-01 | إغلاق 4/5 ممنوع رغم اكتمال المسارين | PASS |
| W1-02 | حاوية ملغاة ≠ مسلَّمة (4+1 ملغاة = 4/5) | PASS |
| W1-03 | الإغلاق مسموح عند 5/5 | PASS |
| W1-04 | الاستثناء المصرَّح وحده يتجاوز، ومشروط بالصلاحية | PASS |
| W1-05 | خفض `expected_containers` تحت عدد الفتحات لا يخفض السقف | PASS |
| W1-06 | نفس الحالة تُغلق عند تسليم الفتحات الخمس | PASS |
| W1-07 | نسخة جديدة على متطلب `APPROVED` ⇒ `UPLOADED` + حفظ التاريخ | PASS |
| W1-08 | النسخة المعتمدة القديمة تبقى `APPROVED` | PASS |
| W1-09 | حذف متطلب بلا نسخ ينجح | PASS |
| W1-10 | حذف متطلب له نسخ ⇒ 409 + بقاء السجل | PASS |
| W1-11 | الحارس داخل عبارة `DELETE` نفسها (`NOT EXISTS`) | PASS |
| W1-12 | مسودة بلا UCR مسموحة، والتأكيد مرفوض 422 | PASS |
| W1-13 | لا يمكن تفريغ UCR من حجز مؤكَّد | PASS |
| W1-14 | آخر مدير جذر لا يُعطَّل | PASS |
| W1-15 | تعطيل مدير ثانٍ ينجح، ثم تُحمى البقية | PASS |
| W1-16 | 3 تعطيلات متزامنة ⇒ 2 نجاح + 1 رفض + مدير فعّال واحد | PASS |
| W1-17 | فشل مخزن الحوادث ⇒ `persisted:false` + correlation id | PASS |
| W1-18 | المخزن السليم ⇒ `persisted:true` + صف واحد | PASS |

**الدليل:** `evidence/w1-tests-run-02.log` (18/18، exit 0).

**التصنيف:** `OBSERVED_TEST`.

---

## 4. التراجع الكامل

| التشغيل | الملفات | الاختبارات | Exit | الدليل |
|---|---|---|---|---|
| #1 (قبل إضافة W1) | 15 | 88 | 0 | `evidence/g4-vitest-run-01.log` |
| #2 (بعد إضافة W1) | 16 | **106** | 0 | `evidence/g4-vitest-run-02.log` |

لا فشل، ولا اختبار متجاوز (skipped) في السجلين.

**التصنيف:** `OBSERVED_TEST`.

---

## 5. الفحوص الساكنة

| الفحص | الأمر | النتيجة | الدليل |
|---|---|---|---|
| TypeScript build | `tsc -b --pretty false` | exit 0، سجل فارغ | `g4-tsc-build-02.log` |
| Lint | `oxlint <18 ملفًا>` | exit 0، 0 تحذير | `g4-oxlint-final.log` |
| E2E types (قبل) | `node scripts/w1/e2e-typecheck.mjs` | FAIL — 4 أخطاء موجودة مسبقًا | `g4-e2e-typecheck.log` |
| E2E types (بعد) | نفسه | **PASS** — 0 تشخيص، 18 ملفًا | `g4-e2e-typecheck-02.log` |

**التصنيف:** `OBSERVED_TEST`.

---

## 6. جدول تصنيف الأدلة

| الدليل | التصنيف |
|---|---|
| `attempt-06/*` | `OBSERVED_RUNTIME` |
| `attempt-07-failure/*` | `OBSERVED_RUNTIME` |
| `g2-attempt-03/*` | `OBSERVED_RUNTIME` |
| `g2-containment-check.txt` | `OBSERVED_RUNTIME` |
| `w1-tests-run-02.log` | `OBSERVED_TEST` |
| `g4-vitest-run-0{1,2}.log` | `OBSERVED_TEST` |
| `g4-tsc-build-02.log` | `OBSERVED_TEST` |
| `g4-oxlint-final.log` | `OBSERVED_TEST` |
| `g4-e2e-typecheck{,-02}.log` | `OBSERVED_TEST` |
| `source-hashes-post.json` | `OBSERVED_SOURCE` |
| `attempt-01..05/*` | `PRIOR_REPORT` (تكرارات مهجورة) |
| `g2-attempt-01/*` | `PRIOR_REPORT` (توقع هارنس خاطئ) |
| D-3 real runtime | `NOT_VERIFIED` |
| Playwright suite | `NOT_RUN` |
