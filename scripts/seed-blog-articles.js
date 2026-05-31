// scripts/seed-blog-articles.js
// (2) Content moat — 4 helpful, internally-linked SEO articles that funnel to
// products/bundles. Idempotent (skips a slug that already exists).
//   node scripts/seed-blog-articles.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const ARTICLES = [
{
  slug: 'how-to-solve-cbse-class-12-maths-case-study-questions',
  title: 'How to Solve CBSE Class 12 Maths Case Study Questions (With Examples)',
  meta_title: 'How to Solve Class 12 Maths Case Study Questions',
  meta_desc: 'A clear 4-step method to crack CBSE Class 12 maths case-study questions, with a worked Probability example and the mistakes that cost marks.',
  category: 'Class 12 Maths',
  cover_from: 'math-case-studies-class-12-pdf-book',
  excerpt: 'A simple 4-step method for CBSE Class 12 maths case-study questions, with a worked Probability example and the three mistakes that quietly cost marks.',
  content: `## Why case-study questions decide your Class 12 maths marks

Since the pattern changed, CBSE puts **case-study (case-based) questions** in the Class 12 maths paper — and they're where well-prepared students still drop marks. The maths isn't harder; the *format* is. You read a real-life passage, then answer 4–5 sub-questions from it. Miss what the passage is telling you and the whole block goes wrong.

Here's the method that works, plus a worked example.

## The 4-step method

1. **Read the passage twice — slowly.** First read for the story, second to underline the numbers and what's asked.
2. **Translate words into maths.** "The probability that the machine fails" becomes P(F). Write down every given value before you touch a sub-question.
3. **Answer sub-questions in order.** Part (i) usually feeds part (ii) — don't jump ahead.
4. **State the formula, then substitute.** Examiners award method marks even if the final number slips.

## Worked example (Probability)

> A factory has two machines A and B, producing 60% and 40% of items. 2% of A's items and 3% of B's are defective. An item is found defective.

- **(i) P(defective)** = 0.6×0.02 + 0.4×0.03 = 0.012 + 0.012 = **0.024**
- **(ii) P(from B | defective)** by Bayes' theorem = (0.4×0.03) / 0.024 = **0.5**

Notice how part (i) is reused in part (ii). That is the case-study pattern in a nutshell.

## The three mistakes that cost marks

- Calculating from memory instead of the passage's numbers.
- Skipping the formula line (you lose method marks).
- Rounding too early — keep full decimals until the final step.

## Practise the real thing

Reading a method is one thing; marks come from practice on *exam-pattern* case studies. Our solved sets cover exactly this format:

- [Class 12 Maths Case Study Questions (all chapters)](/shop/product/math-case-studies-class-12-pdf-book)
- [Class 12 Probability Case Study Questions](/shop/product/case-studies-class-12-probability-with-solutions)
- Or get both and save with the [Class 12 Case Studies Bundle](/shop/product/class-12-maths-case-studies-bundle)

Work through 15–20 of these and the format stops being scary — it becomes free marks.`
},
{
  slug: 'cbse-class-8-maths-case-studies-chapter-wise-guide',
  title: 'CBSE Class 8 Maths Case Studies: A Chapter-wise Guide + Practice',
  meta_title: 'Class 8 Maths Case Studies — Chapter-wise Guide',
  meta_desc: 'What Class 8 maths case-study questions look like chapter by chapter, how to practise them, and solved PDFs for every topic.',
  category: 'Class 8 Maths',
  cover_from: 'case-studies-class-8-algebraic-expressions-pdf',
  excerpt: 'What Class 8 maths case-study questions look like chapter by chapter, how to practise them so they stick, and where to get solved practice.',
  content: `## What case-study questions look like in Class 8 maths

CBSE's competency-based pattern means Class 8 maths now asks **case-study questions** — short real-world passages followed by a few questions. They reward students who can *apply* a concept, not just repeat it. The good news: once you've seen a few per chapter, they become predictable.

## Chapter by chapter — what to expect

- **Rational Numbers** — number-line and operations set in shopping or temperature contexts.
- **Exponents & Powers** — large or tiny numbers (population, distances) in standard form.
- **Algebraic Expressions** — forming and simplifying an expression from a worded situation.
- **Squares, Square Roots & Cube Roots** — area/volume and perfect-square reasoning.
- **Number System** — classifying numbers and using their properties in a scenario.

## How to practise so it sticks

1. Do one chapter at a time — don't mix topics.
2. For each passage, write the given data first.
3. After solving, re-read the passage to check your answer makes sense in context.

## Ready-made, solved practice

Each of our Class 8 sets is chapter-focused, with full solutions:

- [Algebraic Expressions](/shop/product/case-studies-class-8-algebraic-expressions-pdf)
- [Exponents & Powers](/shop/product/case-studies-class-8-exponents-and-powers-pdf)
- [Rational Numbers](/shop/product/case-studies-class-8-rational-numbers-pdf)
- [Squares & Cube Roots](/shop/product/case-studies-class-8-square-root-and-cube-roots-pdf)
- [Number System](/shop/product/case-studies-number-system-class-8-e-book)

Or grab the complete [Class 8 Case Studies Full Set](/shop/product/class-8-maths-case-studies-full-set) at a discount.`
},
{
  slug: 'grade-3-maths-word-problems-guide',
  title: 'Grade 3 Maths Word Problems: How to Help Your Child (15 Examples)',
  meta_title: 'Grade 3 Maths Word Problems — Parent Guide',
  meta_desc: 'A simple home routine to help Grade 3 children solve maths word problems, with examples for each operation and printable practice.',
  category: 'Primary Maths',
  cover_from: 'addition-word-problems-for-grade-3',
  excerpt: 'A simple home routine that helps Grade 3 children turn word problems into sums, with quick examples for each operation and printable practice.',
  content: `## Why word problems trip up Grade 3 kids (and how to fix it)

At Grade 3, the maths is simple — it's the *reading* that's hard. A child who computes 24 ÷ 4 in a second may freeze at "Riya shares 24 sweets equally among 4 friends." The skill to teach isn't arithmetic; it's turning a sentence into a sum.

## A simple routine that works at home

1. **Read it aloud together.** Hearing it helps.
2. **Underline the numbers and the question.**
3. **Ask: are we joining, taking away, sharing, or grouping?** That picks the operation.
4. **Write the number sentence, then solve.**
5. **Check: does the answer make sense?**

## Quick examples by operation

- *Addition:* "A library had 156 books; 78 more arrived. How many now?" → 156 + 78 = 234.
- *Subtraction:* "A shop had 200 pens; sold 145. How many left?" → 200 − 145 = 55.
- *Multiplication:* "6 boxes, 8 pencils each." → 6 × 8 = 48.
- *Division:* "30 students, 5 per group." → 30 ÷ 5 = 6 groups.

Do a few of each *type* before mixing them — mixing too early is what causes the panic.

## Printable practice (with answers)

Our Grade 3 worksheets give graded practice by operation, each with an answer key:

- [Addition](/shop/product/addition-word-problems-for-grade-3) · [Subtraction](/shop/product/subtraction-word-problems-for-grade-3) · [Multiplication (150 problems)](/shop/product/multiplication-word-problems-for-grade-3-150-problems) · [Division](/shop/product/word-problems-for-grade-3-division) · [Mixed](/shop/product/mixed-word-problems-for-grade-3)
- Everything together: the [Grade 3 Word Problems Mega Pack](/shop/product/grade-3-word-problems-mega-pack).`
},
{
  slug: 'jee-maths-formula-revision-guide',
  title: 'JEE Maths Formula Revision: How to Memorise Every Formula (Smart Method)',
  meta_title: 'JEE Maths Formula Revision — Smart Method',
  meta_desc: 'A spaced, active-recall system to actually remember every JEE maths formula in the exam — plus the tools to revise and apply them.',
  category: 'JEE',
  cover_from: 'mathematics-formula-book-for-jee',
  excerpt: 'Stop re-reading and start remembering: a spaced, active-recall system for JEE maths formulas, plus how to pair revision with practice.',
  content: `## You don't have a memory problem — you have a system problem

Most JEE aspirants "know" the formulas but blank in the exam. The fix isn't more re-reading; it's **active, spaced revision** from a single, well-organised source.

## A revision system that actually holds

1. **One source, chapter-wise.** Flipping between books wastes the time your brain needs to consolidate.
2. **Active recall, not re-reading.** Cover the formula, write it from memory, check. Re-reading feels productive and isn't.
3. **Spaced repetition.** Revisit a chapter's formulas on day 1, 3, 7 and 21. Each pass takes less time.
4. **Apply immediately.** A formula recalled but never used won't survive exam pressure — pair revision with a few DPP questions on that topic the same day.

## Make it a daily 20-minute habit

Pick two chapters a day: five minutes recalling formulas, fifteen applying them to a handful of JEE-level problems. Over a month you'll cycle the whole syllabus twice.

## The tools we built for exactly this

- The [JEE Maths Formula Book](/shop/product/mathematics-formula-book-for-jee) — every formula, chapter-wise, in one PDF to revise from.
- Topic DPPs to apply them: [Trigonometry](/shop/product/jee-dpp-trigonometric-functions-equations) and [Complex Numbers](/shop/product/jee-mains-advance-dpp-complex-numbers).
- Both, bundled: the [JEE Formula + DPP Bundle](/shop/product/jee-maths-dpp-formula-bundle).`
}
];

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASS || '', database: process.env.DB_NAME || 'mathstudy'
  });
  let created = 0, skipped = 0;
  for (const a of ARTICLES) {
    const [[ex]] = await db.query('SELECT id FROM blogs WHERE slug=?', [a.slug]);
    if (ex) { skipped++; console.log('  = exists:', a.slug); continue; }
    let cover = '';
    if (a.cover_from) { const [[p]] = await db.query('SELECT cover_image FROM products WHERE slug=?', [a.cover_from]); cover = (p && p.cover_image) || ''; }
    await db.query(
      `INSERT INTO blogs (title,slug,content,excerpt,cover_image,category,author,meta_title,meta_desc,status)
       VALUES (?,?,?,?,?,?,?,?,?, 'published')`,
      [a.title, a.slug, a.content, a.excerpt, cover, a.category, 'MathStudy Editorial', a.meta_title, a.meta_desc]);
    created++; console.log('  + published:', a.slug);
  }
  console.log(`Done — ${created} published, ${skipped} skipped.`);
  await db.end(); process.exit(0);
})().catch((e) => { console.error('Failed:', e); process.exit(1); });
