# 01 — فرق المصدر والاعتماديات

## 1. ملخص

| النوع | العدد |
|---|---|
| ملفات معدَّلة | 13 |
| ملفات جديدة | 5 |
| اعتماديات مضافة/محدَّثة | 0 |
| ملفات ترحيل معدَّلة | 0 |

**إفصاح:** بصمات SHA-256 لما **قبل** التعديل لم تُلتقط (`NOT_CAPTURED`). المسجَّل هنا بصمات **بعد** التعديل، والمناطق المتغيرة مقتبسة حرفيًا في الأقسام التالية. هذا قيد تدقيقي معروف، وليس ادعاءً بوجود بصمات سابقة.

---

## 2. جدول البصمات (بعد التعديل)

| # | الملف | النوع | SHA-256 | بايت |
|---|---|---|---|---|
| 1 | `vite.config.ts` | معدَّل | `a36cbddee7b7becb3af24cdac8f8e8dd8b3e6048bbe3598dc08e200eb381b830` | 10955 |
| 2 | `playwright.config.ts` | معدَّل | `27f67bc7309aee388c45a5ce1c4ee7887d7430d369a637c215a876ab51861c58` | 3003 |
| 3 | `e2e/helpers.ts` | معدَّل | `6321cc3dc17a4b9355542e2e5b50ab10711d3bf874afbbf0a72af1d7e0b4df4b` | 11720 |
| 4 | `e2e/checkpoint06-shots.spec.ts` | معدَّل | `33cbf260f18ab0193da0d2ae2f633ca18ea7fcb7b93cc487c776d6cf1197565d` | 3934 |
| 5 | `e2e/shell-grid.spec.ts` | معدَّل | `7f4bf28249c84f377353e009ab253e7889781e7f556ec58b711c034dbf5fc2a2` | 5239 |
| 6 | `server/domain/case-completion.ts` | معدَّل | `c985fae37eb47c286ca1871f112ac3a8f33e5a94aa4ecfa1890d79a08aeb12f7` | 4392 |
| 7 | `server/domain/transitions.ts` | معدَّل | `0aed76f434441ca8c96f377ab18c92f82bfaec689297bf1a56c61d6dc7dd80f1` | 5758 |
| 8 | `server/services/cases.ts` | معدَّل | `0f37835cdc2f1372f8e0b1778ead8e302ac951433c94263d9fd5db5f17a5bcfc` | 30663 |
| 9 | `server/services/documents.ts` | معدَّل | `e81d4d08ea9f69bea33d11bbddce84047e536548193f2c68c4d3a5c7917bf60a` | 13289 |
| 10 | `server/services/bookings.ts` | معدَّل | `2cb07ccc06b25f54e03a3551b281a16f7e5f8a96d97dfdab6a36cad20b486434` | 19471 |
| 11 | `server/services/users.ts` | معدَّل | `25e618b37c874da21d2a3e8737ad8056fbc33c41f7d6d5dcf832ce130705ca03` | 11210 |
| 12 | `server/services/compensation.ts` | معدَّل | `b6f9108f87ecf613fd9ec76fadebfb11656fbf5ec0ec905eec19b0383c5b27d1` | 1965 |
| 13 | `server/http/app.ts` | معدَّل | `fb62c0c702253ee99fe34970996289fd248dd1e29e1a895d91711e0ff01564ac` | 48295 |
| 14 | `tests/w1/w1-integrity.test.ts` | جديد | `c3f85421fa16c3bc116530356dfa61afb68e155bd71f735750a85cda7ff08da6` | 19944 |
| 15 | `scripts/w1/g1-populated-migration.mjs` | جديد | `76669c4637756e504d7139b7885360d1c4afaa58e2d6927f7f060d708d6b9894` | 17707 |
| 16 | `scripts/w1/fixtures/seed-0007.sql` | جديد | `6542a7e831ba7b01ea29bca836885a9d3d054c5ad58634b45db7bcbbb0687d4c` | 16328 |
| 17 | `scripts/w1/g2-integration.mjs` | جديد | `11b7ef5e12e7822d058fa1f4a26a69d837ee741c4840273958e9187ff122193a` | 13319 |
| 18 | `scripts/w1/e2e-typecheck.mjs` | جديد | `47547bddef8329c749130893ef3fcd696119907483cba1cee23ca464e4eebebc` | 2148 |

النسخة الآلية: `evidence/source-hashes-post.json`.

---

## 3. تفصيل التغييرات

### 3.1 G0 — عزل البيئة والأسرار

| الملف | التغيير |
|---|---|
| `vite.config.ts` | إضافة `testEnvDir` داخل الجذر + `envDir: testMode ? testEnvDir : undefined`؛ لا تغيير في وضع التطوير |
| `playwright.config.ts` | `SERVER_ENV_ALLOWLIST` + `serverEnv()` بدل `...process.env`؛ إبقاء `EXPORTFLOW_E2E_ROOT: runRoot` حرفيًا |
| `e2e/helpers.ts` | تعريف `IsolatedPersistOptions` محليًا (كان استيراد نوع من `.mjs` ⇒ TS2305)؛ `wranglerConfigPath()` إلزامي؛ `wranglerEnv()` معقّمة؛ `--config` في `wranglerSql` و`wranglerRows` |
| `e2e/checkpoint06-shots.spec.ts` | حذف فرع ميت `if (path === "/settings")` من مجموعة لا تحتوي `/settings` (TS2367)؛ الفرع الصحيح في المجموعة الثانية بقي |
| `e2e/shell-grid.spec.ts` | `phase: phase ?? ""` في موضعي `manifest.push` (TS2322) |

### 3.2 G3 — إصلاحات الفجوات

| الملف | الفجوة | التغيير |
|---|---|---|
| `server/domain/case-completion.ts` | GAP-01 | فحص `deliveredContainerCount < expectedContainerCount` **قبل** أي مسار نجاح مبكر؛ الاستثناء المصرَّح يبقى أولًا ومشروطًا بالصلاحية |
| `server/services/cases.ts` | GAP-05 | `expectedContainerCount = Math.max(booking?.expected_containers ?? 0, activeContainerCount)` |
| `server/domain/transitions.ts` | GAP-02 | إضافة انتقالات `UNDER_REVIEW→UPLOADED`, `APPROVED→UPLOADED`, `WAIVED→UPLOADED` |
| `server/services/documents.ts` | GAP-02 | النسخة الجديدة `UPLOADED` دائمًا، لا ترث حالة المراجعة السابقة |
| `server/services/documents.ts` | GAP-03 | حذف المتطلب في عبارة واحدة `DELETE ... WHERE NOT EXISTS (document_versions) AND NOT EXISTS (document_reviews…)` + فحص `meta.changes` ⇒ `REQUIREMENT_HAS_VERSIONS` |
| `server/services/bookings.ts` | GAP-04 | رفض `CONFIRMED` أو ما بعده بلا `UCR` فعّال في الإنشاء والتحديث (`BOOKING_UCR_REQUIRED`) |
| `server/services/users.ts` | GAP-08 | تعطيل المستخدم عبر `UPDATE ... WHERE EXISTS (مدير جذر آخر)` ذرّي + `meta.changes`؛ مسارات الأدوار تحتفظ بالاسترجاع الدفاعي |
| `server/services/compensation.ts` | GAP-09 | إرجاع `{ correlationId, persisted: boolean }` بدل ابتلاع فشل التخزين |
| `server/http/app.ts` | GAP-09 | `incidentPersisted` في 7 مواضع استدعاء، وإظهاره في الاستجابة/السجل |

### 3.3 أدوات الاختبار والأدلة

| الملف | الغرض |
|---|---|
| `tests/w1/w1-integrity.test.ts` | 18 اختبارًا يغطي GAP-01..05, 08, 09 |
| `scripts/w1/fixtures/seed-0007.sql` | بيانات اصطناعية حتمية على مخطط 0007 |
| `scripts/w1/g1-populated-migration.mjs` | هارنس G1: نسخ `.sqlite` + `-wal` + `-shm`، لقطة قبل/بعد، فحص سلامة، ومسار فشل ذري |
| `scripts/w1/g2-integration.mjs` | تكامل حقيقي عبر `scripts/e2e-server.mjs` على 127.0.0.1، مع تحقق D1 عبر Wrangler |
| `scripts/w1/e2e-typecheck.mjs` | برنامج TypeScript مستقل لـ`e2e/**` |

---

## 4. الاعتماديات

| البند | الحالة |
|---|---|
| `package.json` | لم يُعدَّل (mtime 2026-10-13، SHA-256 `4fc782e8...25d1e`) |
| `pnpm-lock.yaml` | لم يُعدَّل (mtime 2026-10-12، SHA-256 `2d0f2ff7...4c03a`) — المشروع يستخدم pnpm |
| `package-lock.json` | غير موجود أصلًا؛ لم يُنشأ |
| تثبيت/تحديث حزم | لم يُنفَّذ (لا `npm install` ولا `pnpm install`) |
| Node | `v24.22.1` |
| Wrangler | `4.149.0` |
| TypeScript | من `node_modules` الحالية |
| Playwright | لم يُشغَّل في W1 |

لا توجد اعتمادية جديدة، ولا تغيير في شجرة الحزم، ولا استخدام لشبكة خارجية.

---

## 5. ملفات مساعدة خارج قائمة السماح (إفصاح)

| الملف | المحتوى | السبب |
|---|---|---|
| `.w1-run-id.txt`, `.w1-run-id-2..10.txt` | معرّفات الجذور فقط | تثبيت تتبّع المحاولات |
| `node_modules/.tmp/*.tsbuildinfo` | آثار بناء TypeScript | أثر طبيعي لـ`tsc -b` |

لا تحتوي أي من هذه الملفات على أسرار أو بيانات حقيقية، ولم تُعدَّل أي ملفات مصدر خارج القائمة.
