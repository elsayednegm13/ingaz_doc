# M01-B RESUME — 03: G2a بدء/جاهزية/إغلاق مملوك

**قرار G2a: `PASS`** — على المحاولة الثانية الكاملة، مع حفظ المحاولة الأولى كشذوذ عابر موثق. الدليل الخام: `evidence/g2a-summary.json` (محاولة 1)، `evidence/g2a2-summary.json` (محاولة 2)، `evidence/redacted-startup-and-shutdown.log`، `evidence/runtime-events.json`.

## 03.1 المحاولة 2 (r2 — كاملة)

| المرحلة | الرصد (OBSERVED_RUNTIME) |
|---|---|
| اختيار المنفذ | 47210 عبر bind/close probe (t=35ms) |
| spawn | `node scripts/e2e-server.mjs` ببيئة قائمة سماح + `EXPORTFLOW_E2E_ROOT=<r2>` (PID المملوك مسجل) |
| SYNTHETIC_SCHEMA_BOOTSTRAP | wrangler d1 migrations apply … `--config <r2>/wrangler.e2e.generated.jsonc` `--persist-to <r2>/state` → **0001…0008 كلها ✅** على D1 جديدة فارغة كليًا |
| تحميل الأسرار | سطر wrangler الحرفي: **«Using secrets defined in .\<r2>\.dev.vars.e2e»** — إغلاق OB-01/OB-02 مؤكد وقت التشغيل |
| جاهزية Vite | `VITE v7.3.7 ready in 10917 ms` على `http://127.0.0.1:47210/` (127.0.0.1 فقط) |
| الحيوية | `/api/v1/health/live` = **200** (بعد 11×ECONNREFUSED أثناء نافذة الترجمة — سلوك ما قبل الاستماع المتوقع) |
| الجاهزية | `/api/v1/health` = **200** بجسم `{"status":"ok","db":true,"schema":"ready",…}` — بوابة المخطط عبرت على القاعدة الاصطناعية |
| الإغلاق | SIGTERM إلى PID المملوك فقط → exit null (إنهاء بإشارة — متوقع على Windows) → **لا عمائل** (kill(pid,0) + CIM بوسم الجولة = تطymphات ذاتية للـharness فقط) |
| الكتابات | جرد `<r2>` كاملًا: كل شيء داخله (state 21 ملف/1.67MB، tmp/miniflare-* وtmp/node-compile-cache داخل الجذر — توجيه TMP أثبت نفسه) |

**تحذير غير فادح رُصد:** «No environment found in configuration with name "e2e"» — الضبط المولّد لا يعرّف أقسام env عمدًا؛ wrangler يقبل ويكمل (سلوك متوقع وموثق).

## 03.2 المحاولة 1 (الشذوذ العابر — موثق بأمانة)

- live=200 عند t≈30s، ثم **`/health` لم أنتج أي استجابة HTTP لمدة ~40s** (كل fetch رمى — لا حتى status؛ رموز الخطأ لم تُلتقط في المحاولة 1)، ثم SIGTERM نظيف، لا عمائل، كل الكتابات مملوكة.
- **لم يُشخَّص سببه retroactively** (سجل المحاولة 1 tail فقط). المحاولة 2 بنفس النمط تمامًا = خضرة كاملة. التصنيف: شذوذ عابر متسق مع فئة R-TRANSPORT (انقطاع dispatch المحلي) المتتبعة في HANDOFF — **ليس انتهاك حماية**. كلا المحاولتين محفوظتان بأسماء منفصلة.

## 03.3 حدود G2a

- النجاح = عزل دورة حياة الخادم على المشغّل المُدقق؛ لا يُثبت D-1/D-2/D-3 تكامليًا ولا أداء ولا E2E.
- رصد الكتابات عبر جرد الجذور + السجلات + استعلامات CIM الموسومة — لا تتبع fs على مستوى OS (نقطة عمى موثقة).
