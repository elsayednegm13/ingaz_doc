# فهرس أدلة الفحص — 2026-10-20

كل الأوامر أدناه تُنفَّذ من جذر المستودع على بيئة محلية معزولة. لا شيء منها يلمس الإنتاج أو D1/R2 البعيدين.

## 1) الاختبارات والبناء

| الدليل | الأمر | النتيجة |
|---|---|---|
| `e2e-final-58.log` | `corepack pnpm exec playwright test --reporter=list` | 58/58 ناجح |
| `unit-final.log` | `corepack pnpm test` | 34/34 ناجح (9 ملفات) |
| `typecheck-final.log` | `corepack pnpm typecheck` | نظيف |
| `lint-final.log` | `corepack pnpm lint` | نظيف (تحذير fast-refresh سابق فقط) |
| `build-final.log` | `corepack pnpm build` | ناجح — `publishable output is clean: dist` |
| `migrate-from-zero.log` | `corepack pnpm exec wrangler d1 migrations apply exportflow-local --local --persist-to <scratch>` | 7/7 ترحيلات ناجحة |
| `audit-prod.log` | `corepack pnpm audit --prod` | 0 ثغرة |

## 2) الاستجابة (Responsive)

| الدليل | الأمر |
|---|---|
| `responsive/report.json` + لقطات | `node scripts/audit-responsive.mjs http://127.0.0.1:43174 .wrangler-e2e/admin.json docs/audit/2026-10-20/responsive` |
| `responsive-before/` | لقطات الحالة الوسيطة: بعد إصلاح `min-w-0` وقبل نقل البحث إلى صف مستقل |
| `header/` | لقطات الترويسة النهائية عند 320/390/768 + تحقق آلي: `overflow=0` و`focused=true` |
| اختبار تراجعي | `corepack pnpm exec playwright test e2e/responsive.spec.ts` — RESP-01..05 |

الأحجام: 320 / 360 / 375 / 390 / 430 / 768 / 1024 / 1440.

## 3) Skeleton Loading

| الدليل | الأمر |
|---|---|
| `skeletons/report.json` + لقطات loading/loaded | `node scripts/audit-skeletons.mjs http://127.0.0.1:43174 .wrangler-e2e/admin.json docs/audit/2026-10-20/skeletons 2500` |
| اختبار تراجعي | `e2e/responsive.spec.ts` — RESP-04 (Skeleton يظهر ثم يُستبدل) |

## 4) الحمل والأداء

| الدليل | الأمر |
|---|---|
| `load-test.json` | `node scripts/audit-load-test.mjs` (1/10/25/50/100 تزامن، قراءة فقط) |

## 5) تشخيص مساعد

| الأداة | الغرض |
|---|---|
| `scripts/audit-overflow.mjs` | تحديد أعمق عنصر يسبب تجاوزًا أفقيًا في صفحة واحدة |
| `scripts/capture-design.mjs` | لقطات التصميم العامة (يتطلب `VERIFY_EMAIL`/`VERIFY_PASSWORD`) |

## 6) ملاحظات إعادة التشغيل

- خادم E2E: `node scripts/e2e-server.mjs` (ينشئ `.wrangler-e2e` ويولّد بيانات دخول في `.wrangler-e2e/admin.json`).
- الأدوات التي تفتح الخادم بنفسها تُنشئ أول مدير عبر `POST /api/v1/auth/bootstrap` بسرّ `admin.json`.
- `scripts/e2e-server.mjs` يمسح الحالة في كل تشغيل؛ بيانات البذور في سكربتات الفحص تُنشأ من جديد.
