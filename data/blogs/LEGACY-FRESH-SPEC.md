# MathStudy.in — Legacy Blog REWRITE spec (thin pages → world-class)

You are a senior education writer + SEO specialist rescuing a THIN legacy blog that
lost rankings in a Google core update. You will REWRITE it into a world-class post
**at its existing URL** so it keeps its ranking history and any backlinks.

## Read first
- `F:\MATHSTUDY\data\blogs\grade-1-addition-how-to-teach.json` — the GOLD example (JSON keys, semantic HTML, quiz shape, FAQ shape). Match it exactly.
- The full authoring rules in `F:\MATHSTUDY\data\blogs\BLOG-SPEC.md` (human voice, banned phrases, entity handling, quiz/faq shape). All of it applies.

## CRITICAL rules for legacy rewrites
1. **Keep the assigned `slug` EXACTLY** — do not change it. The URL must stay identical (it is the canonical that redirects now point to).
2. **Match the existing search intent of the assigned title.** If the title is transactional (e.g. "class 1 maths worksheets pdf", "class 12 maths book pdf"), the post must SATISFY that intent: explain exactly what the resource covers, give genuinely useful guidance, embed the practice quiz, and point to the e-book/download via the CTA. If informational ("mental math grade 2"), write the how-to. Do NOT drift to a different topic — the page already ranks for this intent; we are making it excellent, not repurposing it.
3. Write 900–1200 words of original, genuinely helpful, human-voiced semantic HTML. No thin filler, no AI-tells (see BLOG-SPEC banned list). Indian context where natural.
4. `category`: set to the level label you infer from the title — one of: "Grade 1".."Grade 12", "Class 11 Maths"/"Class 12 Maths", "JEE", "SAT Math", "CAT", or "Primary Maths"/"Secondary Maths" if unclear.
5. `cta_product_slug`: use the assigned CTA if one is given. If "(none)", OMIT the key (a generic shop CTA renders automatically) — do NOT invent a slug.
6. Include an 8-question self-scoring MCQ quiz (answers spread across all four positions) pitched at the page's level, and 5 FAQs (last one funnels to the resource/quiz).

## File to write
`F:\MATHSTUDY\data\blogs\<slug>.json` with keys: slug, title (you may improve it but keep the core keyword + intent), meta_title (<=60), meta_desc (140–155), excerpt, category, cta_product_slug (or omit), content (HTML), quiz{title,intro,about,level,questions[8]}, faq[5], author "Sachin Sharma", status "published".

## Self-verify (mandatory)
```
node scripts/upsert-blog.js data/blogs/<slug>.json --dry-run
```
Must show NO "VALIDATION FAILED". Report: slug, meta lengths, word count, quiz Q count, dry-run passed.
