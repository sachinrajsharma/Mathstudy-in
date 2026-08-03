/**
 * import-cat-blogs.js — upserts the CAT Quant SEO blog posts
 * (data/blogs/cat-quant-*.json) via the canonical upsert-blog.js.
 * Idempotent. Safe to re-run; touches ONLY the CAT Quant blog slugs.
 *   node scripts/import-cat-blogs.js
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'data', 'blogs');
const files = fs.readdirSync(dir).filter(f => /^cat-quant-.*\.json$/.test(f)).sort();
if (!files.length) { console.log('No CAT blog files found in data/blogs/.'); process.exit(0); }

let ok = 0, fail = 0;
for (const f of files) {
  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, 'upsert-blog.js'), path.join(dir, f)], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    const line = (out.match(/✓[^\n]*/) || ['(ok)'])[0];
    console.log('  ✓ ' + f + '  ' + line.trim()); ok++;
  } catch (e) { console.error('  ✗ ' + f + '\n' + (e.stdout || '') + (e.stderr || e.message)); fail++; }
}
console.log(`\nDone — ${ok} CAT blogs upserted, ${fail} failed.`);
process.exit(fail ? 1 : 0);
