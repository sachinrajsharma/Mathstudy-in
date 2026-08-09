/**
 * gen-jee-dpp-covers.js  (LOCAL-ONLY tool — not part of setup-fresh)
 *
 * Converts the 31 JEE Maths DPP cover PNGs (authored in the e-book source
 * folders on D:) into shop-ready JPGs at public/wp-content/uploads/<slug>.jpg.
 * Run once on the dev machine and COMMIT the JPGs; the server never runs this.
 *
 *   node scripts/gen-jee-dpp-covers.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = 'D:/DATABASE QUESTION BANK/DPP QUESTION BANKS/JEE DPP EBOOKS';
const OUT = path.join(__dirname, '..', 'public', 'wp-content', 'uploads');
const DATA = path.join(__dirname, '..', 'data', 'jee-dpp-products.json');

(async () => {
  const { products } = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  let done = 0;
  for (const p of products) {
    const dir = path.join(SRC, p.folder);
    const png = fs.readdirSync(dir).find(f => /^cover-.*\.png$/i.test(f));
    if (!png) { console.error('NO COVER PNG in ' + p.folder); process.exitCode = 1; continue; }
    const out = path.join(OUT, p.slug + '.jpg');
    await sharp(path.join(dir, png)).resize({ width: 900 }).jpeg({ quality: 82 }).toFile(out);
    const kb = Math.round(fs.statSync(out).size / 1024);
    console.log(p.slug + '.jpg  (' + kb + ' KB, from ' + png + ')');
    done++;
  }
  console.log('\n' + done + '/' + products.length + ' covers written to public/wp-content/uploads');
})();
