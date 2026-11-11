# M01-B RESUME — 02: الجذور المملوكة والبيئة (G1 منفذ)

**قرار G1: PASS** — كل البنود نُفذت وأُثبتت قبل أول spawn. التفاصيل الخطة في تقرير `02` (manifest)؛ هذا الملخص التنفيذي بالحقائق المرصودة.

## 02.1 الجذور المملوكة الخمسة (كلها محتفظ بها كأدلة)

| الجذر | الغرض | الحالة النهائية |
|---|---|---|
| `.wrangler-safety-20261021-m01b-resume-12d9ecd5e8a2` | G2a محاولة 1 | 6 ملفات + state/** + tmp/** (محفوظ) |
| `…-12d9ecd5e8a2-r2` | G2a محاولة 2 (الكاملة) | state: 21 ملف/1,671,432 بايت |
| `…-12d9ecd5e8a2-fail` | G2b بروفة الرفض | dummy-marker.txt فقط — الخادم لم يكتب شيئًا |
| `…-12d9ecd5e8a2-pw` | G2c عبر Playwright | state: 21 ملف/2,606,688 بايت + admin-state.json (521 بايت) + admin.json + run.json + الضبط المولّد + .dev.vars.e2e |
| `…-12d9ecd5e8a2-pwtmp` | TMP للـPlaywright/Chrome + المخرجات | playwright-transform-cache + pw-test-results |

- الصيغة تلتزم علامة الحارس `.wrangler-safety-20261021-` (اكتشاف G0: مثال التفويض كان سيُرفض).
- **الفرادة بالإنشاء الحصري:** جذور G2a/G2c مُرِّرت **غير موجودة** وأنشأها المشغّل بنفسه (شرط الطزاجة)؛ جذر G2b بُذر عمدًا لإثبات الرفض.

## 02.2 بيئة الابن المرصودة (NAMES فقط)

- قائمة السماح نُفذت كما في الـmanifest: لا AUTH_*/TOKEN/CLOUDFLARE_* موروثة، لا USERPROFILE/HOME/APPDATA/LOCALAPPDATA، لا NODE_OPTIONS/npm_config_*/VITE_*.
- `CLOUDFLARE_ENV=e2e` عند vite حصرًا؛ `WRANGLER_SEND_METRICS=false` و`CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false` للجميع؛ TMP/TEMP → `<runRoot>/tmp` (أثبت نفسه: `tmp/miniflare-*` و`tmp/node-compile-cache` داخل الجذور).
- بيانات الاعتماد الاصطناعية وُلّدت بواسطة المشغّل داخل الجذور (randomBytes)؛ **لا قيمة سر في أي سجل/تقرير/أداة**.

## 02.3 المنافذ والشبكة

- G2a: 47210 (probe ثم استخدام)؛ G2b: 48310 (لم تُستخدم — رفض قبل الربط)؛ G2c: 43174 (حرّتان قبل التشغيل).
- كل الربط `127.0.0.1`؛ المرور كله loopback محلي مملوك؛ لا طلب خارجي رُصد في أي سجل.

## 02.4 البرمجيات المملوكة الجديدة (ضمن مجلد الأدلة — مصرّح بها)

`g2a-harness.mjs`، `g2a-harness2.mjs` (محاولة 2 المجهزة)، `g2b-harness.mjs`، `g2c-launcher.mjs` — كلها spawn/مراقبة/إغلاق للعمليات المملوكة فقط، مع تحقق يتامى بطريقتين: `kill(pid,0)` على PIDs المملوكة + استعلام CIM **مقيد بوسم هذه الجولة** في سطر الأوامر.
