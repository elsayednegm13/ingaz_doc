# تقرير الهندسة النهائي — الموجة W1
## ExportFlow / InjazDoc — `ExportFlow-W1-UNIFIED-2026-10-25`

| البند | القيمة |
|---|---|
| معرّف نقطة التحقق | `ExportFlow-W1-UNIFIED-2026-10-25` |
| أمر المالك | `W1-UNIFIED-EXECUTION-01` بتاريخ 2026-10-25 |
| مجلد الأدلة | `docs/transition-2026-10-25-w1-w1unified-20261025-771359/` |
| الجذر التشغيلي الرئيسي | `.wrangler-safety-20261021-w1unified-20261025-771359` |
| البيئة | Windows / Node `v24.22.1` / Wrangler `4.149.0` / مدير الحزم `pnpm` (lockfile غير معدَّل) |
| نوع التفويض | محلي اصطناعي فقط — لا Remote ولا Staging ولا Production |
| الحالة النهائية | **PARTIAL** (محليًا) — `STAGING: NO_GO` / `PRODUCTION: NO_GO` |
| W2 | **غير مأذونة** |

---

## 1. الحكم التنفيذي

نُفِّذت البوابات **G0 → G5** كاملة داخل نطاق التفويض المحلي، وأُغلقت **تسعة** فجوات مصدرية/سلوكية (GAP-01, 02, 03, 04, 05, 08, 09, 14, 15) بإصلاحات مطبَّقة واختبارات قابلة للتكرار، مع تراجع كامل `106/106` اختبارًا و`tsc -b` و`oxlint` وفحص TypeScript مستقل لـ`e2e/**` بلا أي تشخيص.

لكن الحالة **PARTIAL وليست CLOSED**، لثلاثة أسباب موضوعية لا يجوز تجميلها:

1. **GAP-07** (`reports.view_all`) يتطلب مفتاح صلاحية جديدًا + ترحيل `0009`، ولم يُؤذَن بإنشاء ترحيل جديد ⇒ `BLOCKED_SCHEMA`.
2. **OD-08** (سياسة الحذف/الأرشفة) و**OD-09** (سياسة الإغلاق الاستثنائي) قراران تجاريان للمالك لم يُحسما ⇒ `BLOCKED_CONTRACT`، ولم تُفترض أي سياسة بديلة.
3. **D-3 real-runtime** (تعويض الحوادث عبر HTTP حقيقي) لم يُستحضَر: مسار التعويض لا يمكن إجباره من خارج العملية دون خطاف اختبار داخلي ⇒ `NOT_VERIFIED`، والدليل المتاح هو اختبارات وحدة/هارنس فقط.

كما أن **الترحيل 0008 لم يُطبَّق** على قاعدة المطور أو أي قاعدة حقيقية، ولم يُقرأ أو يُلمس `.wrangler/state` أو أي جذر تاريخي.

---

## 2. نتائج البوابات

| البوابة | النطاق | النتيجة | الدليل |
|---|---|---|---|
| **G0** | تدقيق ساكن + إصلاح تسريب البيئة ومسار Wrangler | **PASS** | `01_SOURCE_DELTA...` + `source-hashes-post.json` |
| **G1** | ترحيل D1 مأهول `0007 → 0008` (نجاح + فشل ذري) | **PASS / PASS_FAILURE** | `evidence/attempt-06/`, `evidence/attempt-07-failure/` |
| **G2** | تكامل حقيقي Worker/Hono/Better Auth/D1 | **PASS** (D-3 real = NOT_VERIFIED) | `evidence/g2-attempt-03/` |
| **G3** | إغلاق GAP-01..05, 08, 09 مصدريًا | **PASS** | تغييرات المصدر + `tests/w1/w1-integrity.test.ts` |
| **G4** | `tsc -b`, `oxlint`, فحص E2E مستقل, تراجع كامل | **PASS** | `g4-tsc-build-02.log`, `g4-oxlint-final.log`, `g4-e2e-typecheck-02.log`, `g4-vitest-run-0{1,2}.log` |
| **G5** | حزمة الأدلة + بوابة الانتقال | **PASS_WITH_OPEN_BLOCKERS** | هذا التقرير + `05_RISK_AND_TRANSITION_GATE_AR.md` |

### 2.1 الأرقام الحاسمة

| القياس | القيمة | التصنيف |
|---|---|---|
| جداول قبل 0008 | 56 | `OBSERVED_RUNTIME` |
| جداول بعد 0008 | 57 | `OBSERVED_RUNTIME` |
| جداول محفوظة حرفيًا | 54 | `OBSERVED_RUNTIME` |
| جداول جديدة | `auth_compensation_incidents` | `OBSERVED_RUNTIME` |
| أعمدة جديدة | 5 (`customer_import_operations` ×2، `idempotency_keys` ×3) | `OBSERVED_RUNTIME` |
| فهارس جديدة | 2 (`auth_compensation_incidents_open_idx`, `idempotency_keys_witness_idx`) | `OBSERVED_RUNTIME` |
| `foreign_key_check` | 0 مخالفة | `OBSERVED_RUNTIME` |
| `integrity_check` | `ok` | `OBSERVED_RUNTIME` |
| فشل 0008 المتعمد | exit 1 + تراجع كامل (56 جدولًا، `d1_migrations` = 7) | `OBSERVED_RUNTIME` |
| اختبارات W1 | 18/18 | `OBSERVED_TEST` |
| تراجع كامل (قبل إضافة W1) | 88/88 في 15 ملفًا | `OBSERVED_TEST` |
| تراجع كامل (بعد إضافة W1) | 106/106 في 16 ملفًا | `OBSERVED_TEST` |
| `tsc -b` | 0 تشخيص | `OBSERVED_TEST` |
| `oxlint` (الملفات المعدّلة) | 0 تحذير | `OBSERVED_TEST` |
| فحص E2E مستقل | 0 تشخيص / 18 ملفًا | `OBSERVED_TEST` |
| عمليات Node يتيمة بعد التشغيل | 0 | `OBSERVED_RUNTIME` |

---

## 3. ما أُصلح فعليًا (ملخص)

| الفجوة | الإصلاح | الاختبار |
|---|---|---|
| GAP-01 | الإغلاق الطبيعي يتطلب `delivered ≥ expected` قبل أي نجاح مبكر؛ الحاوية الملغاة لا تُحتسب مسلَّمة | W1-01..04 |
| GAP-02 | النسخة الجديدة تعود دائمًا إلى `UPLOADED` ولا ترث `APPROVED/WAIVED` | W1-07, W1-08 |
| GAP-03 | حذف المتطلب ذرّي داخل `DELETE ... WHERE NOT EXISTS` + `meta.changes` | W1-09..11 |
| GAP-04 | لا تأكيد حجز بلا `UCR` فعّال (إنشاء وتحديث) | W1-12, W1-13 |
| GAP-05 | سقف الإغلاق = `max(expected_containers, non-cancelled slots)` | W1-05, W1-06 |
| GAP-08 | حماية آخر مدير جذر عبر `UPDATE ... WHERE` ذرّي، لا فحص ثم تنفيذ | W1-14..16 |
| GAP-09 | فشل تخزين حادثة التعويض يُبلَّغ بـ`persisted:false` + correlation id | W1-17, W1-18 |
| GAP-14 | سلسلة أسرار E2E: `envDir` معزول لـVite + `--config` إلزامي لـWrangler | فحص مصدري + G2 |
| GAP-15 | قائمة بيئة مسموحة في Playwright بدل توريث `process.env` | فحص مصدري + G2 |

---

## 4. الأدلة والتصنيف

كل دليل في هذه الحزمة مصنَّف بأحد التصنيفات التالية:

- `OBSERVED_SOURCE`: مقروء من المصدر الحالي أو من فرق مطبَّق.
- `OBSERVED_TEST`: ناتج أمر اختبار/فحص محفوظ في `evidence/`.
- `OBSERVED_RUNTIME`: ناتج تشغيل Worker/D1 حقيقي على جذر معزول.
- `PRIOR_REPORT`: مأخوذ من تقرير سابق، غير مُعاد التحقق منه اليوم.
- `INFERRED`: استنتاج غير مقيس.
- `NOT_VERIFIED`: مطلوب ولم يُنفَّذ.
- `NOT_RUN`: لم يُشغَّل إطلاقًا.

فهرس الأدلة الكامل في `evidence/INDEX_AR.md`.

---

## 5. ما لم يُلمس (دليل سلبي)

| العنصر | الحالة |
|---|---|
| `.wrangler/state` | لم يُقرأ، لم يُعدَّد، لم يُكتب |
| الجذور التاريخية `.wrangler-e2e`, `.wrangler-perf`, `.wrangler-reliability-*`, `.wrangler-transition-audit-*` | لم تُدخل |
| `.dev.vars` و`.dev.vars.e2e` في جذر المشروع | لم يُقرآ ولم يُمَسّا (وجودهما مسجَّل سابقًا — `PRIOR_REPORT`) |
| Git (أي أمر) | لم يُنفَّذ |
| Cloudflare Remote / Staging / Production / R2 | لم يُلمس |
| تثبيت/تحديث حزم | لم يُنفَّذ |
| ملفات `drizzle/migrations/0001..0008` | لم تُعدَّل |
| ترحيل `0009` | لم يُنشأ |
| Quotation / W2..W6 | لم يبدأ |

---

## 6. الانحرافات والقيود (إفصاح كامل)

1. **بصمات «قبل» غير ملتقطة**: لم تُحسب SHA-256 للملفات قبل التعديل ⇒ `NOT_CAPTURED`. المتاح: بصمات «بعد» في `evidence/source-hashes-post.json` والمناطق المتغيرة مقتبسة حرفيًا في `01_SOURCE_DELTA...`. هذا قيد في قابلية التدقيق، لا في صحة الإصلاح.
2. **محاولات G1 الأولى (attempt-01..05)**: لم تُعتمد لأن الهارنس نفسه كان قيد التصحيح، لا لأن المنتج فشل:
   - `attempt-01/02`: توقفا قبل إنتاج ملخص.
   - `attempt-03`: `FAIL` بسبب خلل في مقارنة الجداول (`preservedTables=0` وقائمة تغييرات مشوَّهة).
   - `attempt-04`: `PASS` غير صالح لأن لقطة «قبل» كانت فارغة (`tablesBefore=0`).
   - `attempt-05`: `FAIL` لأن الهارنس لم يكن يسمح بالتغيّر المتوقع في `d1_migrations`.
   السجل المعتمد هو `attempt-06` (نجاح) و`attempt-07-failure` (فشل ذري).
3. **`g2-attempt-01`**: سجّل `FAIL` لأن هارنسي توقّع `409` بينما العقد الثابت في `app.ts:506` هو `422 IDEMPOTENCY_KEY_REUSED`. سلوك المنتج كان صحيحًا؛ صُحّح الهارنس وأُعيد التشغيل في `attempt-02` و`attempt-03` (كلاهما PASS).
4. **ملفات علامات التشغيل**: أُنشئت `.w1-run-id.txt` و`.w1-run-id-2..10.txt` في جذر المشروع (خارج قائمة السماح) لتثبيت معرّفات الجذور. تحتوي معرّفات فقط، بلا أسرار.
5. **أثر بناء**: `tsc -b` يكتب `node_modules/.tmp/*.tsbuildinfo` (أثر بناء عادي، خارج المصدر).
6. **أمر تعداد واحد**: نُفِّذ `Get-ChildItem -Name` على جذر المشروع فعرض أسماء الجذور المحمية **دون الدخول إليها**. هذا تعداد أسماء فقط ويُفصح عنه هنا.
7. **Playwright لم يُشغَّل**: Chrome موجود على الجهاز، لكن حزمة المتصفح لم تُنفَّذ في W1؛ التكامل أُثبت عبر HTTP مباشر على نفس الـWorker الحقيقي.
8. **تحذيرات oxlint**: ظهرت 3 تحذيرات في ملفات الهارنس أثناء التطوير (استيراد غير مستخدم، إسناد ذاتي) وأُزيلت؛ السجل النهائي `g4-oxlint-final.log` نظيف.

---

## 7. بوابة الانتقال

| البوابة | القرار | السبب |
|---|---|---|
| محلي / تطوير | **PARTIAL — مسموح بحدود الأدلة** | 0008 مأهول ناجح على جذر اصطناعي فقط |
| Staging | **NO_GO** | OD-08/OD-09/GAP-07 + 0008 غير مصرَّح به لبيئة حقيقية |
| Production | **NO_GO** | نفس الأسباب + عدم وجود اختبار D-3 حقيقي |
| W2 | **NOT AUTHORIZED** | لا بدء تلقائي |

التفصيل في `05_RISK_AND_TRANSITION_GATE_AR.md`.

---

## 8. الملخص الإلزامي

```
CHECKPOINT: ExportFlow-W1-UNIFIED-2026-10-25
GATES: G0 PASS | G1 PASS | G2 PASS | G3 PASS | G4 PASS | G5 PASS_WITH_OPEN_BLOCKERS
W1_FINAL_STATUS: PARTIAL
FIXED_GAPS: GAP-01, GAP-02, GAP-03, GAP-04, GAP-05, GAP-08, GAP-09, GAP-14, GAP-15
BLOCKED_SCHEMA: GAP-07 (needs 0009, not authorized)
BLOCKED_CONTRACT: OD-08, OD-09
DEFERRED: GAP-06, GAP-13 (W3) | GAP-11, GAP-12 (P2 open)
D3_REAL_RUNTIME: NOT_VERIFIED
MIGRATION_0008_ON_REAL_DB: NOT_RUN
W2_AUTHORIZED: NO
STAGING: NO_GO
PRODUCTION: NO_GO
STOP
```
