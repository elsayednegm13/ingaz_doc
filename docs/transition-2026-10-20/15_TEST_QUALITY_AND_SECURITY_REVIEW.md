# 15 — جودة الاختبارات والمراجعة الأمنية (Test Quality & Security Review)

**التدقيق:** ET-2026-10-20 · **الأدلة:** `evidence/e2e-prior-phase-58.log`، `evidence/runtime-probes*.json`، `git diff d9106ee -- e2e/`

## 15.1 سلالة الاختبارات 34 → 47 → 58

| المحطة | العدد | كيف نُتج | الدليل |
|---|---|---|---|
| خط الأساس (08 يوليو) | 34 | 9 ملفات اختبار وحدة | `tests/*.test.ts` (9 ملفات) |
| بعد جولة الـIdempotency | 47 | +6 (`duplicates`) +5 (`session-hardening`, `integrity`) | `docs/ENGINEERING_AUDIT_2026-10-20.md` |
| بعد جولة الذرّية/الاستجابة | **58** | +11 (`atomicity` 6، `duplicates` 11، `responsive` 5) | `git diff d9106ee -- e2e/` |

**عدّ آلي اليوم:** `test(` في `e2e/*.spec.ts` = **58**؛ `it(`/`test(` في `tests/*.test.ts` = **34**. ⇒ **لا تعارض مادي** بين الأرقام؛ التقريران يصفان لحظتين مختلفتين.

| الملف | العدد |
|---|---|
| `operations.spec.ts` | 16 |
| `duplicates.spec.ts` | 11 |
| `atomicity.spec.ts` | 6 |
| `security.spec.ts` | 6 |
| `responsive.spec.ts` | 5 |
| `setup.spec.ts` | 2 |
| `errors.spec.ts` | 2 |
| `invoice-lock.spec.ts` | 2 |
| `checkpoint06-shots`, `custom-fields`, `dossier-grid`, `integrity`, `locale`, `session-hardening`, `shell-grid`, `visual` | 1 لكلٍّ (8) |

## 15.2 سلامة الاختبارات (G17)

| الفحص | الأمر | النتيجة |
|---|---|---|
| اختبارات حصرية/معطَّلة | `grep 'test.only|test.skip|describe.skip|.fixme|test.todo'` | **0 نتائج** |
| تعديلات على التأكيدات | `git diff d9106ee -- e2e/` | **لا تأكيد حُذف**؛ التغييرات كلها *تحديد أدقّ للمحدِّدات* (scope) أو استخراج مساعدات |
| أمثلة | `expect(page.getByText("last4 6789"))` ⇒ `expect(page.getByText(/Account ending/)).toContainText("6789")` | **أقوى** (أصبح يفحص الـIBAN أيضًا) |
| أمثلة | `expect(page.getByText("CSQU3054383"))` ⇒ `expect(page.getByRole("main").getByText("CSQU3054383"))` | نفس الدلالة، نطاق أدقّ (تفادي التطابق داخل الشريط الجانبي) |
| مثال | `page.locator("h1").innerText()` ⇒ `caseReferenceFromPage(page)` | استخراج مكوّن مشترك، نفس القيمة |
| **تسهيل واحد** | `e2e/custom-fields.spec.ts`: تنظيف الحقول المخصّصة صار `timeout: 5_000` + `.catch(() => undefined)` | ⚠️ **تسهيل مُعلَن**: فشل التنظيف لم يعد يُفشل الاختبار. **تأكيدات العمل لم تُمس** |

**الحكم G17: PASS مع تسهيل واحد مُعلَن** (التنظيف فقط، لا منطق العمل).

## 15.3 نتائج هذه الجولة

| الفئة | العدد | ناجح | فاشل | ملاحظات |
|---|---|---|---|---|
| E2E (الجولة السابقة على الشجرة نفسها) | 58 | **58** | 0 | `evidence/e2e-prior-phase-58.log` — «58 passed (16.0m)» |
| وحدة | 34 | 34 | 0 | الجولة السابقة؛ **لم يُعَد** في هذه الجولة (S09 يسمح بـ«إثبات سابق») |
| مقاييس هذا التدقيق (الدفعة 1) | 31 | 26 PASS | 2 FAIL + 1 PARTIAL + 1 LATENT + 2 OBSERVED | `evidence/runtime-probes.json` |
| مقاييس هذا التدقيق (الدفعة 2) | 7 | 5 PASS | 2 FAIL | `evidence/runtime-probes-2.json` |
| ترحيلات (5 arms) | 5 | 5 PASS | 0 | 04_UPGRADE_MATRIX.md |
| فهارس/خطط | 1 | PASS | 0 | 05 §5.4 |

> **حدّ صريح:** حزمة E2E **لم تُعَد** في هذه الجولة (S03.5: تشغيلها يمسح `.wrangler-e2e` وهي مملوكة للجولة السابقة). نتيجة 58/58 منقولة كـ`PRIOR_REPORT` موثّق بالملف، على **الشجرة نفسها** التي راجعها هذا التدقيق.

## 15.4 مراجعة أمنية (S09)

| المجال | الحالة | الدليل | الحكم |
|---|---|---|---|
| بوابة تغيير كلمة المرور | 403 في الخادم قبل أي مسار محمي | `runtime-probes.json` (AUTH-08a) | **PASS** |
| إبطال الجلسة عند التعطيل | 401 بعد التعطيل | `runtime-probes-2.json` (AUTH-09) | **PASS** |
| حماية آخر مدير | 409 `LAST_ADMIN` | `runtime-probes-2.json` (SEC-ADMIN) | **PASS** |
| نطاق الطلب على الملفات | 404 لغير المالك | `e2e/security.spec.ts` (A2) | **PASS** (`PRIOR_REPORT`) |
| نطاق الطلب على التنبيهات | استبعاد الحالات foreign | `e2e/security.spec.ts` (A6) | **PASS** (`PRIOR_REPORT`) |
| فحص Origin | على كل تعديل | `app.ts:343-347` | **PASS** |
| عزل أفضل-أUTH | المصادقة قبل أي منطق أعمال | `app.ts:348-354` | **PASS** |
| صلاحية العملاء | `actorIsRoot` + `requirePermission` | `app.ts:514-519` | **PASS** |
| CSV formula neutralization | اختبار وحدة `csv.test.ts` | `tests/csv.test.ts` | **PASS** (`PRIOR_REPORT`) |
| تنزيل المستند | `attachment` افتراضيًا + `nosniff` | `server/http/app.ts` | **PASS** (`PRIOR_REPORT`) |
| R2 عبر نطاق مختلف | `credentials: "omit"` | `src/lib/api.ts` | **PASS** (`PRIOR_REPORT`)، **الرفع الحقيقي `NOT_TESTED`** |
| **رفع TTL للرابط الموقّع** | 3600s قابل للضبط | `server/services/uploads.ts` | **PASS (منطق)**، **التوقيع الحقيقي `NOT_TESTED`** |
| حدّ Rate limiting عام | **غير موجود** | — | **مخاطرة مفتوحة** (18) |
| CSP/HSTS | **غير موجود** على مستند HTML | — | **مخاطرة مفتوحة** (18) |
| تحديد Better Auth | في الذاكرة لكل isolate | `server/auth.ts:45-50` | **مخاطرة مفتوحة** |
| **خطّاف حقن الأخطاء داخل شيفرة الإنتاج** | `x-test-fail-before-handler` في `app.ts:407-416` | `runtime-probes.json` (IDEM-H) | **ملاحظة**: غير مُفعَّل إلا بـ`EXPORTFLOW_TEST_FAULTS=1`، لكن **وجوده في مسار الإنتاج** يوسّع مساحة الخطأ؛ يُقترح نقله إلى ملف اختبارات |
| **تفويض إعادة التشغيل** | بلا فحص صلاحيات/نطاق | `app.ts:378-382` | **FAIL/PARTIAL** (انظر 08/09) |
| **رفض Bootstrap عند الفشل** | قابل لل brick | `app.ts:295-307` | **FAIL** (AUTH-03/06) |
| **حدّ التقرير العام (rate limit)** | — | — | **مخاطرة مفتوحة** |

## 15.5 تمييز حالات الخطأ/الفراغ/التحميل (S09)

| الحالة | التنفيذ | الحكم |
|---|---|---|
| خطأ | `AlertText` + زر إعادة محاولة | **PASS** (لم يتغيّر) |
| فراغ | `EmptyState` | **PASS** (لم يتغيّر) |
| تحميل أولي | `SkeletonRegion` مع `aria-busy="true"` | **PASS** (14/14 في فحص الـSkeleton) |
| تحديث خلفي | البيانات القديمة تبقى (بلا Skeleton) | **PASS** |
| **Does an error state ever mask a failed API as zero data?** | لا: استعلامات React Query تُبقي `error` و`data` منفصلين، و`AlertText` يظهر مع `isError` | **PASS** (`OBSERVED_SOURCE`) |

## 15.6 `pnpm audit --prod` (بيانات الاعتماديات)

| البند | القيمة |
|---|---|
| الأداة | `pnpm audit --prod` (بيانات الاعتماديات المعروفة فقط) |
| النتيجة المعلنة في التقرير السابق | 0 ثغرة على 102 حزمة إنتاج | 
| **الحدّ** | هذا **ليس** دليلًا على «لا ثغرات»؛ هو قائمة إعلانات معروفة فقط وقت التشغيل، ويفترض اتصالًا بالشبكة |
| **الحدّ** | لم يُعَد تشغيله في هذه الجولة (لا حاجة: التبعيات لم تتغيّر بين 20 أكتوبر وهذه الجولة) ⇒ `PRIOR_REPORT` |

## 15.7 ملاحظة منهجية مهمة

> **«الاختبارات خضراء» لا تعني «آمن».** في هذا التدقيق: 58/58 E2E + 34/34 وحدة + 136/136 قياس استجابة — ومع ذلك تبيّن **فشلان أمنيّان قابلان للقياس** (تكرار الأثر بعد تغيّر الصلاحية؛ خلط ملفين في عملية استيراد واحدة). هذه هي الحجة التي طُلبت في المهمّة (S00.15) وهي مُثبتة بالأرقام لا بالمشاعر.
