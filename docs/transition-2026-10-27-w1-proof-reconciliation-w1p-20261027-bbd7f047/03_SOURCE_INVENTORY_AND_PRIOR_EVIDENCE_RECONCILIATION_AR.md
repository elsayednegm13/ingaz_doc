# 03 — جرد المصدر ومصالحة أدلة الجولات السابقة

- **الأمر:** `EXPORTFLOW-W1-EVIDENCE-RECONCILIATION-W2-OWNER-GATE-20261027`
- **معرّف الجولة:** `W1P-20261027-bbd7f047`
- **التاريخ:** 2026-10-27
- **الغرض:** فصل ما هو **دليل جولة سابقة** عمّا هو **قياس جولة حالية**، وتصحيح ثلاثة أرقام كانت قابلة للالتباس:
  `221 → 226`، و`7 معدّلة + 5 مضافة`، و`hash-inventory.mjs` الذي أُنشئ قبل لقطة «قبل».
- **القاعدة:** لم يُنفَّذ أي أمر Git. كل الجرد بـSHA-256 على مسارات معلنة صراحةً، ولا جرد تعاودي يصل إلى
  `.wrangler/state` أو `.wrangler-*` التاريخية أو `.dev.vars*` أو `.env*`.

## 1. لقطة «قبل» لهذه الجولة

| الحقل | القيمة |
|---|---|
| الملف | `evidence/hashes-pre.json` |
| وقت الالتقاط | بداية الجولة، قبل أي تعديل مصدر |
| عدد الملفات | **115** |
| SHA-256 للملف نفسه | `371b017da4c857908be6f0604b4ae73b7956ff196ffab9ea53d90c9bb4a21dbc` |

**نطاق اللقطة (115):** `AGANT.MD`, `HANDOFF.MD`, `AGENTS.md`, `package.json`, `tsconfig.json`,
`wrangler.jsonc`, `worker/**`, `server/**`, `shared/**`, `tests/**`, `scripts/w1final/**`,
`drizzle/migrations/**`, `e2e/**`, وملفات مختارة من تقرير W1-FINAL السابق ومسودات W2.

**لماذا لا تساوي 221؟** لأن لقطة هذه الجولة **لا تشمل** `src/` ولا `pnpm-lock.yaml` ولا بعض ملفات الجذر
التي شملها جرد W1-FINAL. لذلك 115 لا تُقارن بـ221 مباشرةً؛ المقارنة الصحيحة تكون بإعادة تشغيل نفس
نطاق الجرد السابق، وهو ما تم في §2.

## 2. إعادة إنتاج `221 → 226` بنفس نطاق W1-FINAL

شُغِّل `scripts/w1final/hash-inventory.mjs` (قراءة فقط، كتابة الناتج داخل مجلد أدلة هذه الجولة):

| القياس | القيمة | الدليل |
|---|---:|---|
| الملفات في نطاق W1-FINAL على الشجرة الحالية | **226** | `evidence/inventory-current-prior-scope.json` |
| الترحيلات | **9** | نفس الملف |
| الملفات في لقطة W1-FINAL «قبل» | 221 ملفًا / 8 ترحيلات | `.../w1f-20261026-0792a8/evidence/hashes-pre.json` |
| الملفات في لقطة W1-FINAL «بعد» | 226 ملفًا / 9 ترحيلات | `.../w1f-20261026-0792a8/evidence/hashes-post.json` |

**النتيجة:** `221 → 226` صحيح كـ**عدد ملفات** في نطاق W1-FINAL. الشجرة الحالية ما زالت **226** لأن
جولة المصالحة الحالية عدّلت 3 ملفات قائمة ولم تُضف أي ملف مصدر جديد إلى ذلك النطاق.

## 3. إعادة إنتاج `7 معدّلة + 5 مضافة + 0 محذوفة`

شُغِّل `scripts/w1final/compare-hashes.mjs` على جردي W1-FINAL الخام (قراءة فقط):

| القياس | القيمة |
|---|---:|
| قبل | 221 |
| بعد | 226 |
| معدّلة | **7** |
| مضافة | **5** |
| محذوفة | **0** |

**الملفات المعدّلة السبعة (مطابقة للتقرير السابق):**

1. `server/services/users.ts`
2. `server/services/actor.ts`
3. `server/services/reports.ts`
4. `server/http/app.ts`
5. `server/services/documents.ts`
6. `shared/permissions.ts`
7. `e2e/operations.spec.ts`

**الملفات المضافة الخمسة (مطابقة للتقرير السابق):**

1. `drizzle/migrations/0009_reports_view_all.sql`
2. `scripts/w1final/run-w1-final.mjs`
3. `scripts/w1final/run-0009-migration.mjs`
4. `scripts/w1final/compare-hashes.mjs`
5. `tests/w1/w1-final-worker.ts`

الدليل الكامل: `evidence/reconcile-prior-pre-post.json` (يتضمن قوائم المسارات وبصمات قبل/بعد).

## 4. `hash-inventory.mjs`: لماذا لا يظهر في «5 مضافة»؟

`scripts/w1final/hash-inventory.mjs` **موجود في لقطة W1-FINAL «قبل»** (تحقق: عدد مطابقاته في
`hashes-pre.json` = 1). أُنشئ في مرحلة G0 **قبل** أخذ اللقطة، فظهر في الجردين ولم يظهر في دلتا pre→post.

| المفهوم | القيمة | المعنى |
|---|---:|---|
| `SNAPSHOT_DELTA_ADDED` | **5** | فرق لقطة «قبل» → «بعد» |
| `TOTAL_RUN_FILES_CREATED` | **6** | 5 ملفات ظهرت في الدلتا + `hash-inventory.mjs` الذي أُنشئ قبل اللقطة |
| `TOTAL_SOURCE_FILES_NOW` | **226** | عدد الملفات في نطاق W1-FINAL |

**القاعدة المستخلصة:** لا يجوز استخدام «دلتا اللقطة» كإجابة عن «كم ملفًا أنشأته الجولة». أي ملف يُنشأ
قبل أخذ لقطة «قبل» يصبح جزءًا من خط الأساس ولا يظهر في الدلتا، مع أنه أُنشئ في الجولة نفسها.

## 5. دلتا هذه الجولة (W1P)

| القياس | القيمة |
|---|---:|
| ملفات مصدر معدّلة | **3** |
| ملفات مصدر مضافة | **0** |
| ملفات مصدر محذوفة | **0** |
| ملفات توثيق/أدلة جديدة | خارج جرد المصدر، داخل جذر الجولة |

**الملفات الثلاثة المعدّلة:**

| الملف | التغيير | التصنيف |
|---|---|---|
| `server/services/users.ts` | حارس SQL لجذرية الفاعل داخل كل دفعة كتابة؛ إعادة ترتيب الإدراج قبل الحذف؛ مسبار جذرية داخل المعاملة؛ حارس على التفعيل وإنشاء الدور | إصلاح منتج |
| `tests/w1/w1-final-worker.ts` | مسبار إنتاجي `/__w1/*` محمي برمز عشوائي؛ تأخيرات قراءة موجّهة بالمفتاح | اختبار فقط |
| `scripts/w1final/run-w1-final.mjs` | وضع `g1proof` وسيناريوهات الحقيقة/الذرّية/الفاعل القديم | اختبار فقط |

`evidence/hashes-post.json` (يُولَّد في نهاية الجولة) يقارن نفس مسارات «قبل» الـ115، ويُتوقع أن يُظهر
**3 معدّلة، 0 مضافة، 0 محذوفة** داخل ذلك النطاق.

## 6. الترحيلات — إثبات عدم التغيير

| الترحيل | البايت | SHA-256 (كامل) | الحالة |
|---|---:|---|---|
| `0001_init.sql` | 17,656 | `3f8a4a08a1effa3a0e668bb3be9ef1e740de8bff61df30f9e366b0b898bf2a0a` | دون تغيير |
| `0002_seed.sql` | 9,883 | `215144c37d3da19173e215cebc5cef3c0178af234bc7eadabac816ceec514b62` | دون تغيير |
| `0003_checkpoint.sql` | 360 | `49fb1258de001b94ac3d5b84003bd29e0078ed4f0bd1b4b123efd01bad7acbbc` | دون تغيير |
| `0004_invoice_revisions.sql` | 716 | `0b1e07212592846421e0a2f1f95dbf98afd2a2b374a6f3af3050b3ae1ca705a7` | دون تغيير |
| `0005_idempotency.sql` | 884 | `149b43897e9698675ab8dd807ffcefa92f2323da2782bd73dde9faf3b2d88060` | دون تغيير |
| `0006_customer_imports.sql` | 1,265 | `ab91d3bd5288f5e0411b1a58666c6e50aedb5e12d70c01581d97aa22255954c3` | دون تغيير |
| `0007_performance_indexes.sql` | 777 | `eeaf2f4cdad5c7070cbaaf1cf91514b24200cf4f050c80e1d5989c2fc0fc40d3` | دون تغيير |
| `0008_replay_safety_and_import_identity.sql` | 1,920 | `5682a7814f1c9cd85df40a1aa97fecedea51e30985b4caa11a1a47c6907a07ba` | دون تغيير |
| `0009_reports_view_all.sql` | 1,004 | `f84be1c94408b8445b2c22d50edcb73380ae6c2259423cc077b811e8cdb9058d` | دون تغيير |

- بصمات `0001..0008` تطابق البادئات الـ16 المنشورة في تقرير W1-FINAL (`05_...AR.md`).
- بصمة `0009` الكاملة تطابق `f84be1c94408b844…` المنشورة سابقًا، والحجم 1,004 بايت كما هو.
- `0010` و`0011` **غير موجودين** في `drizzle/migrations/`.
- لم يُطبَّق أي ترحيل في هذه الجولة على قاعدة المطور أو remote؛ كل قواعد الجولة اصطناعية ومملوكة.

## 7. أدلة الجولات السابقة — هل عُدِّلت؟

لُقطت بصمات **33 ملفًا** من أدلة D3 النهائية في جولة `w1c-20261025-e15f4c`:
`evidence/prior-d3-evidence-hashes.json`. الغرض إثبات أن المصالحة **قرأت** الأدلة ولم **تعدّلها**.
لم يُكتب أي ملف داخل جذر W1C أو W1F.

## 8. ما لا يثبته هذا الجرد

1. لا يثبت أن ملفات خارج النطاق المعلن لم تتغيّر (مثل `.dev.vars*` — لم تُقرأ أصلًا).
2. لا يثبت سلامة تاريخ Git؛ لا Git في هذه الجولة بأمر صريح.
3. عدد 226 يصف **اللحظة الحالية** لنطاق W1-FINAL، وليس تطابقًا بايتيًا مع لقطة W1-FINAL «بعد».
4. لا يثبت أن `0009` سيعمل على remote D1؛ لم يُجرَّب إلا محليًا في جولة سابقة.

```text
RUN_PRE_SNAPSHOT_FILES: 115
PRIOR_SCOPE_CURRENT_FILES: 226
PRIOR_SCOPE_MIGRATIONS: 9
PRIOR_PRE_TO_POST: 221->226 CHANGED=7 ADDED=5 REMOVED=0
SNAPSHOT_DELTA_ADDED: 5
TOTAL_RUN_FILES_CREATED_PRIOR: 6
HASH_INVENTORY_PRESENT_IN_PRIOR_PRE: YES
CURRENT_RUN_SOURCE_CHANGED: 3
CURRENT_RUN_SOURCE_ADDED: 0
CURRENT_RUN_SOURCE_REMOVED: 0
MIGRATIONS_0001_0008_CHANGED: 0
MIGRATION_0009_CHANGED: 0
MIGRATION_0010: ABSENT
GIT_ACCESS: NO
STOP
```
