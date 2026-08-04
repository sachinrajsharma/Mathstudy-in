/**
 * import-class12-case-study-blogs.js — upserts the 14 "Class 12 case study
 * online test" blog posts (data/blogs/math-case-study-*-class-12.json) via the
 * canonical upsert-blog.js. Idempotent; touches ONLY these slugs.
 *   node scripts/import-class12-case-study-blogs.js
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'data', 'blogs');
const files = fs.readdirSync(dir).filter(f => /^math-case-study-.*-class-12\.json$/.test(f)).sort();
if (!files.length) { console.log('No Class 12 case-study blog files found in data/blogs/.'); process.exit(0); }

let ok = 0, fail = 0;
for (const f of files) {
  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, 'upsert-blog.js'), path.join(dir, f)], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    const line = (out.match(/✓[^\n]*/) || ['(ok)'])[0];
    console.log('  ✓ ' + f + '  ' + line.trim()); ok++;
  } catch (e) { console.error('  ✗ ' + f + '\n' + (e.stdout || '') + (e.stderr || e.message)); fail++; }
}
console.log(`\nDone — ${ok} Class 12 case-study blogs upserted, ${fail} failed.`);
process.exit(fail ? 1 : 0);
