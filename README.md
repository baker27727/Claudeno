# Claude Code Learn (EN/NO)

منصّة تعلّم تفاعلية لـ Claude Code، ثنائية اللغة (الإنجليزية/النرويجية). مبنية على
Astro 5 مع جزر Svelte تفاعلية. راجع المخطط التنفيذي الكامل في
`claude-code-learn-blueprint.md`.

## الحالة — المرحلتان 2 و 3 منجزتان

- [x] هيكل مشروع Astro كما في القسم 2 من المخطط
- [x] نظام التصميم `src/styles/tokens.css` — ثيم داكن/فاتح مع احترام تفضيلات النظام والحركة
- [x] مخططات Zod للتحقق `src/content.config.ts` — تفشل الـ Build عند أي محتوى مخالف
- [x] أساس i18n (`src/lib/i18n.ts`) + حفظ التقدم (`src/lib/progress.ts`)
- [x] **ستّ وحدات كاملة** في `content/modules/` (getting-started, cli-basics,
      permissions-and-settings, slash-commands, subagents, mcp-servers) — كل وحدة
      تحوي `meta.yaml` / `terminal.yaml` / `quiz.yaml` / `en.mdx` / `no.mdx`
- [x] **كلّ صفحات الموقع** ثنائية اللغة:
  `/[lang]/`، `/[lang]/learn`، `/[lang]/learn/[module]`، `/[lang]/playground`،
  `/[lang]/build`، `/[lang]/reference`، `/[lang]/catalog`، `/[lang]/quiz`،
  `/[lang]/changelog`، `/[lang]/feedback`، `/[lang]/blog`، `/[lang]/blog/[slug]`
- [x] **جزر Svelte التفاعلية**: TerminalSim (guided + free)، Quiz، ThemeToggle،
      ProgressMap، ConfigBuilder، SearchPalette (⌘K / Ctrl+K)
- [x] **SEO منظَّم**: `src/lib/seo.ts` ينتج JSON-LD (Course, FAQPage, ItemList,
      BreadcrumbList, WebSite, Organization, WebPage) + OG/Twitter meta + canonical
      + hreflang لكل صفحة
- [x] **Search داخلي**: Pagefind مبني بعد البناء، فهرس ~892KB للنسخة الكاملة
- [x] **خط الأتمتة** `scripts/watch-upstream.ts` + `scripts/generate-update.ts`
      يكشفان إصدارات Claude Code الجديدة يوميًا وينشآن PR عبر `watch.yml`
- [x] **سجلّ التغييرات** `content/changelog.yaml` يُولَّد آليًا
- [x] **مدوّنة** `content/blog/` بنوع محتوى Bilingual + وضع مسودة (`draft`)
- [x] **تدقيقات محتوى** (`scripts/audits/`): parity EN/NO، تماسك الـ quiz،
      اتساق الأوامر الطرفية، سلامة الروابط
- [x] **OG images** ديناميكية (1200×630) لكل صفحة عبر satori + resvg-js
- [x] **CI**: تدقيقات PR + Lighthouse CI + a11y axe-core + نشر Cloudflare Pages
      اختياري + ساعة يومية للـ upstream

## فحوصات الجودة (Quality checks)

كل الفحوصات تعمل محليًا وداخل CI (انظر `.github/workflows/`):

| الأمر | الهدف | الـ CI |
|---|---|---|
| `npm run check` | `astro check` — typecheck + Astro diagnostics | `audits.yml` (PR) |
| `npm run audit` | parity + quiz + terminal + links — تكافؤ المحتوى وسلامته | `audits.yml` (PR) |
| `npm run build` | بناء ثابت + تحقق Zod كامل + Pagefind + OG images | `audits.yml` (PR) و `deploy.yml` (main) |
| `npx lhci autorun` | Lighthouse CI — performance ≥ 90, a11y ≥ 95, best-practices ≥ 95, SEO ≥ 95، ميزانية JS < 60KB للصفحة | `lighthouse.yml` (PR + main) |
| `npx axe …` | axe-core — zero serious/critical violations لـ WCAG 2.1 AA | `a11y.yml` (PR + main) |

### تحليلات Plausible

- السكربت محقون داخل `<head>` من `src/layouts/Base.astro` فقط عندما يكون
  `PUBLIC_PLAUSIBLE_DOMAIN` مضبوطًا في البيئة (افتراضيًا فارغ — السكربت معطّل).
- `PUBLIC_PLAUSIBLE_HOST` اختياري للنسخ المستضافة ذاتيًا (افتراضي `https://plausible.io`).
- لتعطيل Plausible في CI/PR، نُمرّر `PUBLIC_PLAUSIBLE_DOMAIN=""` صراحة في كل workflow.

### ميزانيات Lighthouse (BLUEPRINT §6.2.5)

- JS per page < **60KB**.
- total requests: ≤ 6 لكل صفحة (`budgets:js-request-count`).
- total byte weight: ≤ 250KB لكل صفحة (`budgets:total-byte-weight`).
- PWA **غير** مطلوب (موقع ثابت بدون offline) — `categories:pwa: off`.

### عتبات axe-core (BLUEPRINT §6.2)

- tags المفعّلة: `wcag2a,wcag2aa,wcag21a,wcag21aa,best-practice`.
- `--exit` ⇒ الفشل عند أي انتهاك (zero serious/critical).

## التشغيل

```bash
npm install
npm run dev          # خادم تطوير
npm run build        # بناء ثابت + Pagefind فهرسة + OG images
npm run preview      # معاينة ناتج البناء
npm run check        # Astro check (TypeScript + Astro diagnostics)
npm run audit        # parity + quiz + terminal + links
npm run watch:upstream     # رصد إصدار Claude Code جديد
npm run generate:update    # توليد PR تحديث عند تغيّر upstream
```

## البنية

- `src/content.config.ts` — مجموعات المحتوى ومخططات Zod (طبقة الحماية الأولى).
- `content/` — محتوى الوحدات والبيانات (خارج `src/`، يُحمَّل عبر Astro
  content-layer loaders): modules / blog / changelog / catalog / glossary.
- `src/styles/tokens.css` — رموز التصميم (مصدر الحقيقة للألوان/الخطوط).
- `src/lib/` — أدوات i18n (`i18n.ts`)، تجميع الوحدات (`modules.ts`)، تقدّم
  المتعلّم (`progress.ts`)، SEO/JSON-LD (`seo.ts`)، توصية كويز تحديد المستوى
  (`quiz-rec.ts`).
- `src/components/` — مكوّنات Astro ثابتة (Nav).
- `src/islands/` — جزر Svelte تُرطَّبة على العميل.
- `src/layouts/Base.astro` — `<head>` موحَّد (canonical, hreflang, OG/Twitter,
  JSON-LD slot, theme preload, Plausible شرطي).
- `src/integrations/pagefind.ts` — دمج Pagefind في دورة حياة البناء.
- `scripts/` — أدوات صيانة: audits، build OG images، generate update،
  watch upstream، blog helper.
- `public/` — أصول ثابتة عامة: `favicon.svg` (monogram CL بالألوان الرسميّة).

## الـ Pages

| Path                                | الغرض                                                 |
| ----------------------------------- | ----------------------------------------------------- |
| `/[lang]/`                          | صفحة هبوط + terminal حي في وضع free                  |
| `/[lang]/learn`                     | فهرس الوحدات + خريطة تقدّم (`ProgressMap`)            |
| `/[lang]/learn/[module]`            | درس وحدة: MDX + terminal موجَّه + quiz + Mark Complete |
| `/[lang]/playground`                | terminal وضع free لكل الأوامر                         |
| `/[lang]/build`                     | Config Builder لـ `CLAUDE.md` (معاينة + نسخ/تنزيل)    |
| `/[lang]/reference`                 | Cheat sheet للأوامر و slash commands و الإعدادات       |
| `/[lang]/catalog`                   | فهرس كل المحتوى من `catalog.yaml`                    |
| `/[lang]/quiz`                      | Placement quiz مع breakdown + توصية أول وحدة          |
| `/[lang]/changelog`                 | سجلّ التغييرات المولَّد آليًا (`ItemList` JSON-LD)    |
| `/[lang]/feedback`                  | روابط بريد + GitHub issues                            |
| `/[lang]/blog`                      | فهرس المدوّنة (draft مُخفاة في الإنتاج)               |
| `/[lang]/blog/[slug]`               | منشور مدوّنة بـ MDX                                   |

كل صفحة لها مقابلها بـ `en/` و `no/`، مع `hreflang` تلقائي.

## الأتمتة الكاملة — بلا تدخل بشري

الموقع مباشر على `https://claude.mutaz.no` (سيرفر Ubuntu ذاتي، خلف Cloudflare).
خط الأتمتة مصمّم للنشر **بلا مراجعة بشرية**، لكن بشبكة أمان آلية بدل الثقة
العمياء: لا شيء يصل إلى `main` إلا بعد اجتياز `npm run check && npm run audit
&& npm run build` كاملة. فشل أي فحص ⇒ يُفتح PR للمراجعة بدل نشر شيء غير
متحقَّق منه.

ثلاث مهام مجدولة (`.github/workflows/`):

| Workflow | التوقيت | المهمة |
|---|---|---|
| `watch.yml` | يوميًا 06:00 UTC | يكتشف إصدار Claude Code جديد ويولّد تصحيحات المحتوى المتأثرة + مقال مدونة |
| `freshness.yml` | شهريًا (أول يوم) | يعيد جلب صفحات التوثيق الرسمية التي تُبنى عليها كل وحدة، ويقارنها بمحتوانا الحالي، ويصحّح أي انحراف حتى بلا صدور إصدار جديد |
| `deploy.yml` | عند كل push إلى `main` | يبني الموقع وينشره فعليًا على السيرفر عبر rsync/SSH |

كلا `watch.yml` و`freshness.yml` يدفعان مباشرة إلى `main` عند نجاح الفحوصات
(`scripts/_auto-publish.ts`)، ما يُشغّل `deploy.yml` تلقائيًا فينشر التغيير
مباشرة — من اكتشاف تحديث إلى نشره على الموقع الحي بلا أي نقرة بشرية.

### التفعيل (بعد ربط المستودع بـ GitHub)

```bash
git init && git add -A && git commit -m "init"
git remote add origin <repo-url> && git push -u origin main
```

ثم أضف في **Settings → Secrets and variables → Actions**:

| السرّ | القيمة |
|---|---|
| `ANTHROPIC_API_KEY` | مفتاح Claude API لتوليد التصحيحات |
| `DEPLOY_SSH_KEY` | المفتاح الخاص لمستخدم نشر مخصّص على السيرفر (لا تُستخدم كلمة مرور) |
| `DEPLOY_HOST` | عنوان السيرفر |
| `DEPLOY_USER` | مستخدم SSH (مثل `ubuntu`) |
| `DEPLOY_PATH` | مسار جذر الموقع على السيرفر (مثل `/var/www/claude.mutaz.no/`) |

`GITHUB_TOKEN` يوفّره GitHub تلقائيًا لكل تشغيل — لا حاجة لإضافته يدويًا.

- [ ] **Plausible live** — تشغيل مثيل Plausible المتتبّع بعد إطلاق النطاق؛
      القاعدة موجودة (`PUBLIC_PLAUSIBLE_DOMAIN` + `PUBLIC_PLAUSIBLE_HOST` في
      `astro.config.mjs`) وسيُحمَّل السكربت تلقائيًا عند ضبط المتغيّر.
- [x] **Lighthouse CI + axe-core** — ملف `.lighthouserc.json` مُفعَّل (performance ≥ 90,
      a11y ≥ 95, best-practices ≥ 95, SEO ≥ 95، ميزانية JS < 60KB) + workflow
      `lighthouse.yml` يُحمِّل التقارير كـ artifacts. Workflow `a11y.yml` يشغّل
      `@axe-core/cli` ضد dev server لثماني صفحات (EN+NO × homepage/learn/getting-started/quiz)
      بعتبة zero serious/critical.
- [ ] **Search refinement** — فهرس Pagefind يعمل و SearchPalette تُظهر النتائج
      لكن لم تُضف بعد: ترتيب حسب شعبية، إبراز المصطلحات، فلتر حسب نوع
      المحتوى (module/blog/page).