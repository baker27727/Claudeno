# المخطط التنفيذي التفصيلي — منصة تعلّم Claude Code التفاعلية (EN/NO)

**الاسم المقترح للمشروع:** `claudecode.no` أو `learnclaude.dev` (يُحسم لاحقًا)
**الإصدار:** Blueprint v1.0 — يوليو 2026

---

## 1. مصادر الحقيقة (Sources of Truth)

كل المحتوى يُشتق ويُدقَّق آليًا مقابل هذه المصادر الرسمية فقط:

| المصدر | الرابط | الاستخدام |
|---|---|---|
| وثائق Claude Code الرسمية | https://docs.claude.com/en/docs/claude-code/overview | مرجع تدقيق الحقائق |
| خريطة وثائق Claude Code (نسخة آلية) | https://docs.anthropic.com/en/docs/claude-code/claude_code_docs_map.md | إدخال مثالي لوكيل الأتمتة (Markdown خام) |
| مستودع GitHub الرسمي + CHANGELOG | https://github.com/anthropics/claude-code | رصد الإصدارات الجديدة |
| حزمة npm الرسمية | https://www.npmjs.com/package/@anthropic-ai/claude-code | رصد أرقام الإصدارات (npm registry API) |

> **قاعدة ذهبية:** لا يُكتب أي ادعاء تقني في المحتوى إلا وله مصدر من الجدول أعلاه. وكيل الأتمتة مُلزَم بإرفاق رابط المصدر في وصف كل PR.

---

## 2. بنية المستودع الكاملة

```
claude-code-learn/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── tailwind.config.ts
│
├── src/
│   ├── content.config.ts          # مخططات Zod لكل مجموعات المحتوى
│   ├── pages/
│   │   ├── index.astro            # يعيد التوجيه حسب لغة المتصفح
│   │   ├── [lang]/                # lang = en | no
│   │   │   ├── index.astro        # الصفحة الرئيسية (Hero تفاعلي)
│   │   │   ├── learn/
│   │   │   │   ├── index.astro    # شبكة الوحدات + خريطة التقدم
│   │   │   │   └── [module].astro # صفحة الوحدة (درس + محاكي + اختبار)
│   │   │   ├── playground.astro
│   │   │   ├── quiz.astro         # اختبار تحديد المستوى
│   │   │   ├── build.astro        # منشئ الإعدادات
│   │   │   ├── reference.astro    # ورقة الغش
│   │   │   ├── catalog.astro
│   │   │   ├── changelog.astro
│   │   │   ├── feedback.astro
│   │   │   └── blog/[slug].astro
│   ├── islands/                   # الجزر التفاعلية فقط (Svelte)
│   │   ├── TerminalSim.svelte
│   │   ├── Quiz.svelte
│   │   ├── ConfigBuilder.svelte
│   │   ├── ProgressMap.svelte
│   │   ├── SearchPalette.svelte   # ⌘K عبر Pagefind
│   │   └── ThemeToggle.svelte
│   ├── components/                # مكونات ثابتة (Astro)
│   ├── layouts/
│   ├── styles/tokens.css          # نظام التصميم
│   └── lib/
│       ├── i18n.ts                # قاموس واجهة المستخدم UI strings
│       └── progress.ts            # حفظ التقدم في localStorage
│
├── content/
│   ├── modules/
│   │   └── 01-getting-started/
│   │       ├── en.mdx
│   │       ├── no.mdx
│   │       ├── meta.yaml
│   │       ├── terminal.yaml
│   │       └── quiz.yaml
│   ├── catalog.yaml
│   ├── changelog.yaml
│   ├── glossary.yaml              # مصطلحات EN↔NO الموحدة
│   └── snapshots/                 # آخر نسخة مرصودة من المصادر الرسمية
│       ├── upstream-changelog.md
│       └── upstream-version.txt
│
├── scripts/
│   ├── watch-upstream.ts          # الرصد اليومي
│   ├── generate-update.ts         # استدعاء وكيل AI وفتح PR
│   └── audits/
│       ├── audit-parity.ts
│       ├── audit-quiz.ts
│       ├── audit-terminal.ts
│       └── audit-links.ts
│
└── .github/workflows/
    ├── watch.yml                  # cron يومي
    ├── audits.yml                 # على كل PR
    └── deploy.yml                 # نشر عند الدمج في main
```

---

## 3. مخططات المحتوى (Content Schemas)

### 3.1 `meta.yaml` — بيانات الوحدة

```yaml
id: getting-started
order: 1
level: beginner            # beginner | intermediate | advanced
duration_min: 15
covers_version: "2.1.0"    # أحدث إصدار Claude Code تم التحقق منه
title:
  en: "Getting Started with Claude Code"
  no: "Kom i gang med Claude Code"
description:
  en: "Install Claude Code and run your first session."
  no: "Installer Claude Code og kjør din første økt."
tags: [installation, basics]
```

### 3.2 `terminal.yaml` — خطوات المحاكي

```yaml
steps:
  - id: step-1
    command: "claude"
    output: |
      Welcome to Claude Code!
      ...
    explain:
      en: "Launches an interactive session in your project folder."
      no: "Starter en interaktiv økt i prosjektmappen din."
    accepts_also: ["claude --help"]   # أوامر بديلة مقبولة
```

### 3.3 `quiz.yaml` — أسئلة ثنائية اللغة بمفاتيح مشتركة

```yaml
questions:
  - id: q1
    prompt:
      en: "Which command starts an interactive session?"
      no: "Hvilken kommando starter en interaktiv økt?"
    options:
      - { id: a, en: "claude", no: "claude" }
      - { id: b, en: "claude run", no: "claude run" }
      - { id: c, en: "claude start", no: "claude start" }
    correct: a
    explain:
      en: "..."
      no: "..."
```

### 3.4 `glossary.yaml` — اتساق الترجمة النرويجية

```yaml
- en: "session"
  no: "økt"
- en: "prompt"
  no: "ledetekst"     # أو الإبقاء على prompt حسب العرف التقني النرويجي
- en: "repository"
  no: "kodelager"
  note: "يشيع أيضًا 'repo' بين المطورين النرويجيين — نستخدم repo في السياق غير الرسمي"
```

> وكيل الترجمة الآلي **مُلزَم** بهذا القاموس، وأي مصطلح جديد يضيفه يجب أن يُضاف للقاموس في نفس الـ PR. هذا يمنع تذبذب المصطلحات بين الوحدات.

### 3.5 التحقق الآلي — `src/content.config.ts` (مقتطف)

```ts
import { defineCollection, z } from "astro:content";

const bilingual = z.object({ en: z.string().min(1), no: z.string().min(1) });

const moduleMeta = defineCollection({
  type: "data",
  schema: z.object({
    id: z.string(),
    order: z.number().int().positive(),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    duration_min: z.number().positive(),
    covers_version: z.string().regex(/^\d+\.\d+\.\d+$/),
    title: bilingual,
    description: bilingual,
    tags: z.array(z.string()),
  }),
});
```

أي ملف YAML مخالف للمخطط ⇒ **فشل الـ Build قبل النشر**. هذه أول طبقة حماية.

---

## 4. نظام i18n (EN/NO)

- **التوجيه:** مسارات صريحة `/en/...` و `/no/...` — الأفضل لـ SEO. الجذر `/` يوجه حسب `Accept-Language` مع حفظ الاختيار.
- **hreflang:** كل صفحة تصدر `<link rel="alternate" hreflang="en|no|x-default">` تلقائيًا من الـ Layout.
- **قاعدة التكافؤ:** لا يُنشر محتوى بلغة واحدة أبدًا — `audit-parity` يمنع الدمج إن وُجد مفتاح ناقص.
- **الأرقام والتواريخ:** عبر `Intl` بحسب اللغة (النرويجية: `06.07.2026`).
- **جودة النرويجية:** Bokmål (وليس Nynorsk) — يغطي الأغلبية الساحقة من الجمهور التقني. مراجعة بشرية عيّنية شهرية أو Native reviewer عند توفر ميزانية.

---

## 5. المكونات التفاعلية (الجزر)

### 5.1 المحاكي الطرفي `TerminalSim.svelte`

- **محاكاة خالصة من جانب العميل** — يقرأ `terminal.yaml` المحقون كـ props وقت الـ Build. صفر تكلفة API.
- سلوك: المستخدم يكتب الأمر → مطابقة مع `command` أو `accepts_also` → عرض `output` بحركة كتابة → إظهار `explain` باللغة الحالية.
- أمر خاطئ ⇒ تلميح لطيف + زر "أرني الأمر".
- وضعان: **موجّه** (خطوات الدرس) و**حر** (playground يجمع أوامر كل الوحدات).
- إتاحة: دعم كامل للوحة المفاتيح، `aria-live` للمخرجات.

### 5.2 منشئ الإعدادات `ConfigBuilder.svelte`

نموذج خطوات (نوع المشروع، الصلاحيات، الأدوات) ⇒ يولّد `CLAUDE.md` + ملفات إعدادات جاهزة للنسخ/التنزيل. القوالب نفسها بيانات YAML قابلة للتدقيق الآلي.

### 5.3 خريطة التقدم `ProgressMap.svelte`

خط زمني بصري للوحدات، الحالة في `localStorage` (لا حسابات ولا خادم — متوافق GDPR بطبيعته).

---

## 6. نظام التصميم (أفضل من الأصل)

### 6.1 الرموز (Design Tokens) — `tokens.css`

```css
:root {
  --font-sans: "Inter Variable", system-ui;      /* دعم ممتاز لـ æ ø å */
  --font-mono: "JetBrains Mono", monospace;
  --radius: 10px;
  --bg: #0b0e14;         --bg-elev: #12161f;
  --fg: #e6e9ef;         --fg-muted: #9aa4b2;
  --accent: #d97757;     /* برتقالي طيني قريب من هوية Claude دون تقليدها */
  --ok: #4ade80;  --warn: #fbbf24;  --err: #f87171;
}
[data-theme="light"] { --bg:#fafaf8; --bg-elev:#ffffff; --fg:#1a1d23; ... }
```

### 6.2 مبادئ

1. **الطرفية هي البطل:** Hero بمحاكي حي **قابل للتفاعل فورًا** (تفوق مباشر على الأصل الذي يعرض العرض فقط).
2. **Dark/Light** مع حفظ التفضيل واحترام `prefers-color-scheme`.
3. **View Transitions API** لانتقالات ناعمة بين الصفحات (مدمجة في Astro).
4. **إتاحة WCAG 2.1 AA:** تباين ≥ 4.5:1، تركيز مرئي، دعم `prefers-reduced-motion` — شبه إلزامي للسوق النرويجي.
5. **أداء:** ميزانية JS < 60KB للصفحة، Lighthouse 95+ على كل المقاييس.
6. استخدم مهارة/مراجع frontend-design عند بناء الواجهة لتجنب المظهر القالبي الافتراضي.

---

## 7. خط الأتمتة — Workflows فعلية

### 7.1 الرصد اليومي — `.github/workflows/watch.yml`

```yaml
name: Watch upstream
on:
  schedule: [{ cron: "0 6 * * *" }]   # 06:00 UTC يوميًا
  workflow_dispatch: {}
jobs:
  watch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - name: Detect upstream changes
        id: diff
        run: npx tsx scripts/watch-upstream.ts   # يقارن بـ content/snapshots/
      - name: Generate update PR
        if: steps.diff.outputs.changed == 'true'
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx tsx scripts/generate-update.ts
```

**منطق `watch-upstream.ts`:** يجلب أحدث إصدار من npm registry + ملف CHANGELOG الرسمي ⇒ يقارن بالـ snapshot المحلي ⇒ إن تغيّر: يكتب الـ diff إلى ملف مؤقت ويُخرج `changed=true`.

### 7.2 التوليد — `generate-update.ts` (المنطق)

1. يبني Prompt يحتوي: الـ diff الرسمي + خريطة الوثائق + `glossary.yaml` + قائمة الوحدات ومحتواها الحالي.
2. يستدعي Claude API بطلب **مخرجات JSON منظمة فقط**:
   ```json
   {
     "affected_modules": ["..."],
     "content_patches": [{ "file": "...", "en": "...", "no": "..." }],
     "changelog_entry": { "version": "...", "en": "...", "no": "..." },
     "new_glossary_terms": [],
     "sources": ["https://..."]
   }
   ```
3. يطبق التعديلات على فرع `auto/update-vX.Y.Z` ويفتح PR بعنوان ووصف يتضمنان المصادر.
4. **لا يدمج أبدًا تلقائيًا** — الدمج قرارك وحدك بعد المراجعة (5–10 دقائق).

### 7.3 التدقيق — `.github/workflows/audits.yml`

```yaml
name: Audits
on: { pull_request: {} }
jobs:
  audits:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx tsx scripts/audits/audit-parity.ts    # تكافؤ EN/NO
      - run: npx tsx scripts/audits/audit-quiz.ts      # سلامة الاختبارات
      - run: npx tsx scripts/audits/audit-terminal.ts  # تطابق المحاكي مع الدرس
      - run: npx tsx scripts/audits/audit-links.ts     # الروابط الميتة
      - run: npm run build                             # يشمل تحقق Zod كاملًا
```

- أضف **CodeRabbit** (أو GitHub Action لمراجعة AI) على المستودع لمراجعة تلقائية لكل PR.
- فعّل **Branch Protection** على `main`: لا دمج إلا بنجاح كل الفحوص + موافقتك.

### 7.4 النشر — `deploy.yml`

دمج في `main` ⇒ build ⇒ نشر تلقائي على Cloudflare Pages (أو ربط المستودع مباشرة بالمنصة والاستغناء عن هذا الملف).

---

## 8. منطق سكربتات التدقيق (مواصفات)

| السكربت | يفشل إذا |
|---|---|
| `audit-parity` | أي مفتاح `en` بلا مقابل `no` (أو العكس) في أي ملف محتوى، أو وحدة لها `en.mdx` بلا `no.mdx` |
| `audit-quiz` | `correct` لا يطابق أي `option.id`، سؤال بأقل من 3 خيارات، معرفات مكررة |
| `audit-terminal` | أمر مذكور في نص الدرس (كتلة كود) غير موجود في `terminal.yaml` والعكس |
| `audit-links` | أي رابط خارجي يرجع 4xx/5xx (مع قائمة استثناءات) |

---

## 9. SEO والنمو

- **Sitemap + hreflang** آليان من Astro integrations.
- **صور OG آلية** لكل وحدة (satori/vercel-og وقت البناء) بكلتا اللغتين.
- **بيانات منظمة:** `Course` و`FAQPage` Schema.org لكل وحدة.
- **المحتوى النرويجي = الخندق التنافسي:** استهداف عبارات مثل «Claude Code norsk», «lær Claude Code», «Claude Code veiledning» — منافسة شبه معدومة حاليًا.
- **مدونة تتبع الإصدارات:** كل PR تحديث آلي يولّد أيضًا مسودة تدوينة "What's new in vX.Y" (EN/NO) — وقود SEO مستمر بلا مجهود إضافي.

---

## 10. قائمة الإطلاق (Checklist)

- [ ] حجز النطاق + Cloudflare Pages
- [ ] هيكل Astro + tokens + i18n + أول وحدة كاملة (المرحلة 1 — أسبوعان)
- [ ] 10–12 وحدة + quiz + playground + build + reference (المرحلة 2 — 2-3 أسابيع)
- [ ] خط watch/generate/audits يعمل بأول PR آلي ناجح (المرحلة 3 — أسبوع)
- [ ] Lighthouse ≥ 95، فحص إتاحة، hreflang، تحليلات Plausible (المرحلة 4 — أسبوع)
- [ ] الإطلاق + مشاركة في مجتمعات المطورين النرويجية (kode24, Teknologihuset, r/norge dev)

**مؤشرات النجاح:** تحديث الموقع خلال ≤ 48 ساعة من أي إصدار رسمي، تكافؤ EN/NO = 100%، تكلفة تشغيل ≈ 0 (فقط استدعاءات API عند وجود تحديث فعلي).
