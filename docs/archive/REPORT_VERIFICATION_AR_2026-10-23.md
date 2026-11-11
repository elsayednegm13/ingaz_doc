# تقرير التحقق من ExportFlow — قراءة فقط

**التاريخ:** 2026-10-23  
**الجذر:** `I:\WORK\InjazDocs`  
**الفرع / HEAD:** `main` / `d9106ee`  
**حالة Git:** 169 مدخلاً في `git status --porcelain`، لا توجد تغييرات staged  
**نوع المراجعة:** قراءة فقط (read-only). لا تعديل ولا حذف للملفات، ولا تشغيل Wrangler/Vite/Playwright، ولا ترحيلات، ولا قواعد بيانات مطور، ولا اتصال بسحابة، ولا commit/push/reset/clean/checkout.  
**تصنيف النتائج:** `OBSERVED` (مرصود من المصدر الحالي)، `PREVIOUSLY REPORTED` (مُبلَّغ سابقاً)، `INFERRED` (استنتاجي من مسار الكود)، `UNVERIFIED` (غير قابل للإثبات بسبب قيود العزل).

---

## ملخص تنفيذي

ExportFlow نظام تشغيل صادرات داخلي لشركات تصدير فردية، وليس تطبيقاً جديداً ولا منصة متعددة المستأجرين. المحور الأساسي هو «حالة التصدير» (`EF-…`) التي تربط العميل والفاتورة والمستندات والمسار البنكي/المباشر والشحن والحاويات والتذكيرات والتتبع العام.

تم التحقق ساكناً من المصادر والتقارير السابقة. النتائج الرئيسية:

- الإصلاح المعزول D-1/D-2/D-3 مُبلَّغ سابقاً بأنه نجح (53/53 اختبار، 44/44 بند مصفوفة)، وهذه النتائج **ليست دليلاً runtime حالياً**.
- هناك فجوات أمان واتساق تجاري في المصدر الحالي: تسريب نطاق التقارير، تجاهل عدد الحاويات المتوقع عند إكمال الحالة، إمكانية حذف سجل المستندات المراجعة فعلياً، غياب سياسة إعادة تفويض لمسار الحقول المخصصة للحالات، وضعف محتمل في حماية آخر مدير concurrent، ومسارات اختبار حية في التطبيق، وعزل Nاقص لـPlaywright.
- المتطلبات التجارية الجديدة المقترحة من الملاك (عروض الأسعار، UCR إلزامي لتأكيد الحجز، إصدارات الحجوزات، فواتير مستندة إلى عروض الأسعار) **غير موجودة في المصدر الحالي**، وهي بانتظار قرارات الملاك OD-01..OD-17 قبل أي تنفيذ.
- الوضع الحالي: `PARTIAL / LOCAL-ONLY`؛ `STAGING: NO-GO`؛ `PRODUCTION: NO-GO`.

---

## 1) غرض التقرير ونطاق المراجعة

`[OBSERVED]` الغرض من AGANT.MD/HANDOFF.MD: مراجعة قراءة فقط، التحقق من المطابقة بين التوثيق والمصدر، delivering تقرير عربي شامل مع 12 قسم، وتصنيف النتائج، والتوقف عند줄 Eigentum المالك.

`[OBSERVED]` ما لم يُفعل في هذه المرحلة: لا تشغيل اختبارات، لا ترحيلات، لا تعديل كود، لا Git commit/push، لا اتصال سحابي، لا قراءة `.wrangler/state` أو `.dev.vars`.

`[PREVIOUSLY REPORTED]` المرحلة المقترحة التالية: `ET-2026-10-21-B — Isolated Runtime Integration & Migration Acceptance` وهي **مقترحة، غير مرخصة**.

---

## 2) هوية المنتج والنموذج التجاري

`[OBSERVED]` من AGANT.MD والق المصدر: نظام داخلي ثنائي اللغة (AR/EN) لإدارة عمليات التصدير، يحل محل جداول البيانات المجزأة. الكائن الأساسي حالة التصدير بمعرف `EF-…`.

`[OBSERVED]` الوحدات المدعومة حالياً في المصدر:
- العملاء (الهوية، العناوين، جهات الاتصال، الضريبة/البنك، الحقول المخصصة)
- حالات التصدير (DRAFT/ACTIVE/ON_HOLD/COMPLETED/CANCELLED/ARCHIVED)
- الفواتير (FOB/CFR، إجمالي صريح مخزن، مبالغ بضاعة وشحن، أوزان، شروط دفع)
- المستندات (قوالب، نسخ PDF، مراجعات، إعفاءات)
- البنك/المسار المباشر (مساران منفصلان، بوابات hand-off distinct)
- الشحن والحاويات (حجوزات، فتحات مخططة، أرقام ISO فعلية، أحداث يدوية)
- التذكيرات (قواعد، سكون، تكرار، deduplication)
- التتبع العام (رابط رمزي مقيد، قابل للإلغاء، عرض محدود)
- التقارير والاستيراد (CSV مع حماية من حقن الصيغ، استيراد جزئي قابل للاستئناف)

`[OBSERVED]`cusotm fields تدعم خمس عائلات: العملاء، حالات التصدير، الفواتير، الحجوزات، الحاويات.

`[OBSERVED]` `CUSTOM_FOLLOWUP` موجود كـ enum فقط، غير منفذ، لا مسار ولا سلوك — agrees with HANDOFF.MD.

---

## 3) البنية التقنية والوحدات

`[OBSERVED]` من `package.json`: React 19، TypeScript، Vite 7، React Router 7، TanStack Query، Tailwind CSS v4، better-auth، Hono، drizzle-orm، wrangler 4.42.2، playwright، vitest.

`[OBSERVED]` الخادم: `server/http/app.ts` مع خدمات في `server/services/`، انتقالات في `server/domain/transitions.ts`، مشترك في `shared/`.

`[OBSERVED]` ملفات الخدمة الأساسية المقروءة: `idempotency.ts`، `replay-policy.ts`، `imports.ts`، `import-fingerprint.ts`، `compensation.ts`، `schema.ts`، `bookings.ts`، `cases.ts`، `documents.ts`، `bank-courier.ts`، `reminders.ts`، `tracking.ts`، `reports.ts`، `users.ts`، `customers.ts`، `uploads.ts`.

`[OBSERVED]` `replay-policy.ts` ينص صراحةً على أن كل إعادة عرض تُعيد تفويض الصلاحية ونطاق الحالة الحالي، والمسارات غير المعروفة تفشل مغلقاً بـ `IDEMPOTENCY_REPLAY_POLICY_MISSING`.

---

## 4) مقارنة AGANT.MD وHANDOFF.MD مع المصدر الحالي

### ما يتطابق (OBSERVED)

- `0008` يضيف `response_expires_at`، `outcome_class`، `effect_ref` على `idempotency_keys`.
- `/api/v1/health/live` هو liveness؛ `/api/v1/health` يعيد `503 SCHEMA_UPGRADE_REQUIRED` عند عدم الجاهزية ولا يُهاجر تلقائياً.
- الشاهد idempotency يدوم 30 يوماً، والاستجابة القابلة للإعادة العرض ساعة واحدة.
- `removeRequirement` لا يمس snapshots العملاء (حالة snapshots منفصلة).

### ما لا يتطابق أو غير مكتمل (OBSERVED)

| البند | ما يقوله AGANT/HANDOFF | ما في المصدر الحالي |
|---|---|---|
| `reports.ts` | "نطاق الممثل (scope to actor)" | `casesCsv` و`delayReport` لا يطبقان `caseVisibilitySql`؛ يصرحان بكل الحالات لحامل `reports.export` / `reports.view` |
| تغطية إعادة التفويض | جميع المسارات المحمية مغطاة | `PUT /api/v1/export-cases/:id/custom-fields` مفقود من `replay-policy.ts` |
| الحجوزات والفتحات | `expected_containers` محفوظ | `bookingAggregateFromContainers` ينفّذ `void expectedCount`؛ إكمال الحالة لا يتحقق من العدد المتوقع |
| حذف المتطلبات | "لم يُعدّل documents.ts" | `removeRequirement` يحذف المتطلب وت cascade يمحو `document_versions` و `document_reviews` |
| آخر مدير | حماية تزامنية؟ | `countRootAdmins` غير تزامني؛ `setUserRoles` ليس Atomic |
| Git | 457 إدخالاً té-reported | 169 إدخالاً حالياً |
| `0005`–`0008` | مكتوبة على القرص | غير متتبعة في Git؛ فقط `0001`–`0004` متتبعة |
| وثائق API | عقد محدث | `docs/API.md` و`docs/openapi.yaml` لا تذكر مصطلحات `0008` (`response_expires_at`، `IMPORT_FILE_MISMATCH`، إلخ) |

---

## 5) التحقق من الثوابت التجارية (B01–B16)

| ثابت | الحالة | دليل المصدر |
|---|---|---|
| B01 snapshot العميل غير قابل للتعديل على الحالة | محفوظ | `createCase` يُsnapshot بيانات العميل في `export_case_customer_snapshots` |
| B02 الإجمالي الصريح للفاتورة | محفوظ | `export_invoices.invoice_total_minor` صريح؛ `validateInvoiceCommercials` لا يُشتقه تلقائياً |
| B03 قفل الفاتورة عند إكمال الحالة | محفوظ تسلسلياً | `assertInvoiceOrdinaryWrite` يرفض التعديل العادى على حالة COMPLETED؛ `correctCompletedInvoice` يحتاج إذن وسبب 3–500 حرف وversion |
| B04 BANK vs DIRECT منفصلان | محفوظ | `transitionBank` يرفض DIRECT cases؛ `assertRouteChange` يمنع مراحل البنك على المسار المباشر |
| B05 نسخ المستندات والمراجعات | خطر | `removeRequirement` يُحذف مع cascade إلى النسخ والمراجعات؛ لا تمنع الحذف على حالة COMPLETED أو وجود نسخ |
| B06 المسح قبل handoff البنكي | غير متحقق runtime | منطق موجود لكن لا اختبار حقيقي على D1 |
| B07 البريد اليدوي ≠ شحنة货 | محفوظ تصميم | `bank-courier` تسجيل يدوي؛ `Source: MANUAL` |
| B08 رقم الحجز/UCR اختياري | جزئي | `bookings.ucr` nullable، لا بوابة تأكيد تتطلب UCR فعال |
| B09 الفتحات مقابل الأرقام الفعلية | منفصلتان | فتحات PLANNED بدون أرقام تبقى فارغة |
| B10 وصول الميناء ≠ تسليم العميل | جزئي | `goodsTrackComplete` يفترض كل الحاويات الموجودة مثبتة، لكنه **يتجاهل العدد المتوقع** (`void expectedCount`) |
| B11 التذكيرات | محفوظ تصميم | 11 عائلة محملة، `CUSTOM_FOLLOWUP` غير منفذ |
| B12 التتبع العام | محفوظ | رابط مقيد، لا بيانات مالية أو مستندات خاصة |
| B13 RBAC server-side | محفوظ بشكل عام | `assertCaseAccess` على كل نقطة حساسة، باستثناء تسريب التقارير |
| B14 الحقول المخصصة خمس عائلات | محفوظ | `CUSTOM_FIELD_TARGETS` تغطي العملاء/الحالات/الفواتير/الحجوزات/الحاويات |
| B15 CUSTOM_FOLLOWUP | غير منفذ | enum فقط، لا مسار ولا سلوك |
| B16 الاستيراد الجزئي | محفوظ تصميم | `canCommit` مستند للبصمة، صفوف FAILED تُستأنف |

---

## 6) D-1 / D-2 / D-3 والترحيل 0008

### D-1 idempotency/replay (OBSERVED)
- المفتاح `(actor_id, idempotency_key)` وبصمة الطريقة+المسار+الاستعلام+الجسم.
- الشاهد 30 يوماً، الاستجابة ساعة واحدة، إعادة العرض تمر عبر `authorizeReplay`.
- `IN_PROGRESS`/`UNKNOWN`/`MISMATCH`/`EXPIRED` برموز صريحة.
- العميل لا يدوّر المفتاح بعد `UNKNOWN`/`EXPIRED`/`IN_PROGRESS`/`POLICY_MISSING`.

### D-2 CSV import identity (OBSERVED)
- بصمة `csv-v1` على بنية محللة قانونية (NFC، CRLF→LF، trim، رؤوس مرتبة، ترتيب الصفوف محفوظ).
- `importId` مرتبط بالبصمة؛ الملف المختلف يُرفض بـ `IMPORT_FILE_MISMATCH`؛ العملية القديمة بدون بصمة تُرفض بـ `IMPORT_FINGERPRINT_MISSING`.
- استيراد جزئي مقصود؛ معرّفات عملاء حتمية تمنع التكرار.

### D-3 auth/compensation (OBSERVED)
- `auth_compensation_incidents` يسجل المرحلة/الارتباط/المعرّف المتبقي، بدون أسرار.
- Bootstrap يستهلك السر مرة واحدة، يعوّض على مرحلتين، 마지막 مدير يُحمى تسلسلياً.

### الترحيل 0008 (OBSERVED / UNVERIFIED)
- إضافي وآمن من حيث لا يعيد كتابة صفوف تاريخية.
- `0005`–`0008` غير متتبعة في Git.
- لم يُختبر على D1 رسمي populated (0007→0008). `UNVERIFIED`.

---

## 7) العزل، E2E، والبصريات

`[OBSERVED]` حارس العزل القوي `scripts/isolation-guard.mjs` يرفض `.wrangler/state` وكل الجذور التاريخية (.wrangler-e2e، .wrangler-perf، إلخ) ويطلب جذر تشغيل جديداً.

`[OBSERVED]` אך `vite.config.ts` في وضع الاختبار يرفض فقط `.wrangler/state`، ولا يفرض marker الجذر القوي.

`[OBSERVED]` Playwright 작성 مسارات ثابتة داخل `.wrangler-e2e`:
- `e2e/helpers.ts:58–65`: `runStamp` يكتب `.wrangler-e2e/stamp.txt`؛ `adminCreds` يقرأ `.wrangler-e2e/admin.json`.
- `e2e/setup.spec.ts:41`: `storageState` إلى `.wrangler-e2e/admin-state.json`.
- `playwright.config.ts:31`: يقرأ `.wrangler-e2e/admin-state.json`.
- `scripts/e2e-server.mjs` ينشئ `runRoot` جديداً ويكتب `admin.json` فيه، لذا بيانات الاعتماد في `.wrangler-e2e` لن تطابق الخادم الجديد.

`[INFERRED]` أي تشغيل Playwright سيُلوّث الجذر المحمي تاريخياً `.wrangler-e2e` وقد يفشل المصادقة. هذا يؤيد `E2E_BLOCKED_ISOLATION` ويكشف أن العزل غير مكتمل برمجياً.

`[OBSERVED]` الأدلة المحفوظة: `vitest.json` 53/53 ناجح؛ `remediation-matrix.json` 44/44 PASS؛ hardExits تشمل BLOCKED_ISOLATION، NOT_TESTED (ترحيل المطور، سباق idempotency عبر isolates، البصريات).

`[OBSERVED]` المرجعان البصريان المعتمدان موجودان (`REFERENCES/TARGET_01...`、`TARGET_02...`) و24 لقطة baseline و24 لقطة QA، لكنها مرجع تصميم فقط، ليس اعتماداً بصرياً نهائياً.

`[UNVERIFIED]` اختبار بصري حقيقي (RTL/LTR، 200% zoom، قارئ شاشة) لم يُجرَ. صفحةpreview الحالية تُظهر "Site unavailable" ولم أُشغّل خادم مراجعة.

---

## 8) الفجوات والمخاطر المكتشفة (مع التصنيف)

| ID | الفئة | الاكتشاف | التصنيف | الموقع | الأهمية |
|---|---|---|---|---|---|
| F-01 | صلاحيات | `casesCsv` و`delayReport` لا يطبقان نطاق الحالة | OBSERVED | `server/services/reports.ts:85–96` | P1 |
| F-02 | اتساق تجاري | إكمال الحالة يتجاهل `expected_containers` | OBSERVED | `server/domain/case-completion.ts:42–72` | P1 |
| F-03 | مستندات | `removeRequirement` يمحو النسخ والمراجعات عبر cascade | OBSERVED | `server/services/documents.ts:102–114` + 0001 FK cascade | P1 |
| F-04 | replay | سياسة مفقودة لـ `PUT /api/v1/export-cases/:id/custom-fields` | OBSERVED | `server/services/replay-policy.ts` | P1 |
| F-05 | أمان | حماية آخر مدير غير تزامنية (سباق محتمل) | INFERRED | `server/services/users.ts` | P1 |
| F-06 | عزل | Playwright يكتب/يقرأ `.wrangler-e2e` رغم runRoot جديد | OBSERVED | `e2e/helpers.ts`、`setup.spec.ts`、`playwright.config.ts` | P0 |
| F-07 | عزل | vite.config.ts لا يفرض جذر تشغيل قوي في وضع الاختبار | OBSERVED | `vite.config.ts` | P2 |
| F-08 | أمان | مسارات `__test` حية في التطبيق، محمية بمتغيرات بيئة فقط | OBSERVED | `server/http/app.ts:267–321` | P2 |
| F-09 | توثيق | API/OpenAPI لم يُحدّثا لمصطلحات 0008 | OBSERVED | `docs/API.md`、`docs/openapi.yaml` | P2 |
| F-10 | إصدار | `0005`–`0008` غير متتبعة في Git | OBSERVED | `git ls-files`、`git status` | P2 |
| F-11 | إصدار | 169 إدخالاً حالياً مقابل 457 té-reported | OBSERVED/PREVIOUSLY REPORTED | `git status --porcelain` | P2 |
| F-12 |usiness | لا وحدة عروض أسعار (Quotation) في المصدر | OBSERVED |grep across repo | P1 (relative to new BR) |
| F-13 | UCR | UCR اختياري، لا بوابة تأكيد، لا سجل استبدالات | OBSERVED | `server/services/bookings.ts`、`0001_init.sql` | P1 (relative to new BR) |
| F-14 | حجوزات | لا جدول إصدارات حجوزات (BookingVersion) | OBSERVED | `0001_init.sql` | P1 (relative to new BR) |
| F-15 | مستندات | أعداد defaults المقيدة (1/1/1/0/0) مقابل المقترح (4/4/3/2/4) | OBSERVED | `0002_seed.sql` | P2 |

---

## 9) المتطلبات التجارية المقترحة من الملاك مقابل المصدر الحالي

الملفات المرفقة (Proposed Addendum / BR v0.2 / Open Decisions / Handoff Update) هي **مقترحات للمراجعة من الملاك، غير مثبتة في المستودع، ولا تُخول أي تغيير كود أو ترحيل**.

| متطلب مقترح | الوضع في المصدر الحالي | الفجوة |
|---|---|---|
| عرض أسعار (Quotation) مستقل بمرجع خاص | غير موجود | لا جدول/مسار/وحدة |
| عدة عروض أسعار تُغذي فاتورة واحدة | غير موجود | لا جدول ربط |
| الفاتورة最終ية يدوية Nummer، مسودة عند بداية التحميل | الفاتورة موجودة ولكن رقمها فريد فريد ولا عملية draft/issue/lock منفصلة | يحتاج دورة حياة issue/approval (OD-07) |
| UCR إلزامي لتأكيد الحجز | `bookings.ucr` nullable اختياري، لا بوابة | يحتاج gate confirmation + سجل استبدالات (B05) |
| إصدارات الحجوزات | `bookings.version` فقط، لا جدول إصدارات | يحتاج BookingVersion |
| الحقول المخصصة على 5 عائلات | موجود | متطابق |
| قفل قاعدة Rule C بعد إكمال الحالة | موجود تسلسلياً | concurrency غير محمي (F-05) |
| حذف المتطلبات مع أرشفة التاريخ | حذف فعلي مع cascade | يحتاج OD-08 |
| FOB=goods، CFR=goods+freight | الإجمالي صريح مخزن، لا معادلة تلقائية | OD-06 يحدد ما إذا تُطبق قيمة محسوبة |

---

## 10) قرارات الملاك المفتوحة (OD-01..OD-17)

جميع القرارات في `ExportFlow_Open_Decisions_2026-10-23.md` **PENDING**، ولا يجوز افتراضها كتنفيذ:

- OD-01: وجود فاتورة مبدئية (Proforma) منفصلة.
- OD-02: مَن يُصدر أرقام عروض الأسعار.
- OD-03: هل يجب أن تستند الفاتورة النهائية إلى عرض سعر واحد على الأقل.
- OD-04: دمج عرضين سعر أو أكثر في فاتورة واحدة.
- OD-05: أساس عدد الحاويات لاحتساب الشحن (CFR).
- OD-06: هل الإجمالي المحسوب مقترح أم قفل، وكيف يتعامل مع القيم التاريخية المخزنة.
- OD-07: دورة حياة الفاتورة: مسودة → صادرة → مقفلة، وصلاحيات التعديل بعد الإصدار.
- OD-08: هل يمكن حذف متطلب مستند لديه نسخ/مراجعات نهائياً.
- OD-09..OD-17: إغلاق استثنائي، مناطق زمنية/DST، إثبات مشاركة UCR، إصدار الحجز الحاكم، محتوى الفاتورة المطبقة، التحصيل، دورة حياة عرض السعر، رقم ضريبةparty، نسخ الشهادات.

---

## 11) الأدلة والتقارير السابقة

`[PREVIOUSLY REPORTED]`
- 53/53 اختباراً ناجحاً في `vitest.json` (عزل node:sqlite + fake-auth).
- 44/44 بنداً PASS في مصفوفة الإصلاح.
- 21 أثراً (00–20) + التقرير النهائي العربي (50 قسم).
- بصمات 27 ملف مصدر postoperative تتطابق حالياً (27/27).

`[OBSERVED]`
- التقرير النهائي السابق ينتهي بتذييل `STOP` مع `FINAL_STATUS: PARTIAL`، `ISOLATED_REMEDIATION: GO`، `PRODUCTION_DEPLOYMENT: NO_GO`.
- `REAL_DEVELOPER_DB_UPGRADE: NOT_TESTED`، `CROSS_ISOLATE_IDEMPOTENCY_RACE: NOT_TESTED`، `VISUAL_REGRESSION: NOT_TESTED`.

`[UNVERIFIED]` لم تُعاد أي من هذه الاختبارات في هذه المراجعة.

---

## 12) التوصيات والخطوة التالية وموقف الإيقاف

### توصيات قبل أي ممارسة تشغيلية مرخصة

1. **إصلاح P0/P1 في الكود** (بعد إذن منفصل):
   - إضافة `caseVisibilitySql` إلى `casesCsv` و`delayReport` (F-01).
   - تضمين `expected_containers` في قرار إكمال الحالة، أو توثيق الاستثناء managerial بشكل صريح (F-02).
   - منع `removeRequirement` عند وجود نسخ/مراجعات، أو استبداله بأرشفة soft-delete (F-03).
   - إضافة سياسة إعادة تفويض لـ `PUT /api/v1/export-cases/:id/custom-fields` (F-04).
   - جعل حماية آخر مدير تزامنية (transaction أو فحص لاحق) (F-05).
   - ربط Playwright `storageState`/`adminCreds`/`runStamp` بجذر التشغيل المعزول الجديد، أو منع E2E حتى الإصلاح (F-06).
   - تعطيل مسارات `__test` في بناء الإنتاج (F-08).

2. **قرارات الملاك أولاً**: OD-01..OD-08 على الأقل، ثم BR v1.0 موافق عليه من الملاك، ثم تحديث AGANT.MD/HANDOFF.MD/AGENTS.md بإذن.

3. **التحقق التشغيلي لاحقاً** (غير مرخص الآن):
   - ترحيل 0007→0008 على D1 رسمي populated في جذر مؤقت معزول.
   - تشغيل Hono + Better Auth + D1 حقيقي معزول.
   - E2E بعد إثبات العزل.

### status النهائي

لا نموذج عمل معطل، لكن архитектура الحالية لا تدعم المتطلبات التجارية الجديدة المقترحة (عروض الأسعار، UCR إلزامي، إصدارات حجوزات)، وهناك فجوات أمان وبيانات يجب إغلاقها قبل أي مرحلة تشغيلية.

---

CONTEXT_LOADED: YES  
PROJECT_UNDERSTANDING: COMPLETE  
SOURCE_VERIFICATION: PARTIAL  
CURRENT_STAGE: READ_ONLY_VERIFICATION_REPORT_COMPLETE  
NEXT_PROPOSED_STAGE: ET-2026-10-21-B — Isolated Runtime Integration & Migration Acceptance (PROPOSED, NOT AUTHORIZED)  
OWNER_APPROVAL_REQUIRED: YES  
EXECUTION_PERFORMED: NO  
STOP
