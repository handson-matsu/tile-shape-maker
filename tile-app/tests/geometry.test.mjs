import assert from 'node:assert/strict';
import {vertices,area,outline,simple,candidates,applyCandidate,segment,contourPoints,placementFrame,profile} from '../dist/geometry.mjs';
let checked=0;
for(const shape of ['square','triangle','hexagon']){
 const base={shape,mods:[],count:0},a=area(outline(base));
 for(let edge=0;edge<vertices(shape).length;edge++)for(const range of ['whole','first','second'])for(const pattern of ['mountain','valley','trapezoid','curve'])for(const symmetric of [true,false])for(const method of ['keep','reflect']){
  const s={edge,range,pattern,symmetric,method},cs=candidates(base,s);
  assert.equal(cs.length,range==='whole'?vertices(shape).length-1:2*vertices(shape).length-1);
  if(range!=='whole')assert.ok(cs.some(c=>c.add.edge===edge),'remaining half must be offered for both modes');
  for(const c of cs){const next=applyCandidate(base,s,c.id);assert.ok(simple(outline(next)));assert.ok(Math.abs(area(outline(next))-a)<1e-6);assert.ok(!candidates(next,s).length);const cut=contourPoints(shape,c.cut,c.cut.profile),add=contourPoints(shape,c.add,c.add.profile,-1);if(method==='keep')add.reverse();for(let i=1;i<cut.length;i++){assert.ok(Math.abs(Math.hypot(cut[i][0]-cut[0][0],cut[i][1]-cut[0][1])-Math.hypot(add[i][0]-add[0][0],add[i][1]-add[0][1]))<1e-6)}// Check all pair distances, orientation (front/back) and animated endpoint.
  const frame=placementFrame(shape,c,1);
  for(let i=0;i<cut.length;i++){assert.ok(Math.hypot(frame[i][0]-add[i][0],frame[i][1]-add[i][1])<1e-6);for(let j=i+1;j<cut.length;j++)assert.ok(Math.abs(Math.hypot(cut[i][0]-cut[j][0],cut[i][1]-cut[j][1])-Math.hypot(add[i][0]-add[j][0],add[i][1]-add[j][1]))<1e-6)}
  assert.equal(Math.sign(area(add)),(method==='keep'?1:-1)*Math.sign(area(cut)));
  if(method==='keep')assert.ok(Math.abs(area(placementFrame(shape,c,.5))-area(cut))<1e-6);
  checked++}
 }
 // Deterministic sequential edits must preserve connected simple polygons and area.
 for(let trial=0;trial<25;trial++){let state=base;for(let round=0;round<6;round++){const choices=[];for(let edge=0;edge<vertices(shape).length;edge++){const s={edge,range:round%2?'second':'first',pattern:['curve','valley','mountain','trapezoid'][(trial+round)%4],symmetric:trial%2===0,method:['reflect','keep'][(trial+round)%2]};for(const c of candidates(state,s))choices.push([s,c])}if(!choices.length)break;const [s,c]=choices[(trial*7+round)%choices.length];state=applyCandidate(state,s,c.id);assert.ok(simple(outline(state)));assert.ok(Math.abs(area(outline(state))-a)<1e-6);checked++}}
}
assert.throws(()=>applyCandidate({shape:'square',mods:[],count:0},{edge:0,range:'whole',pattern:'mountain',symmetric:true,method:'keep'},'0-0'));
assert.equal(simple([[0,0],[10,10],[0,10],[10,0]]),false);
console.log(`${checked} placements verified: simple connected boundaries, conserved area, congruent pieces, no reused cut slots.`);

for(const pattern of ['mountain','valley','trapezoid','curve']){
 const p=profile(pattern,false),q=profile(pattern,true);
 const max=p.reduce((a,b)=>a[1]>b[1]?a:b);
 assert.ok(max[0]<=.42);
 assert.notDeepEqual(p,q);
 if(pattern==='mountain'||pattern==='curve')assert.ok(max[0]<=.25);
}
// Regression: two individually unused source/destination intervals may still
// collide with previous edits near a vertex. The candidate must remain hidden.
const triangle={shape:'triangle',mods:[],count:0};
const first={edge:0,range:'first',pattern:'curve',symmetric:false,method:'keep'};
const modified=applyCandidate(triangle,first,'0-0.5');
const second={edge:2,range:'whole',pattern:'trapezoid',symmetric:false,method:'keep'};
assert.ok(candidates(triangle,second).some(c=>c.id==='1-0'));
assert.ok(!candidates(modified,second).some(c=>c.id==='1-0'));
assert.throws(()=>applyCandidate(modified,second,'1-0'));
assert.deepEqual(candidates(triangle,{...first,method:'translate'}),[]);
assert.deepEqual(candidates(triangle,{...first,method:'self'}),[]);
console.log('Collision regression and removed-method rejection passed.');
