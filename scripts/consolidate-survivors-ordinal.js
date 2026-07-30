// Supplementary consolidation: catch same-intent survivor duplicates that differ
// only by ordinal WORD vs DIGIT ("second" vs "2nd", "first" vs "1st") — these
// slipped past the first audit. Adds new 301s to data/blog-redirects.json and
// rebuilds the fresh/overlay enrichment queues so we never enrich a duplicate.
const fs = require('fs');
const fresh = JSON.parse(fs.readFileSync('data/legacy-fresh.json', 'utf8'));
const overlay = JSON.parse(fs.readFileSync('data/legacy-overlay.json', 'utf8'));
const survivors = [...fresh, ...overlay];
const rf = JSON.parse(fs.readFileSync('data/blog-redirects.json', 'utf8'));
const redirects = rf.redirects;
// slugs already rewritten in a fresh wave (have a data/blogs file) must stay canonical
const written = new Set(fs.readdirSync('data/blogs').filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')));

const ORDW = { first:'1',second:'2',third:'3',fourth:'4',fifth:'5',sixth:'6',seventh:'7',eighth:'8',ninth:'9',tenth:'10' };
const STOP = new Set('a an the of for to in on with and or class grade std standard maths math mathematics cbse icse ncert solutions solution guide guides worksheet worksheets workbook pdf printable free online test questions question answers answer chapter notes revision study studies material best top complete full step by download practice problems problem paper papers'.split(/\s+/));
function tokens(s) {
  s = String(s || '').toLowerCase().replace(/(\d{1,2})(st|nd|rd|th)\b/g, '$1'); // 2nd->2
  return [...new Set(s.replace(/[^a-z0-9]+/g, ' ').split(/\s+/)
    .map(w => ORDW[w] || w)                       // second->2
    .filter(w => w && w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)))].sort();
}
const R = { xii:12,xi:11,x:10,ix:9,viii:8,vii:7,vi:6,v:5,iv:4,iii:3,ii:2,i:1 };
function levelOf(s){s=String(s||'').toLowerCase();let m;
  if(m=s.match(/(class|grade)[ -]?(\d{1,2})\b/))return 'L'+m[2];
  if(m=s.match(/\b(\d{1,2})(st|nd|rd|th)[ -]?grade\b/))return 'L'+m[1];
  if(m=s.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)[ -]grade\b/))return 'L'+ORDW[m[1]];
  if(m=s.match(/class[ -]?(xii|xi|ix|viii|vii|vi|iv|iii|ii|x|v|i)\b/))return 'R'+R[m[1]];
  if(/\bjee\b/.test(s))return 'jee';if(/\bneet\b/.test(s))return 'neet';if(/\bcat\b/.test(s))return 'cat';if(/\bsat\b/.test(s))return 'sat';return '';}
const OPS = new Set(['addition','subtraction','multiplication','division','add','subtract','multiply','divide','adding','subtracting','multiplying','dividing']);
const opConflict=(a,b)=>{const A=a.filter(x=>OPS.has(x)),B=b.filter(x=>OPS.has(x));if(!A.length||!B.length)return false;return !A.some(x=>B.includes(x));};
const seriesMarker=s=>/(excercise|exercise|exemp|chapter|previous-year|\byear\b|year-?\d{4}|-q-?\d)/i.test(s);
const jac=(a,b)=>{const A=new Set(a),B=new Set(b);if(!A.size&&!B.size)return 1;let i=0;for(const x of A)if(B.has(x))i++;return i/(A.size+B.size-i);};

const S = survivors.map(q => ({ q, lvl: levelOf(q.title + ' ' + q.slug), w: tokens(q.title + ' ' + q.slug.replace(/-/g,' ')) }));
const par=S.map((_,i)=>i);const find=x=>par[x]===x?x:(par[x]=find(par[x]));const uni=(a,b)=>{par[find(a)]=find(b);};
for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){
  if(S[i].lvl!==S[j].lvl)continue; if(opConflict(S[i].w,S[j].w))continue;
  if(seriesMarker(S[i].q.slug)||seriesMarker(S[j].q.slug))continue;
  if(jac(S[i].w,S[j].w)>=0.6)uni(i,j);
}
const cl={};S.forEach((s,i)=>{const r=find(i);(cl[r]=cl[r]||[]).push(s);});
let added=0;const newR={};
Object.values(cl).filter(c=>c.length>1).forEach(c=>{
  // canonical: prefer an already-written fresh file, else most views
  const k=c.slice().sort((x,y)=>((written.has(y.q.slug)?1:0)-(written.has(x.q.slug)?1:0))||(y.q.views-x.q.views))[0];
  c.forEach(s=>{ if(s.q.slug===k.q.slug)return; if(written.has(s.q.slug))return; if(redirects[s.q.slug])return; redirects[s.q.slug]=k.q.slug; newR[s.q.slug]=k.q.slug; added++; });
});
fs.writeFileSync('data/blog-redirects.json', JSON.stringify({ _comment: rf._comment, redirects }, null, 2));
// rebuild queues excluding newly redirected
const stillFresh = fresh.filter(q => !redirects[q.slug]);
const stillOverlay = overlay.filter(q => !redirects[q.slug]);
fs.writeFileSync('data/legacy-fresh.json', JSON.stringify(stillFresh, null, 2));
fs.writeFileSync('data/legacy-overlay.json', JSON.stringify(stillOverlay, null, 2));
console.log('new ordinal-duplicate redirects added:', added);
Object.entries(newR).slice(0,20).forEach(([k,v])=>console.log('  '+k+' -> '+v));
console.log('total redirects now:', Object.keys(redirects).length);
console.log('fresh queue:', stillFresh.length, '| overlay queue:', stillOverlay.length);
