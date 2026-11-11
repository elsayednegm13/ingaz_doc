# فهرس الأدلة — W1

كل ملف هنا أُنتج بأمر محفوظ أو نسخ مباشر من مخرجاته. التصنيف يتبع المصطلحات المعتمدة:
`OBSERVED_SOURCE` / `OBSERVED_TEST` / `OBSERVED_RUNTIME` / `PRIOR_REPORT` / `INFERRED` / `NOT_VERIFIED` / `NOT_RUN`.

---

## 1. سجلات الجذر (`evidence/`)

| الملف | التصنيف | ماذا يثبت |
|---|---|---|
| `source-hashes-post.json` | `OBSERVED_SOURCE` | SHA-256 وبايتات لكل ملف معدَّل/جديد بعد التعديل |
| `g4-tsc-build-02.log` | `OBSERVED_TEST` | `tsc -b` انتهى بلا أي تشخيص (الملف فارغ) |
| `g4-oxlint-final.log` | `OBSERVED_TEST` | `oxlint` على 18 ملفًا: 0 تحذير |
| `g4-vitest-run-01.log` | `OBSERVED_TEST` | تراجع كامل: 15 ملفًا / 88 اختبارًا / exit 0 |
| `g4-vitest-run-02.log` | `OBSERVED_TEST` | تراجع كامل بعد إضافة W1: 16 ملفًا / 106 اختبارًا / exit 0 |
| `w1-tests-run-01.log` | `OBSERVED_TEST` | التشغيل الأول لاختبارات W1 (قبل تصحيح توقعات الهارنس: 14/18) |
| `w1-tests-run-02.log` | `OBSERVED_TEST` | **التشغيل المعتمد**: 18/18 / exit 0 |
| `g4-e2e-typecheck.log` | `OBSERVED_TEST` | الحالة **قبل** إصلاح أنواع E2E: 4 أخطاء (TS2367, TS2305, TS2322 ×2) |
| `g4-e2e-typecheck-02.log` | `OBSERVED_TEST` | الحالة **بعد** الإصلاح: PASS / 0 تشخيص / 18 ملفًا |
| `g2-containment-check.txt` | `OBSERVED_RUNTIME` | 0 عملية Node يتيمة للجذور الخمسة + 0 مستمع على 43219 |
| `source-audit-readonly.txt` | `OBSERVED_SOURCE` | بصمات وأزمنة تعديل `package.json` و`pnpm-lock.yaml` و`wrangler.jsonc` و`tsconfig*` و`0001..0008` — كلها سابقة للجلسة (إثبات عدم التعديل) |

---

## 2. `attempt-01` .. `attempt-05` — تكرارات مهجورة

| المجلد | التصنيف | الملاحظة |
|---|---|---|
| `attempt-01` | `PRIOR_REPORT` | توقف قبل إنتاج ملخص (تحقق/تحليل)؛ لا يُعتمد |
| `attempt-02` | `PRIOR_REPORT` | توقف قبل إنتاج ملخص؛ لا يُعتمد |
| `attempt-03` | `PRIOR_REPORT` | `FAIL` بسبب خلل مقارنة الجداول في الهارنس (`preservedTables=0`، قائمة تغييرات مشوَّهة) |
| `attempt-04` | `PRIOR_REPORT` | `PASS` غير صالح: `tablesBefore=0` (لقطة «قبل» فارغة) فلا يثبت ترحيلًا على قاعدة مأهولة |
| `attempt-05` | `PRIOR_REPORT` | `FAIL` لأن الهارنس لم يسمح بتغيّر `d1_migrations` المتوقع؛ البيانات نفسها سليمة |

**لماذا تُحفظ؟** لتوثيق أن المسار لم يكن خطًا مستقيمًا، وأن النتيجة النهائية لم تُبلَغ من أول محاولة. لا يُستشهد بها كدليل نجاح.

---

## 3. `attempt-06` — G1 الناجح (معتمد)

| الملف | التصنيف | ماذا يثبت |
|---|---|---|
| `g1-summary-happy.json` | `OBSERVED_RUNTIME` | 56→57 جدولًا، 54 محفوظًا، 5 أعمدة، فهارسان، FK=0، integrity=ok |
| `step-01-migration-set-0007.json` | `OBSERVED_RUNTIME` | مجموعة الترحيلات قبل 0008 |
| `step-02-apply-0007.json` | `OBSERVED_RUNTIME` | تطبيق 0001..0007 |
| `step-03-seed.json` | `OBSERVED_RUNTIME` | زرع البيانات الاصطناعية |
| `step-04-state-files.json` | `OBSERVED_RUNTIME` | ملفات الحالة (`sqlite` + `-wal` + `-shm`) |
| `step-05-snapshot-before.json` | `OBSERVED_RUNTIME` | لقطة المخطط قبل 0008 |
| `step-06-apply-0008.json` | `OBSERVED_RUNTIME` | تطبيق 0008 |
| `step-07-snapshot-after.json` | `OBSERVED_RUNTIME` | لقطة المخطط بعد 0008 |
| `step-08-diff.json` | `OBSERVED_RUNTIME` | الفرق الكامل (جداول/أعمدة/فهارس) |
| `step-09-post-checks.json` | `OBSERVED_RUNTIME` | فحوص ما بعد (فهارس، صفوف، تكرار فواتير) |
| `cmd-*.json` / `cmd-*.stdout.txt` / `cmd-*.stderr.txt` | `OBSERVED_RUNTIME` | المخرجات الخام لأوامر Wrangler |

---

## 4. `attempt-07-failure` — G1 الفشل الذري (معتمد)

| الملف | التصنيف | ماذا يثبت |
|---|---|---|
| `g1-summary-failure.json` | `OBSERVED_RUNTIME` | exit 1، 56 جدولًا، 0 أعمدة، `d1_migrations`=7 |
| `step-06-failure-precondition.json` | `OBSERVED_RUNTIME` | إنشاء VIEW مضاد بالاسم نفسه |
| `step-07-apply-0008.json` | `OBSERVED_RUNTIME` | فشل الترحيل |
| `step-08-snapshot-after.json` | `OBSERVED_RUNTIME` | لا تغيير في المخطط |
| `step-09-diff.json` | `OBSERVED_RUNTIME` | فرق فارغ |
| `step-10-post-checks.json` | `OBSERVED_RUNTIME` | لا جدول حقيقي ولا فهارس؛ الكائن الموجود هو VIEW مضاد بعمود `id` وصف واحد |
| `cmd-*` | `OBSERVED_RUNTIME` | المخرجات الخام |

---

## 5. G2 — التكامل الحقيقي

| المجلد/الملف | التصنيف | ماذا يثبت |
|---|---|---|
| `g2-attempt-01/*` | `PRIOR_REPORT` | محاولة بتوقع خاطئ (409 بدل 422)؛ سلوك المنتج صحيح |
| `g2-attempt-02/*` | `OBSERVED_RUNTIME` | أول PASS بعد تصحيح الهارنس |
| **`g2-attempt-03/g2-integration.json`** | `OBSERVED_RUNTIME` | **السجل المعتمد**: health/bootstrap/signin/me/password/D-1/D-2 + أعداد D1 |
| `g2-attempt-03/g2-server-stdout.log` | `OBSERVED_RUNTIME` | مخرجات الخادم (Vite + Worker) |
| `g2-attempt-03/g2-server-stderr.log` | `OBSERVED_RUNTIME` | تحذيران فقط: غياب قسم `[env.e2e]` في الإعداد المولَّد، وBetter Auth يعجز عن تحديد IP للتحديد فيستخدم دلوًا مشتركًا |

### ما يثبته `g2-attempt-03` بالتفصيل

| البند | القيمة |
|---|---|
| أول محاولة health | `fetch failed` بعد 86ms |
| الجاهزية | 52 محاولة / 26.3s |
| bootstrap | 201 ثم 409 |
| sign-in / me / change-password / re-sign-in | 200 / 200 / 200 / 200 |
| إنشاء عميل | 201 |
| إعادة نفس المفتاح ونفس الجسم | 201 + جسم مطابق |
| نفس المفتاح بجسم مختلف | 422 `IDEMPOTENCY_KEY_REUSED` |
| طلبان متزامنان | 201/201 بجسمين متطابقين |
| preview / commit / resume | 200 / 200 / 200 |
| ملف مختلف بنفس `importId` | 409 `IMPORT_FILE_MISMATCH` |
| عملاء في D1 | 4 |
| صفوف idempotency | 2 |
| عمليات استيراد / صفوف | 1 / 3 (2 imported + 1 failed) |

---

## 6. ما لا يوجد في الحزمة (وهذا مقصود)

| العنصر | التصنيف | السبب |
|---|---|---|
| دليل D-3 عبر HTTP حقيقي | `NOT_VERIFIED` | لا مسار عام لإجبار فشل التعويض |
| تقرير Playwright/متصفح | `NOT_RUN` | لم تُشغَّل الحزمة |
| تطبيق 0008 على قاعدة المطور | `NOT_RUN` | غير مأذون |
| Remote/Staging/R2 | `NOT_RUN` | محظور |
| بصمات SHA-256 «قبل» | `NOT_CAPTURED` | لم تُلتقط قبل التعديل |
| سجل Git / diff | `NOT_RUN` | أوامر Git محظورة |

---

## 7. كيفية إعادة التحقق

```powershell
# 1. اختبارات W1
node node_modules/vitest/vitest.mjs run tests/w1 --reporter=verbose

# 2. التراجع الكامل
node node_modules/vitest/vitest.mjs run --reporter=basic

# 3. الأنواع
node node_modules/typescript/bin/tsc -b --pretty false

# 4. E2E types
node scripts/w1/e2e-typecheck.mjs

# 5. G1 (ينشئ جذرًا جديدًا)
node scripts/w1/g1-populated-migration.mjs --phase happy --run-root <جذر-فارغ-جديد>

# 6. G2 (ينشئ جذرًا جديدًا، منفذ 43219)
node scripts/w1/g2-integration.mjs --run-root <جذر-فارغ-جديد> --evidence <مجلد> --port 43219
```

> كل تشغيل جديد يجب أن يستخدم جذرًا فارغًا فريدًا. لا تُعد استخدام أي جذر من هذه الحزمة.
