# MathStudy.in SEO Blog — Authoring SPEC (one blog per product)

You are a senior education writer + SEO specialist. Produce ONE blog as a JSON file that the pipeline
`node scripts/upsert-blog.js <file>.json` will load. Your blog must (a) rank on Google page 1 for a
low-competition long-tail keyword, (b) embed an interactive MCQ practice test, and (c) sell one e-book.

## The FORMAT gold example — copy its structure exactly
`F:\MATHSTUDY\data\blogs\grade-1-addition-how-to-teach.json`
Read it first. Match the JSON keys, the semantic-HTML content style, the quiz shape and the FAQ shape.

## File to produce
`F:\MATHSTUDY\data\blogs\<your-slug>.json` with these keys:
- `slug` — YOUR assigned slug (kebab-case). This is the URL `/`+slug. Must be unique.
- `title` — compelling, includes the primary keyword, may add "+ Free Quiz" or a benefit.
- `meta_title` — <= 60 chars, primary keyword near the front. (<=65 hard limit.)
- `meta_desc` — 140–155 chars, primary keyword + a benefit + soft CTA. (<=160 hard limit.)
- `excerpt` — 1–2 sentence hook (shown on the blog list + as fallback description).
- `category` — the grade, e.g. "Grade 1".
- `cover_image` — the CTA product's cover path. Get it by running:
  `node -e "require('dotenv').config();const m=require('mysql2/promise');(async()=>{const c=await m.createConnection({host:process.env.DB_HOST||'localhost',port:+process.env.DB_PORT||3306,user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||process.env.DB_PASS||'',database:process.env.DB_NAME||'mathstudy'});const[[p]]=await c.query('SELECT cover_image FROM products WHERE slug=?',['<CTA_PRODUCT_SLUG>']);console.log(p&&p.cover_image);await c.end();})()"`
- `cta_product_slug` — YOUR assigned product slug (the e-book to sell).
- `content` — SEMANTIC HTML (see rules). NOT markdown.
- `quiz` — {title, intro, about, level:"Grade 1", questions:[8 items]}. Each question:
  {q, options:[exactly 4 strings], answer: 0-3 (index of correct option), explanation}. Spread the
  correct answer across a/b/c/d. Keep maths at the exact grade level.
- `faq` — 5 items [{q, a}]. The LAST FAQ should mention the printable worksheet and that the link is
  in the box below (funnels to the product). `a` may contain simple inline HTML.
- `author` — "Sachin Sharma". `status` — "published".

## content HTML rules
- Open with `<p>` — a concrete, real-world hook (a scene, a specific number, a common mistake). NEVER
  a generic "In today's world…" opener.
- Use `<h2>` for main sections (4–7), `<h3>` for sub-points. Include at least one `<table>` (e.g. a
  strategy/example comparison) and at least one `<ul>`.
- 800–1200 words. Primary keyword in the first `<p>`, in one `<h2>`, and in the meta.
- Use HTML entities for symbols (`&mdash;` `&rsquo;` `&ndash;` `&minus;` `&times;` `&#8377;` for rupee).
  Use SINGLE quotes for any HTML attributes so the JSON stays valid; avoid literal double-quotes inside
  `content`, `quiz` and `faq` (a `"` would break the JSON — write it as `&quot;` if truly needed).
- End the content with a short `<h2>` that invites the reader to try the quiz below and, when ready,
  the printable worksheet (do NOT hard-code a buy link — the CTA renders automatically).

## HUMAN WRITING (Google penalises AI-sounding content — this is critical)
- Have an opinionated point of view; recommend, don't hedge. Use first person occasionally
  ("In my experience teaching six-year-olds…").
- Concrete specifics: real numbers, named strategies, a genuine caveat or trade-off, one
  counter-intuitive insight.
- Vary sentence rhythm (short punchy + longer). Indian context where natural (rupees, Indian names,
  Tier-2 city parents). NCERT-aligned terminology.
- BANNED phrases: "In today's world", "delve", "dive into", "it's worth noting", "furthermore/moreover"
  stacked, "unlock", "in conclusion", "embark on a journey", "in the realm of". No emoji in content.
- FAQ answers are direct, not restatements of the question.

## Anti-cannibalisation (non-negotiable)
Your blog targets an INFORMATIONAL intent (how-to / practice / explain), which is DIFFERENT from the
product page's transactional "buy worksheets" intent, and different from every other blog's intent.
Stay on YOUR assigned keyword; do not drift into another blog's topic.

## Self-verify before finishing (MANDATORY)
```
node scripts/upsert-blog.js data/blogs/<your-slug>.json --dry-run
```
It must print your slug + meta lengths within limits and NO "VALIDATION FAILED". Fix any error.
Do NOT run it without `--dry-run` (the central upsert happens later). Report: slug, meta lengths,
word count, and that the dry-run passed.
