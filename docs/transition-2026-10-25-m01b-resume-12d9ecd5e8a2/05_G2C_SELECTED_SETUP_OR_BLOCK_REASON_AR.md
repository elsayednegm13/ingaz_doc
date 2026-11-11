# M01-B RESUME — 05: G2c المسبار المختار (setup-only)

**قرار G2c: `PASS`** — الدليل الخام: `evidence/g2c-summary.json` + `evidence/g2c-launcher-stderr.txt`.

## 05.1 الإثبات الساكن قبل الإطلاق

| البند | الدليل |
|---|---|
| الاختيار الضيق | `--project=setup --grep "E2E-01 bootstrap"` → اختبار واحد بالضبط (`playwright.config.ts:48` testMatch + تنفيذ فعلي: «Running 1 test») |
| لا E2E كامل | مشروع `e2e` له تبعية على setup لكنه **غير مُختار**؛ لا globalSetup في الضبط |
| webServer آمن | `playwright.config.ts:59-71` يطلق مشغّلنا المُدقق بنفس الجذر (`EXPORTFLOW_E2E_ROOT: runRoot`، `reuseExistingServer:false`، ينتظر `/api/v1/health`) |
| لا تنزيل متصفح | قناة `chrome` النظام (موجودة) — بلا PLAYWRIGHT_BROWSERS download |
| العزل | `EXPORTFLOW_E2E_ROOT=<pwRoot>` (غير موجود مسبقًا)؛ TMP/TEMP → `<pwTmp>` مملوك منفصل (**ليس داخل pwRoot** حفاظًا على شرط الطزاجة)؛ env قائمة سماح؛ `--output <pwTmp>/pw-test-results` + `--reporter=line` (تجاوز html وتجنب كتابة `playwright-report/` في جذر المشروع) |
| المنفذ | 43174 حصرًا (مقيد في الضبط) — مُتحقَّق حر مرتين |

## 05.2 النتائج المرصودة (OBSERVED_RUNTIME)

- **`1 passed (1.1m)`** — `[setup] e2e/setup.spec.ts:5 E2E-01 bootstrap is one-shot and login reaches the dashboard`؛ exit code **0** في 72.2s.
- webServer داخليًا: ترحيلات **0001→0008 كلها ✅** على قاعدة اصطناعية جديدة داخل `<pwRoot>/state`، والأسرار من **`<pwRoot>/.dev.vars.e2e`** (سطر wrangler الحرفي) — تأكيد تشغيلي ثانٍ مستقل لإغلاق OB-01/OB-02 عبر سلسلة Playwright الكاملة.
- **سلسلة الجلسة في نفس الجذر:** `admin.json` + `run.json` + `wrangler.e2e.generated.jsonc` + `.dev.vars.e2e` + **`admin-state.json` (521 بايت — الوجود/الحجم فقط، لا قراءة محتوى)**. `stamp.txt` غائب — متوقع: الاختبار المختار لا يستدعي `runStamp()`.
- teardown نظيف: playwright أوقف webServer (exit 0 كليًا)؛ CIM الختامي بوسم الجولة = **لا عمائل runtime**.
- تحذيرات حميدة رُصدت: Better Auth rate-limit IP fallback (محلي) و«Invalid password» (خطوة كلمة المرور الخاطئة المتعمدة في الاختبار).

## 05.3 حدود G2c

- هذا مسبار دورة حياة/جلسة ضيق فقط: **ليس** قبول E2E كاملًا ولا قبول منطق أعمال؛ الاختبار يتحقق من one-shot bootstrap + تسجيل دخول + حفظ storageState في الجذر الصحيح.
- ملفات تعريف Chrome المؤقتة كُتبت تحت `<pwTmp>` (نظفتها playwright بعد الإغلاق — القائمة العليا تحتوي الكاش والمخرجات فقط).
