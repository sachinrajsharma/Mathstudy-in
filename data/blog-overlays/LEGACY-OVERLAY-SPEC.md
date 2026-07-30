# MathStudy.in — Legacy Blog OVERLAY spec (content-bearing pages)

You are enriching a content-bearing legacy blog (NCERT exercise solutions, past
papers, exemplar/misc problems, objective banks). Its existing solution content is
VALUABLE and MUST be preserved — you do NOT rewrite it. You only ADD an engagement
layer: an MCQ test, an FAQ, a product CTA and better meta tags.

## Read first
`F:\MATHSTUDY\data\blogs\grade-1-addition-how-to-teach.json` — match the quiz + faq JSON shapes exactly (same keys). Human-voice + banned-phrase rules in BLOG-SPEC.md still apply to the quiz/faq/meta text you write.

## File to produce
`F:\MATHSTUDY\data\blog-overlays\<slug>.json` — an OVERLAY object. It MUST NOT contain a `content` field (content stays as-is). Keys:
- `slug` — the assigned slug, EXACT.
- `meta_title` — <=60 chars, primary keyword front. (<=65 hard.)
- `meta_desc` — 140–155 chars, keyword + benefit + soft CTA. (<=160 hard.)
- `category` — level label inferred from the title (e.g. "Class 12 Maths", "Class 11 Maths", "Class 10 Maths", "JEE").
- `cta_product_slug` — the assigned CTA product (or omit if "(none)").
- `quiz` — {title, intro, about, level, questions:[EXACTLY 8]}. Each: {q, options:[4], answer:0-3, explanation}. The questions must be ABOUT THE PAGE'S TOPIC (infer from the title — e.g. a "NCERT Integration Exercise 7.2" page → quiz on that integration method; a "past paper 2015" page → mixed board-level questions; an "objective questions differential equations" page → DE MCQs). Spread answers across all four positions. Keep the maths correct and at the page's level.
- `faq` — 4–5 items [{q, a}]. Answer common questions about the topic; the LAST faq mentions the linked e-book/solutions and that the link is in the box below.

## Rules
- Infer the exact topic + level from the assigned title. Stay strictly on that topic.
- HTML entities are fine in quiz/faq/meta (the pipeline decodes escaped fields). Use SINGLE quotes inside any HTML in faq answers so the JSON stays valid.
- No banned AI phrases. Keep quiz explanations genuinely useful.

## Self-verify (mandatory)
```
node scripts/check-overlay.js data/blog-overlays/<slug>.json
```
Must print `OK ...` with NO "VALIDATION FAILED". Report: slug, meta lengths, quiz Q count, dry-run passed.
