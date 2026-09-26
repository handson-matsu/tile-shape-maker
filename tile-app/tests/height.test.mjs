import assert from 'node:assert/strict';
import {HEIGHTS,profile,vertices,candidates,applyCandidate,outline,simple,area,contourPoints,placementFrame} from '../dist/geometry.mjs';
const patterns=['mountain','valley','trapezoid','curve'];
for(const pattern of patterns)for(const symmetric of [true,false]) {
  const normal=profile(pattern,symmetric);
  assert.deepEqual(profile(pattern,symmetric,'normal'),normal,'normal preserves the original geometry');
  for(const [height,factor] of Object.entries(HEIGHTS)) {
    const scaled=profile(pattern,symmetric,height);
    for(let i=0;i<normal.length;i++) {
      assert.equal(scaled[i][0],normal[i][0],'height must not move the peak along the edge');
      assert.equal(scaled[i][1],normal[i][1]*factor);
    }
    assert.notDeepEqual(scaled,profile(pattern,!symmetric,height),'symmetry remains independent');
  }
}
assert.throws(()=>profile('curve',true,'invalid'));
let checked=0;
for(const shape of ['square','triangle','hexagon']) {
  const base={shape,mods:[],count:0},original=area(outline(base));
  for(const height of Object.keys(HEIGHTS))for(let edge=0;edge<vertices(shape).length;edge++)for(const range of ['whole','first','second'])for(const pattern of patterns)for(const symmetric of [true,false])for(const method of ['keep','reflect']) {
    const selection={height,edge,range,pattern,symmetric,method};
    for(const c of candidates(base,selection)) {
      const next=applyCandidate(base,selection,c.id);
      assert.ok(simple(outline(next)));
      assert.ok(Math.abs(area(outline(next))-original)<1e-6);
      const cut=contourPoints(shape,c.cut,c.cut.profile),add=contourPoints(shape,c.add,c.add.profile,-1);
      if(method==='keep')add.reverse();
      assert.ok(Math.abs(Math.abs(area(cut))-Math.abs(area(add)))<1e-6);
      const frame=placementFrame(shape,c,1);
      frame.forEach((p,i)=>assert.ok(Math.hypot(p[0]-add[i][0],p[1]-add[i][1])<1e-6));
      checked++;
    }
  }
  // Different heights in successive edits must keep earlier cuts unchanged.
  for(let trial=0;trial<24;trial++) {
    let state=base;
    for(let step=0;step<6;step++) {
      const options=[];
      for(let edge=0;edge<vertices(shape).length;edge++)for(const range of ['first','second']) {
        const s={edge,range,height:['low','normal','high'][(trial+step)%3],pattern:patterns[(trial+step)%4],symmetric:trial%2===0,method:trial%2?'keep':'reflect'};
        for(const c of candidates(state,s))options.push([s,c]);
      }
      if(!options.length)break;
      const [s,c]=options[(trial+step)%options.length],before=structuredClone(state.mods);
      state=applyCandidate(state,s,c.id);
      assert.deepEqual(state.mods.slice(0,before.length),before);
      assert.ok(simple(outline(state)));
      assert.ok(Math.abs(area(outline(state))-original)<1e-6);
      checked++;
    }
  }
}
const triangle={shape:'triangle',mods:[],count:0};
const selection={edge:0,range:'whole',pattern:'curve',symmetric:false,method:'keep',height:'normal'};
assert.ok(candidates(triangle,selection).length>0);
assert.equal(candidates(triangle,{...selection,height:'high'}).length,0,'high cuts crossing the existing tile boundary must be rejected');
assert.throws(()=>applyCandidate(triangle,{...selection,height:'high'},'1-0'));
console.log(`${checked} height-dependent placements and mixed-height edits passed; high collision candidates rejected.`);
