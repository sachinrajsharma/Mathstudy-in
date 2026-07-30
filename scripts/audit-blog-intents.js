/**
 * audit-blog-intents.js — SEO duplicate-intent audit for the legacy blogs.
 *
 *   node scripts/audit-blog-intents.js          (reads data/blogs-export.json)
 *
 * WHY: a Google core/Helpful-Content update treats several posts targeting the
 * SAME search intent as one and suppresses the rest, which crushed impressions.
 * This script finds those near-duplicate clusters so we can keep ONE canonical
 * post per intent and 301 the others to it, then flags every post that still
 * needs a CTA / quiz / meta / de-thinning.
 *
 * Outputs (all in data/):
 *   - blog-audit-report.md            human-readable findings + plan
 *   - blog-redirects.proposed.json    {redirects:{oldSlug:newSlug}} for review
 *   - blog-cta-map.proposed.json      {slug: best_product_slug} for review
 * NOTHING is written to the DB or to live redirects — these are proposals to review.
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const exp = JSON.parse(fs.readFileSync(path.join(DATA, 'blogs-export.json'), 'utf8'));
const blogs = exp.blogs || [];
const products = exp.products || [];

// Words that carry no INTENT — strip before building the intent signature.
const STOP = new Set(('a an the of for to in on with and or your you our we is are be how what why when '
  + 'class grade std standard maths math mathematics cbse icse ncert solutions solution guide guides '
  + 'worksheet worksheets pdf printable free online test quiz questions question answers answer chapter '
  + 'chapterwise chapter-wise notes revision study case studies study-material material examples example '
  + 'best top complete full step by download practice problems problem').split(/\s+/));

function tokens(s) {
  return String(s || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(w => w && w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
}
// Intent signature = the class/grade level (kept, since class-6 vs class-8 are
// different intents) + the sorted set of meaningful topic tokens.
function levelOf(s) {
  const m = String(s || '').toLowerCase().match(/(class|grade)[ -]?(\d{1,2}|xi{0,2}|x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/);
  if (m) return 'L' + m[2];
  if (/\bjee\b/i.test(s)) return 'jee';
  if (/\bneet\b/i.test(s)) return 'neet';
  return '';
}
function signature(b) {
  const base = (b.title || '') + ' ' + (b.slug || '').replace(/-/g, ' ');
  const lvl = levelOf(base) || levelOf(b.category || '');
  const topic = [...new Set(tokens(base))].sort();
  return { lvl, topic, key: lvl + '|' + topic.join(' ') };
}
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b); if (!A.size && !B.size) return 1;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

// Build signatures, then cluster: same level AND (identical topic set OR Jaccard>=0.6).
const sigs = blogs.map(b => ({ b, ...signature(b) }));
const parent = sigs.map((_, i) => i);
const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])));
const union = (a, b) => { parent[find(a)] = find(b); };
for (let i = 0; i < sigs.length; i++)
  for (let j = i + 1; j < sigs.length; j++) {
    if (sigs[i].lvl !== sigs[j].lvl) continue;
    if (sigs[i].key === sigs[j].key || jaccard(sigs[i].topic, sigs[j].topic) >= 0.6) union(i, j);
  }
const clusters = {};
sigs.forEach((s, i) => { const r = find(i); (clusters[r] = clusters[r] || []).push(s); });
const dupClusters = Object.values(clusters).filter(c => c.length > 1);

// Canonical pick within a cluster: prefer most views, then most words, then has quiz.
function pickCanonical(c) {
  return c.slice().sort((x, y) =>
    (y.b.views - x.b.views) || (y.b.word_count - x.b.word_count) ||
    ((y.b.has_quiz ? 1 : 0) - (x.b.has_quiz ? 1 : 0)))[0];
}

// Propose redirects: every non-canonical in a cluster -> canonical.
const redirects = {};
dupClusters.forEach(c => {
  const canon = pickCanonical(c);
  c.forEach(s => { if (s.b.slug !== canon.b.slug) redirects[s.b.slug] = canon.b.slug; });
});

// CTA match: best product by token overlap of blog vs product (same level weighted).
const prodTok = products.map(p => ({ p, t: tokens((p.title || '') + ' ' + (p.category_name || '')), lvl: levelOf(p.title || '') || levelOf(p.category_name || '') }));
function bestProduct(b) {
  const bt = tokens((b.title || '') + ' ' + (b.slug || '').replace(/-/g, ' '));
  const blvl = levelOf((b.title || '') + ' ' + (b.category || ''));
  let best = null, bestScore = 0;
  for (const pt of prodTok) {
    let score = jaccard(bt, pt.t) * 100;
    if (blvl && pt.lvl && blvl === pt.lvl) score += 15; // same class/grade is a strong signal
    if (score > bestScore) { bestScore = score; best = pt; }
  }
  return best && bestScore >= 12 ? { slug: best.p.slug, score: Math.round(bestScore) } : null;
}
const ctaMap = {};
blogs.forEach(b => { const m = bestProduct(b); if (m) ctaMap[b.slug] = m.slug; });

// Flags
const thin = blogs.filter(b => b.word_count < 600);
const noMetaTitle = blogs.filter(b => !b.meta_title);
const noMetaDesc = blogs.filter(b => !b.meta_desc);
const noQuiz = blogs.filter(b => !b.has_quiz);
const noCta = blogs.filter(b => !b.cta_product_slug);
const markdown = blogs.filter(b => b.content_format === 'markdown');
const noCover = blogs.filter(b => !b.cover_image);

// Report
let r = '# MathStudy.in — Legacy Blog SEO Audit\n\n';
r += `Source: data/blogs-export.json (exported ${exp.exported_at})\n\n`;
r += `**Total blogs:** ${blogs.length}  |  **Products for CTA matching:** ${products.length}\n\n`;
r += '## 1. Duplicate-intent clusters (the penalty cause)\n\n';
r += `Found **${dupClusters.length} clusters** covering **${dupClusters.reduce((n, c) => n + c.length, 0)} posts** that compete for the same intent. `;
r += `Plan: keep the canonical (most views/words), 301 the rest. **${Object.keys(redirects).length} redirects proposed.**\n\n`;
dupClusters.sort((a, b) => b.length - a.length).forEach((c, i) => {
  const canon = pickCanonical(c);
  r += `### Cluster ${i + 1} — intent: \`${canon.key || '(none)'}\` (${c.length} posts)\n`;
  r += `- CANONICAL: \`${canon.b.slug}\` — "${canon.b.title}" (${canon.b.views} views, ${canon.b.word_count} words)\n`;
  c.filter(s => s.b.slug !== canon.b.slug).forEach(s =>
    r += `  - 301 -> canonical: \`${s.b.slug}\` — "${s.b.title}" (${s.b.views} views, ${s.b.word_count} words)\n`);
  r += '\n';
});
r += '## 2. Enhancement backlog (for surviving canonical posts)\n\n';
r += `- Missing embedded MCQ quiz: **${noQuiz.length}**\n`;
r += `- Missing product CTA: **${noCta.length}**  (auto-matched a product for **${Object.keys(ctaMap).length}**)\n`;
r += `- Missing meta_title: **${noMetaTitle.length}**  |  Missing meta_desc: **${noMetaDesc.length}**\n`;
r += `- Thin (<600 words): **${thin.length}**\n`;
r += `- Markdown (not server-rendered — SEO weakness): **${markdown.length}**\n`;
r += `- Missing cover image: **${noCover.length}**\n\n`;
r += '## 3. Proposed CTA matches (sample of first 40)\n\n';
Object.entries(ctaMap).slice(0, 40).forEach(([b, p]) => r += `- \`${b}\` -> product \`${p}\`\n`);
r += `\n(Full map: data/blog-cta-map.proposed.json — ${Object.keys(ctaMap).length} entries)\n`;

fs.writeFileSync(path.join(DATA, 'blog-audit-report.md'), r);
fs.writeFileSync(path.join(DATA, 'blog-redirects.proposed.json'), JSON.stringify({ redirects }, null, 2));
fs.writeFileSync(path.join(DATA, 'blog-cta-map.proposed.json'), JSON.stringify(ctaMap, null, 2));

console.log('=== AUDIT COMPLETE ===');
console.log('blogs:', blogs.length, '| duplicate clusters:', dupClusters.length,
  '| redirects proposed:', Object.keys(redirects).length);
console.log('no quiz:', noQuiz.length, '| no CTA:', noCta.length, '| thin:', thin.length,
  '| markdown:', markdown.length, '| no meta_desc:', noMetaDesc.length);
console.log('CTA auto-matched:', Object.keys(ctaMap).length);
console.log('\nWrote: data/blog-audit-report.md, blog-redirects.proposed.json, blog-cta-map.proposed.json');
