import assert from 'node:assert/strict';
import {profile,vertices,candidates,applyCandidate,outline,simple,area,contourPoints,placementFrame} from '../dist/geometry.mjs';
const patterns=['mountain','valley','trapezoid','curve'],heights=['low','normal','high'];
for(const pattern of patterns)for(const height of heights){
 const left=profile(pattern,false,height,'left'),right=profile(pattern,false,height,'right');
 assert.deepEqual(left,profile(pattern,false,height),'default keeps previous shape');
 assert.deepEqual(right,left.map(([t,h])=>[1-t,h]).reverse());
 assert.notDeepEqual(right,left);
 assert.deepEqual(profile(pattern,true,height,'left'),profile(pattern,true,height,'right'));
 assert.equal(left[0][0],0);assert.equal(right.at(-1)[0],1);
}
assert.throws(()=>profile('curve',false,'normal','invalid'));
let checked=0,chains=0;
for(const shape of ['square','triangle','hexagon']){
 const base={shape,mods:[],count:0},original=area(outline(base));
 for(let edge=0;edge<vertices(shape).length;edge++)for(const range of ['whole','first','second'])for(const pattern of patterns)for(const height of heights)for(const bias of ['left','right'])for(const method of ['keep','reflect']){
  const selection={edge,range,pattern,height,bias,method,symmetric:false};
  const cs=candidates(base,selection);
  if(height==='normal'&&range!=='whole')assert.ok(cs.some(c=>c.add.edge===edge),'same-edge half candidates remain available');
  for(const c of cs){
   const next=applyCandidate(base,selection,c.id);
   assert.ok(simple(outline(next)));assert.ok(Math.abs(area(outline(next))-original)<1e-6);
   const cut=contourPoints(shape,c.cut,c.cut.profile),add=contourPoints(shape,c.add,c.add.profile,-1);
   if(method==='keep')add.reverse();
   assert.equal(Math.sign(area(add)),(method==='keep'?1:-1)*Math.sign(area(cut)));
   const frame=placementFrame(shape,c,1);
   for(let i=0;i<cut.length;i++){
    assert.ok(Math.hypot(frame[i][0]-add[i][0],frame[i][1]-add[i][1])<1e-6);
    for(let j=0;j<cut.length;j++)assert.ok(Math.abs(Math.hypot(cut[i][0]-cut[j][0],cut[i][1]-cut[j][1])-Math.hypot(add[i][0]-add[j][0],add[i][1]-add[j][1]))<1e-6);
   }
   assert.equal(candidates(next,selection).length,0);checked++;
  }
 }
 for(let trial=0;trial<48;trial++){
  let state=base,steps=0;
  for(let step=0;step<6;step++){
   const options=[];
   for(let edge=0;edge<vertices(shape).length;edge++)for(const range of ['first','second']){
    const selection={edge,range,pattern:patterns[(trial+step)%4],height:heights[(trial+step)%3],bias:(trial+step)%2?'right':'left',symmetric:false,method:trial%2?'keep':'reflect'};
    for(const c of candidates(state,selection))options.push([selection,c]);
   }
   if(!options.length)break;
   const [selection,c]=options[(trial*7+step)%options.length],old=structuredClone(state.mods);
   state=applyCandidate(state,selection,c.id);
   assert.deepEqual(state.mods.slice(0,old.length),old);
   assert.ok(simple(outline(state)));assert.ok(Math.abs(area(outline(state))-original)<1e-6);steps++;
  }
  if(steps>=2)chains++;
 }
}
assert.ok(chains>=100);
for(const bias of ['left','right']){
 const base={shape:'triangle',mods:[],count:0},s={edge:0,range:'whole',pattern:'curve',height:'high',bias,symmetric:false,method:'keep'};
 assert.equal(candidates(base,s).length,0,'invalid high cuts remain rejected for both directions');
}
console.log(`${checked} asymmetric placements and ${chains} multi-edit chains passed for both directions.`);
