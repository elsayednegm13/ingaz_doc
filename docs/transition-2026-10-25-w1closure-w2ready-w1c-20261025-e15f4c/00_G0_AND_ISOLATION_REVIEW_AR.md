# G0 — مراجعة الأثر والأمان قبل أي تشغيل | W1-CLOSE + W2-READY

- **معرّف الجولة:** `EXPORTFLOW-W1-CLOSE-W2-BR-READY-20261025`
- **RUN_ID:** `w1c-20261025-e15f4c`
- **التاريخ المحلي:** 2026-10-25
- **جذر المشروع:** `I:\WORK\InjazDocs`
- **حالة الأساس:** W1 السابق `PARTIAL` (تقرير تاريخي، لا يُعاد كحقائق).
- **حالة الإصدار:** LOCAL/PARTIAL؛ Staging/Production = NO-GO.

## 1. بصمات «قبل» — معالجة انحراف W1

في W1 لم تُلتقط بصمات SHA-256 قبل أول تعديل. في هذه الجولة تم الالتقاط **قبل أي تعديل مصدري**:

- الملف: `pre/hashes-pre.json`
- العدد: **215 ملفًا**
- النطاق: `server/**`, `shared/**`, `e2e/**`, `scripts/**`, `tests/**`, `src/**` (قراءة فقط) + `vite.config.ts`, `playwright.config.ts`, `package.json`, `pnpm-lock.yaml`, `tsconfig*.json`, `wrangler.jsonc` + `drizzle/migrations/0001..0008`.
- بصمة `vite.config.ts`: `a36cbddee7b7becb3af24cdac8f8e8dd8b3e6048bbe3598dc08e200eb381b830`
- بصمة `playwright.config.ts`: `27f67bc7309aee388c45a5ce1c4ee7887d7430d369a637c215a876ab51861c58`
- عدد ملفات الترحيل: 8 (0001..0008) — **لم تُعدل**.

أي ملف يظهر في `pre/hashes-pre.json` ولم يتغير بعد الجولة يُعد غير معدَّل. تُحفظ بصمات «بعد» في `pre/hashes-post.json` ويُشتق الفرق في تقرير المصدر.

## 2. مراجعة مسارات العزل (G0.2)

| المسار | الحالة المرصودة | الأثر على هذه الجولة |
|---|---|---|
| `vite.config.ts` | `envDir` مثبت إلى `<runRoot>/vite-env` في وضع الاختبار؛ `configPath` إلزامي داخل الجذر؛ `remoteBindings: false`؛ حارس `EXPORTFLOW_PERSIST` يرفض `.wrangler/state` والجذور التاريخية | يبقى كما هو؛ Playwright يستخدمه |
| `playwright.config.ts` | `EXPORTFLOW_E2E_ROOT` إلزامي؛ `storageState` داخل الجذر؛ child-env allowlist؛ `webServer` يستدعي `scripts/e2e-server.mjs` | يبقى كما هو؛ التشغيل الموجه يمرره صراحة |
| `scripts/e2e-server.mjs` | يولّد `wrangler.e2e.generated.jsonc` و`.dev.vars.e2e` داخل الجذر؛ يطبّق الترحيلات على `state/`؛ يتحقق من `main` وغياب الحقول البعيدة | لم يُعدَّل |
| `scripts/isolation-guard.mjs` | يفرض جذرًا يبدأ بـ`.wrangler-safety-20261021-`؛ يرفض الجذور المحمية lexical-first قبل أي `stat` | يُستخدم لكل جذور هذه الجولة |
| `shared/isolation.ts` | denylist lexical فقط، بلا I/O على المسارات المحمية | لم يُعدَّل |
| `tests/isolation-safety/m01a3-…`, `m01b1-…` | يشترطان حرفيًا `EXPORTFLOW_E2E_ROOT: runRoot` ويستخرجان دوال `e2e-server.mjs` نصيًا | لم يُمسّا؛ لا نقل/إعادة تسمية |

**الأسرار:** لم يُقرأ `.dev.vars` ولا `.dev.vars.e2e` في جذر المشروع. كل تشغيل يولّد `.dev.vars.<env>` اصطناعيًا داخل jذر مملوك. لا تُنسخ قيم الأسرار إلى مجلد الأدلة؛ تُسجل أسماء المفاتيح وبصمات فقط عند الحاجة.

**الجذور المحمية:** لم يُدخل `.wrangler/state` ولا `.wrangler-e2e` ولا `.wrangler-perf` ولا `.wrangler-reliability-*` ولا `.wrangler-transition-audit-*` ولا جذور W1/M01. الحارس يمنعها قبل أي وصول.

## 3. R-TRANSPORT-STARTUP (G0.3)

الفرضيات البديلة محفوظة كما هي: زمن إقلاع workerd/Vite (22–35 ثانية)، أول `fetch` يفشل بـ`fetch failed` قبل جاهزية المستمع، سلوك undici pool، وtimeout العميل. `setTimeout(320ms)` في `vite.config.ts` **ليس سببًا جذريًا** ولا يُعلن إغلاقًا. في هذه الجولة:
- D-3 يستخدم `wrangler dev` (workerd مباشر) مع readiness polling حتى 180 ثانية وتسجيل كل محاولة.
- Playwright يستخدم `webServer.timeout=180s` القائم، ويُسجل أول فشل/إعادة محاولة إن حدث.
- إذا فشل الإقلاع الأول ثم نجح، يُسجل `INTERMITTENT_OPEN` ولا يُوصف بأنه PASS موثوقية.

## 4. فصل D-3 (G0.4) — القرار

**نقطة الحقن الموجودة:** `createApp(deps)` في `server/http/app.ts` تقبل `failBootstrapCompensation` و`failUserCompensation`، و`createAuth`. الإنتاج يستدعي `createApp()` بلا وسائط في `worker/index.ts`؛ لا يمكن تفعيل أي عطل من header/query/cookie/body.

**لماذا لا يكفي harness الوهمي:** اختبارات `tests/transition-2026-10-21/d3.test.ts` تستخدم fake auth وSQLite في الذاكرة. المطلوب في هذه الجولة هو **real path**: Hono + Better Auth الحقيقي + D1 حقيقي + HTTP حقيقي.

**الحل المعتمد:** Worker entry اختباري `tests/w1/d3-worker.ts` يُبنى فقط بواسطة `scripts/d3/run-d3.mjs` داخل `wrangler dev` على جذر مملوك. يقرأ الوضع من **Worker var** في الإعداد المولَّد (`D3_MODE`, `D3_FAIL_EMAIL`) لا من الطلب. الأوضاع:
- `CONTROL`: `createApp()` بلا عطل.
- `LINK_FAIL`: تغليف `createAuth` الحقيقي بحيث يفشل `internalAdapter.linkAccount` مرة واحدة للبريد المحجوز فقط.
- `COMPENSATION_FAIL`: `LINK_FAIL` + `failUserCompensation: true`.
- `INCIDENT_FAIL`: `COMPENSATION_FAIL` + غلاف `D1Database` يرفض إدراج `auth_compensation_incidents` فقط.

**البرهان السلبي:**
1. `wrangler.jsonc` → `main: "./worker/index.ts"`.
2. `worker/index.ts` → `const app = createApp();` بلا وسائط.
3. `tests/w1/d3-worker.ts` لا يُستورد من أي ملف إنتاجي؛ المرجع الوحيد هو `scripts/d3/run-d3.mjs`.
4. لا يوجد endpoint عام ولا header/secret override لتفعيل العطل.
5. الجذر والإعداد والمنفذ والقيم كلها مملوكة للجولة وتُحذف/تُعزل بعدها.

إذا فشل هذا الفصل عمليًا ⇒ `D3=BLOCKED_TESTABILITY` ولا يُضاف switch عام.

## 5. GAP-07 وACL (G0.5)

- `reports.view_all` **غير موجود** في `shared/permissions.ts` ولا في seed `0002`؛ الموجود `reports.view` و`reports.export` و`export_cases.view_all`.
- `server/services/reports.ts` يفرض `reports.view`/`reports.export` ثم `caseVisibilitySql(actor,"c")` (إصلاح 2026-10-23-b). لا يجوز استنتاج `reports.view_all` من `export_cases.view_all`.
- الحد الآمن: مصفوفة قراءة/محاكاة على schema الحالي + مقترح `0009` نصي في `proposals/` فقط. لا منح صلاحية وهمية ولا تعديل seed.
- **الحالة:** `GAP-07 = BLOCKED_SCHEMA` (يحتاج قرار مالك + ترحيل لاحق).

## 6. GAP-09/GAP-10/GAP-11/GAP-12 (G0.6)

- `setUserActive` يكتب invariant داخل `UPDATE ... WHERE` (لا نافذة check-then-write)، و`restoreIfLastRootRemoved` يعيد الأدوار/التجاوزات عند فقدان آخر root. هذا هو السلوك القائم؛ لا يُعاد تنفيذ إصلاحه.
- `idempotency_keys.actor_id REFERENCES user(id) ON DELETE CASCADE` مرصود في `0005_idempotency.sql`؛ والـ`0008` يضيف أعمدة الشاهد `response_expires_at` و`outcome_class` و`effect_ref` دون تغيير هذا المفتاح. الأثر على الحذف/الاحتفاظ يُحلل في `proposals/0010` **كخيارات فقط**، دون تنفيذ.
- `GAP-11` (query-sensitive fingerprint) و`GAP-12` (غياب `Idempotency-Key`) يُسجلان كـP2 مع دليل المصدر؛ لا تغيير سلوك بلا قرار توافق خلفي.

## 7. Playwright الموجه (G0.7)

- مشروعان: `setup` ثم `e2e` (dependency). `workers: 1`, `retries: 0`, `channel: chrome`.
- الإخراج: `--reporter=list`, `--output <runRoot>/pw-output`، و`TMP/TEMP` داخل الجذر.
- `EXPORTFLOW_E2E_WRANGLER_CONFIG_PATH` يُمرَّر صراحةً إلى عملية Playwright لأنه مطلوب من `e2e/helpers.ts` لقراءة D1.
- السيناريوهات المستهدفة فقط (ACL، حارس الحجز/UCR، إعادة تعيين اعتماد النسخة، أخطاء، جلسة/كلمة مرور مؤقتة). لا E2E أعمال كامل ولا W2/W3.
- إذا احتاج سيناريو بيانات غير اصطناعية أو remote ⇒ `NOT_RUN` ولا التفاف.

## 8. مصفوفة GO/NO-GO

| النشاط | القرار | الشرط |
|---|---|---|
| D-3 real-path (workerd/D1/Better Auth) | **GO** | جذر جديد، منفذ مخصص، إعداد مولَّد، لا أسرار أصلية |
| Playwright موجّه | **GO** | جذر جديد، Chrome محلي، لا remote |
| Vitest/tsc/oxlint/e2e-typecheck | **GO** | لا يلمس جذورًا محمية |
| تعديل مصدر W1 آمن | **GO محدود** | فقط عند فشل يثبته اختبار، مع اختبار جديد/معدل وبصمات قبل/بعد |
| تطبيق `0008` على قاعدة مطور/حقيقية | **NO-GO** | غير مأذون |
| إنشاء/تطبيق `0009`/`0010` | **NO-GO** | مقترحات نصية فقط |
| Git / remote / Cloudflare / تثبيت حزم | **NO-GO** | ممنوع قاطعًا |
| W2/W3 implementation | **NO-GO** | وثائق فقط |

**الخلاصة:** لا خطر مشترك يمنع بدء التشغيل المعزول. أي ظهور لوصول محمي أو remote أو سر حقيقي ⇒ STOP شامل فوري.

```text
CHECKPOINT: EXPORTFLOW-W1-CLOSE-W2-BR-READY-20261025
GATE: G0 — SOURCE/ISOLATION REVIEW
PROTECTED_ROOTS_TOUCHED: NO
REAL_SECRETS_READ: NO
REMOTE_USED: NO
MIGRATIONS_0001_0008_MODIFIED: NO
0009_0010_CREATED: NO
W1_CLOSURE_STATUS: PARTIAL_WITH_EVIDENCE
W2_CONTRACT_READINESS: PREPARED_FOR_OWNER_DECISION
W2_IMPLEMENTATION_AUTHORIZED: NO
STAGING: NO_GO
PRODUCTION: NO_GO
NEXT_STEP: OWNER_REVIEW_ONLY
STOP
```

