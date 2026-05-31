// scripts/seed-tuition-blogs.js
// Local-SEO blogs for the Gurgaon home-tuition service (Maths + Computer Science,
// Class 9–12, CBSE/ICSE/ISC/JEE). 3 subject pillars + 6 locality pages.
// Idempotent (skips existing slugs).  node scripts/seed-tuition-blogs.js
require('dotenv').config();
const mysql = require('mysql2/promise');

const CAT = 'Home Tuition Gurgaon';
const CTA = '\n\n---\n\n**Book a free demo class** — WhatsApp **+91 92118 65759** or [contact us here](/contact). Maths & Computer Science, Class 9–12, home or online across Gurgaon.';

const A = [
{ slug: 'maths-home-tuition-gurgaon-class-9-12',
  title: 'Maths Home Tuition in Gurgaon for Class 9–12 (CBSE, ICSE & ISC)',
  meta_title: 'Maths Home Tuition Gurgaon — Class 9–12 (CBSE/ICSE/ISC)',
  meta_desc: 'One-on-one maths home tuition in Gurgaon for Class 9–12 — CBSE, ICSE, ISC & JEE. Personalised, home or online, free demo class. WhatsApp +91 92118 65759.',
  excerpt: 'Why senior-school maths needs a specialist, what we cover for Class 9–12 across CBSE/ICSE/ISC, and how one-on-one home tuition in Gurgaon lifts marks.',
  content: `## Senior-school maths is where the marks are decided

By Class 9, maths stops rewarding memory and starts rewarding **understanding**. Algebra, trigonometry, coordinate geometry and (in Class 11–12) calculus build on each other — one weak link and the next chapter feels impossible. A crowded classroom can't pause for your child; **one-on-one home tuition can**.

## What we cover, class by class

- **Class 9 & 10** — number systems, polynomials, linear equations, triangles, trigonometry, statistics & probability. We fix the foundation and exam technique together.
- **Class 11 & 12** — sets & functions, trigonometry, limits & derivatives, integrals, vectors, 3D geometry, probability and linear programming, plus a head-start on **JEE-level** problem solving.

## CBSE, ICSE or ISC — taught to *your* board

The maths is similar; the **exam pattern isn't**. ICSE/ISC reward detailed working and proofs; CBSE leans on NCERT and competency/case-study questions. We teach to the board your child actually sits, using the right question style from day one.

## Why home tuition works better here

- The pace adapts to your child, not the class average.
- Doubts are cleared the moment they appear.
- We track weak chapters and revisit them with a written plan.
- Regular, honest feedback to parents — no surprises before boards.

Want to revise faster? Pair tuition with our [Class 12 maths case-study sets](/shop/product/math-case-studies-class-12-pdf-book) and [chapter-wise test papers](/shop/product/chapter-wise-test-papers-for-class-12-maths).

We teach across DLF, Sushant Lok, Golf Course Road, Sohna Road, South City and more — at home or online. Also read: [JEE maths home tutor in Gurgaon](/blog/jee-maths-home-tutor-gurgaon).${"" }${''}` },

{ slug: 'computer-science-home-tuition-gurgaon-class-11-12',
  title: 'Computer Science Home Tuition in Gurgaon (Class 11 & 12, CBSE & ISC)',
  meta_title: 'Computer Science Home Tuition Gurgaon — Class 11 & 12',
  meta_desc: 'Class 11 & 12 Computer Science home tuition in Gurgaon — Python (CBSE), C++ (ISC), SQL, data structures, practicals & projects. Free demo. WhatsApp +91 92118 65759.',
  excerpt: 'Computer Science is high-scoring but often under-taught. Here is exactly what Class 11–12 CS needs — and how one-on-one tuition in Gurgaon makes it click.',
  content: `## The most scoring subject students underestimate

Computer Science is one of the **highest-scoring** subjects in Class 11–12 — yet many students treat it as an afterthought until the practical exam looms. The theory is logical and the marks are there for the taking, *if* the coding actually clicks. That rarely happens from a textbook alone; it happens by **writing code with someone who can debug it live**.

## What Class 11 & 12 CS really involves

- **CBSE** — Python programming, functions, file handling, **data structures** (stacks, queues), **SQL & databases**, and Computer Networks.
- **ISC** — **C++ / Java**, object-oriented programming, recursion, data structures, and Boolean algebra.
- Both boards weigh **practicals and the project** heavily — exactly where a home tutor helps most.

## How we teach it

We code together, line by line — your child types, we guide, we break programs on purpose so they learn to fix them. We prep the **practical file and project** properly (not the night before), and drill the theory questions that repeat every year.

## Why a specialist matters

Generalist tutors often skip CS or teach it from notes. We focus on **Maths and Computer Science only**, for Class 9–12 — so the programming logic and the maths reinforce each other.

New to senior CS? Start strong with a free demo. Also see our guides on [Maths home tuition for Class 9–12](/blog/maths-home-tuition-gurgaon-class-9-12).${''}` },

{ slug: 'jee-maths-home-tutor-gurgaon',
  title: 'JEE Maths Home Tutor in Gurgaon — Mains & Advanced',
  meta_title: 'JEE Maths Home Tutor in Gurgaon — Mains & Advanced',
  meta_desc: 'Focused JEE maths home tuition in Gurgaon for Mains & Advanced — concept depth, daily practice problems and exam strategy, at home or online. WhatsApp +91 92118 65759.',
  excerpt: 'Coaching classes move fast and leave gaps. Here is how focused one-on-one JEE maths tuition in Gurgaon fills them — concepts, DPPs and real exam strategy.',
  content: `## Big coaching classes leave gaps — home tuition fills them

Most Gurgaon JEE aspirants already attend a coaching institute. The problem isn't the lectures; it's that **no one back-fills the gaps**. A single missed concept in calculus or coordinate geometry quietly drags down every test that follows. One-on-one tuition exists to catch exactly that.

## What we focus on

- **Concept depth** in the high-weight chapters — calculus, coordinate geometry, algebra, vectors and 3D, probability.
- **Daily practice problems (DPPs)** at Mains-to-Advanced difficulty, reviewed together so mistakes turn into method.
- **Exam strategy** — question selection, time per question, and avoiding silly slips that cost ranks.

## A realistic weekly rhythm

Two focused sessions a week, paired with short daily revision. We revise a chapter's formulas, then immediately apply them to a handful of JEE-level problems — because a formula you've never used won't survive exam pressure.

Use these alongside tuition: the [JEE Maths Formula Book](/shop/product/mathematics-formula-book-for-jee) and topic DPPs for [Trigonometry](/shop/product/jee-dpp-trigonometric-functions-equations) and [Complex Numbers](/shop/product/jee-mains-advance-dpp-complex-numbers) — or the discounted [JEE Formula + DPP Bundle](/shop/product/jee-maths-dpp-formula-bundle).

We tutor JEE aspirants across Golf Course Road, DLF, Sohna Road, Sushant Lok and online.${''}` },

{ slug: 'home-tutor-dlf-phase-gurgaon-maths-computer-science',
  title: 'Maths & Computer Science Home Tutor in DLF Phase 1–5, Gurgaon',
  meta_title: 'Home Tutor in DLF Phase 1–5 Gurgaon — Maths & CS',
  meta_desc: 'Experienced Maths & Computer Science home tutor for DLF Phase 1–5, Gurgaon — Class 9–12, CBSE/ICSE/ISC/JEE. Home or online, free demo. WhatsApp +91 92118 65759.',
  excerpt: 'Live in DLF City? Here is what Class 9–12 students in DLF Phase 1–5 need from a Maths & Computer Science home tutor — and how we deliver it.',
  content: `## Home tuition in DLF Phase 1–5

DLF City is home to many of Gurgaon's strongest schools and most exam-focused families. Students here often juggle a demanding board syllabus with JEE prep — and that's precisely where a steady, **one-on-one Maths and Computer Science tutor** makes the difference.

We tutor students across **DLF Phase 1, 2, 3, 4 and 5**, including families from nearby schools such as DPS, The Shri Ram School and Lancers International. (We teach the students — we're not affiliated with the schools.)

## What we offer in DLF

- **Class 9–12 Maths** — CBSE, ICSE and ISC, plus JEE foundation.
- **Computer Science** for Class 11–12 — Python, C++/Java, SQL and the practical/project.
- Sessions **at your home in DLF**, or live online if that suits your schedule better.

## Why DLF parents choose us

A specialist who teaches **only Maths & CS for Class 9–12** — so the time is spent where the marks are. You get a free demo class, a personalised plan, and regular updates.

See subject details: [Maths tuition Class 9–12](/blog/maths-home-tuition-gurgaon-class-9-12) · [Computer Science tuition](/blog/computer-science-home-tuition-gurgaon-class-11-12) · [JEE maths](/blog/jee-maths-home-tutor-gurgaon).${''}` },

{ slug: 'home-tuition-sushant-lok-gurgaon-maths-computer-science',
  title: 'Home Tuition in Sushant Lok (1, 2 & 3), Gurgaon — Maths & CS, Class 9–12',
  meta_title: 'Home Tuition in Sushant Lok Gurgaon — Maths & CS',
  meta_desc: 'Maths & Computer Science home tuition in Sushant Lok 1, 2 & 3, Gurgaon — Class 9–12, CBSE/ICSE/ISC/JEE. Home or online, free demo. WhatsApp +91 92118 65759.',
  excerpt: 'For families in Sushant Lok 1, 2 and 3 — here is how focused Maths & Computer Science home tuition supports Class 9–12 board and JEE preparation.',
  content: `## Home tuition across Sushant Lok

Sushant Lok is one of Gurgaon's most established residential areas, well connected to Golf Course Road and MG Road, with a strong mix of CBSE, ICSE and ISC students. We provide focused **Maths and Computer Science home tuition** for Class 9–12 right here in **Sushant Lok 1, 2 and 3**.

## What we teach

- **Maths, Class 9–12** — board syllabus (CBSE/ICSE/ISC) plus JEE-level depth for those targeting engineering.
- **Computer Science, Class 11–12** — Python (CBSE), C++/Java (ISC), SQL, data structures and the practical file & project.

## Why it works for Sushant Lok students

Travel time in Gurgaon eats into study time. With **home tuition in Sushant Lok**, the tutor comes to you — or teaches live online — so your child studies fresh, not tired from a commute. Every session is one-on-one, paced to your child, with honest feedback to parents.

Start with a **free demo class**. More: [Class 9–12 maths](/blog/maths-home-tuition-gurgaon-class-9-12) · [Computer Science](/blog/computer-science-home-tuition-gurgaon-class-11-12).${''}` },

{ slug: 'home-tutor-golf-course-road-gurgaon-maths',
  title: 'Maths & CS Home Tutor on Golf Course Road, Gurgaon (Class 9–12, JEE)',
  meta_title: 'Home Tutor on Golf Course Road Gurgaon — Maths & CS',
  meta_desc: 'Maths & Computer Science home tutor on Golf Course Road, Gurgaon — Class 9–12, CBSE/ICSE/ISC and JEE Mains/Advanced. Home or online, free demo. +91 92118 65759.',
  excerpt: 'Golf Course Road families want results. Here is how one-on-one Maths & Computer Science tuition supports Class 9–12 boards and JEE on Golf Course Road.',
  content: `## Home tuition on Golf Course Road

Golf Course Road and Golf Course Extension are among Gurgaon's most premium addresses, with ambitious students aiming for top boards results and **JEE**. We offer specialist **Maths and Computer Science home tuition** for Class 9–12 along the Golf Course Road corridor.

## What we cover

- **Maths, Class 9–12** — CBSE, ICSE, ISC and a serious **JEE Mains & Advanced** track.
- **Computer Science, Class 11–12** — Python, C++/Java, SQL, data structures and practicals.

## The Golf Course Road advantage

Many students here are already in coaching for JEE. Our role is to **fill the gaps coaching leaves** — the one missed concept that drags down every mock test — with patient, one-on-one attention at home or online.

Pair tuition with our [JEE Maths Formula Book](/shop/product/mathematics-formula-book-for-jee) and [DPP bundle](/shop/product/jee-maths-dpp-formula-bundle). Read more: [JEE maths home tutor in Gurgaon](/blog/jee-maths-home-tutor-gurgaon).${''}` },

{ slug: 'home-tuition-sohna-road-gurgaon-maths-computer-science',
  title: 'Home Tuition on Sohna Road, Gurgaon — Maths & Computer Science (Class 9–12)',
  meta_title: 'Home Tuition on Sohna Road Gurgaon — Maths & CS',
  meta_desc: 'Maths & Computer Science home tuition on Sohna Road, Gurgaon — Class 9–12, CBSE/ICSE/ISC/JEE. Home or online, free demo class. WhatsApp +91 92118 65759.',
  excerpt: 'Sohna Road has grown into a major residential belt. Here is how Class 9–12 students get focused Maths & Computer Science home tuition here.',
  content: `## Home tuition along Sohna Road

Sohna Road has become one of Gurgaon's biggest residential belts, with many high-rise communities and a growing number of CBSE and ICSE students. We bring specialist **Maths and Computer Science home tuition** for Class 9–12 to families across Sohna Road and the nearby sectors.

## What we offer

- **Maths, Class 9–12** — full board coverage plus JEE foundation for engineering aspirants.
- **Computer Science, Class 11–12** — Python, C++/Java, SQL, data structures, and the all-important practical and project.

## Built around busy Sohna Road schedules

With traffic on Sohna Road, **home and online tuition** save the commute so study time stays focused. Lessons are one-on-one, planned around your child's weak chapters, with regular parent updates.

Book a **free demo**. Explore: [Maths tuition Class 9–12](/blog/maths-home-tuition-gurgaon-class-9-12) · [Computer Science tuition](/blog/computer-science-home-tuition-gurgaon-class-11-12) · [JEE maths](/blog/jee-maths-home-tutor-gurgaon).${''}` },

{ slug: 'home-tutor-south-city-gurgaon-maths-computer-science',
  title: 'Maths & Computer Science Home Tutor in South City 1 & 2, Gurgaon',
  meta_title: 'Home Tutor in South City 1 & 2 Gurgaon — Maths & CS',
  meta_desc: 'Maths & Computer Science home tutor in South City 1 & 2, Gurgaon — Class 9–12, CBSE/ICSE/ISC/JEE. Home or online, free demo. WhatsApp +91 92118 65759.',
  excerpt: 'For South City 1 and 2 families — focused Maths & Computer Science home tuition for Class 9–12, taught to your board and pace.',
  content: `## Home tuition in South City 1 & 2

South City 1 and 2 are settled, family-oriented neighbourhoods with a steady demand for serious, results-focused tutoring. We provide one-on-one **Maths and Computer Science home tuition** for Class 9–12 across both South City 1 and South City 2.

## What we teach

- **Maths, Class 9–12** — CBSE, ICSE, ISC, and JEE-level depth where needed.
- **Computer Science, Class 11–12** — Python, C++/Java, SQL, data structures and practicals.

## Why families here choose us

A specialist who does **only Maths & CS for senior classes** means every minute targets the marks. Add a free demo class, a written study plan and regular feedback, and you have tuition that actually moves the report card.

More on what we teach: [Maths Class 9–12](/blog/maths-home-tuition-gurgaon-class-9-12) · [Computer Science](/blog/computer-science-home-tuition-gurgaon-class-11-12).${''}` },

{ slug: 'home-tuition-sector-45-47-56-57-gurgaon-maths',
  title: 'Home Tuition in Sectors 45, 47, 56 & 57 Gurgaon — Maths & CS (Class 9–12)',
  meta_title: 'Home Tuition Sectors 45/47/56/57 Gurgaon — Maths & CS',
  meta_desc: 'Maths & Computer Science home tuition in Sectors 45, 47, 56 & 57, Gurgaon — Class 9–12, CBSE/ICSE/ISC/JEE. Home or online, free demo. +91 92118 65759.',
  excerpt: 'Living in Sector 45, 47, 56 or 57? Here is how Class 9–12 students get specialist Maths & Computer Science home tuition in these central Gurgaon sectors.',
  content: `## Home tuition across Sectors 45, 47, 56 & 57

These central Gurgaon sectors — close to schools and the Sohna Road / Golf Course Extension belt — have a large base of Class 9–12 students preparing for boards and JEE. We offer specialist **Maths and Computer Science home tuition** throughout **Sectors 45, 47, 56 and 57** (and neighbouring sectors).

## What we cover

- **Maths, Class 9–12** — CBSE, ICSE and ISC, plus a JEE Mains/Advanced track.
- **Computer Science, Class 11–12** — Python, C++/Java, SQL, data structures and the practical & project.

## Local, focused, one-on-one

Because we come to your home in the sector (or teach online), there's no commute eating into study time. Lessons are personalised, weak chapters are tracked and revisited, and parents get honest updates.

Get a **free demo class** to see the fit. Read more: [Maths tuition Class 9–12](/blog/maths-home-tuition-gurgaon-class-9-12) · [JEE maths home tutor](/blog/jee-maths-home-tutor-gurgaon).${''}` }
];

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASS || '', database: process.env.DB_NAME || 'mathstudy'
  });
  let created = 0, skipped = 0;
  for (const a of A) {
    const [[ex]] = await db.query('SELECT id FROM blogs WHERE slug=?', [a.slug]);
    if (ex) { skipped++; console.log('  = exists:', a.slug); continue; }
    const content = a.content + CTA;
    await db.query(
      `INSERT INTO blogs (title,slug,content,excerpt,cover_image,category,author,meta_title,meta_desc,status)
       VALUES (?,?,?,?,?,?,?,?,?, 'published')`,
      [a.title, a.slug, content, a.excerpt, '', CAT, 'MathStudy Tuition', a.meta_title, a.meta_desc.slice(0,158)]);
    created++; console.log('  + published:', a.slug);
  }
  console.log(`Done — ${created} published, ${skipped} skipped.`);
  await db.end(); process.exit(0);
})().catch((e) => { console.error('Failed:', e); process.exit(1); });
