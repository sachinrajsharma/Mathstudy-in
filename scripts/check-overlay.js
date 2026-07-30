// Validate a legacy OVERLAY file (adds quiz/faq/cta/meta to an existing blog by
// slug WITHOUT content). Usage: node scripts/check-overlay.js data/blog-overlays/<slug>.json
const fs = require('fs');
const f = process.argv[2];
if (!f) { console.error('usage: check-overlay.js <file>'); process.exit(1); }
let o; try { o = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error('VALIDATION FAILED: bad JSON -', e.message); process.exit(1); }
const errs = [];
if (!o.slug || !/^[a-z0-9-]+$/.test(o.slug)) errs.push('slug missing/not kebab');
if (o.content !== undefined) errs.push('overlay MUST NOT include a content field (content is preserved)');
if (o.meta_title && o.meta_title.length > 65) errs.push('meta_title > 65 (' + o.meta_title.length + ')');
if (o.meta_desc && o.meta_desc.length > 160) errs.push('meta_desc > 160 (' + o.meta_desc.length + ')');
if (!o.quiz || !Array.isArray(o.quiz.questions) || o.quiz.questions.length !== 8) errs.push('quiz.questions must have exactly 8');
(o.quiz && o.quiz.questions || []).forEach((q, i) => {
  if (!q.q) errs.push('Q' + (i + 1) + ' missing q');
  if (!Array.isArray(q.options) || q.options.length !== 4) errs.push('Q' + (i + 1) + ' needs 4 options');
  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) errs.push('Q' + (i + 1) + ' answer 0-3');
});
if (!Array.isArray(o.faq) || o.faq.length < 4) errs.push('faq needs >=4 items');
if (errs.length) { console.error('VALIDATION FAILED:\n - ' + errs.join('\n - ')); process.exit(1); }
console.log('OK', o.slug, '| meta_title', (o.meta_title || '').length, '| meta_desc', (o.meta_desc || '').length, '| quiz', o.quiz.questions.length, '| faq', o.faq.length, '| cta', o.cta_product_slug || '(none)');
