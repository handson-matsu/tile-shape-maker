// Screen coordinates: clockwise polygons have their interior to the left normal (-dy, dx).
export const SHAPES = { square: '正方形', triangle: '正三角形', hexagon: '正六角形' };
export function vertices(shape) {
  if(shape==='square') return [[-125,-125],[125,-125],[125,125],[-125,125]];
  const n=shape==='triangle'?3:6, r=shape==='triangle'?172:155;
  return Array.from({length:n},(_,i)=>[r*Math.cos(-Math.PI/2+2*Math.PI*i/n),r*Math.sin(-Math.PI/2+2*Math.PI*i/n)]);
}
export const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
export const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0]},0)/2;
function baseProfile(pattern,symmetric=true) {
  const peak=symmetric?.5:.2;
  if(pattern==='mountain') return [[0,0],[peak,1],[1,0]];
  if(pattern==='valley') return [[0,0],[symmetric?.25:.16,1],[symmetric?.5:.4,symmetric?.28:.12],[symmetric?.75:.76,symmetric?1:.45],[1,0]];
  if(pattern==='trapezoid') return [[0,0],[symmetric?.25:.12,1],[symmetric?.75:.42,1],[1,0]];
  return Array.from({length:33},(_,i)=>{const t=i/32;return [t,symmetric?Math.sin(Math.PI*t):(256/27)*t*(1-t)**3]});
}
// Scale only perpendicular depth; symmetry and positions along the edge stay independent.
export const HEIGHTS={low:.5,normal:1,high:1.6};
export function profile(pattern,symmetric=true,height='normal',bias='left') {
  if(!Object.hasOwn(HEIGHTS,height)) throw new Error('Invalid height');
  if(!['left','right'].includes(bias)) throw new Error('Invalid bias');
  const points=baseProfile(pattern,symmetric).map(([t,h])=>[t,h*HEIGHTS[height]]);
  // Mirror along the selected edge; keep endpoints ordered for contour assembly.
  return !symmetric&&bias==='right'?points.map(([t,h])=>[1-t,h]).reverse():points;
}
export function segment(shape,edge,start=0,end=1){const v=vertices(shape);return [mix(v[edge],v[(edge+1)%v.length],start),mix(v[edge],v[(edge+1)%v.length],end)]}
export function contourPoints(shape,seg,prof,sign=1){const [a,b]=segment(shape,seg.edge,seg.start,seg.end), dx=b[0]-a[0],dy=b[1]-a[1];return prof.map(([t,h])=>[a[0]+dx*t-dy*h*.19*sign,a[1]+dy*t+dx*h*.19*sign])}
export function outline(state,extra=[]){const all=[...state.mods,...extra], v=vertices(state.shape),out=[];for(let edge=0;edge<v.length;edge++){out.push(v[edge]);for(const m of all.filter(m=>m.edge===edge).sort((a,b)=>a.start-b.start)){out.push(...contourPoints(state.shape,m,m.profile,m.sign))}}return out.filter((p,i)=>!i||Math.hypot(p[0]-out[i-1][0],p[1]-out[i-1][1])>1e-7).filter((p,i,a)=>i!==a.length-1||Math.hypot(p[0]-a[0][0],p[1]-a[0][1])>1e-7)}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function on(a,b,p){return Math.abs(cross(a,b,p))<1e-7&&p[0]>=Math.min(a[0],b[0])-1e-7&&p[0]<=Math.max(a[0],b[0])+1e-7&&p[1]>=Math.min(a[1],b[1])-1e-7&&p[1]<=Math.max(a[1],b[1])+1e-7}
function intersects(a,b,c,d){const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);return (ab1*ab2<0&&cd1*cd2<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b)}
export function simple(p){if(p.length<3||area(p)<=1e-6)return false;for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){if(j===i+1||(i===0&&j===p.length-1))continue;if(intersects(p[i],p[(i+1)%p.length],p[j],p[(j+1)%p.length]))return false}return true}
export const free=(state,s)=>!state.mods.some(m=>m.edge===s.edge&&Math.min(m.end,s.end)-Math.max(m.start,s.start)>1e-7);
export function sourceFor(edge,range){return {edge,start:range==='second'?.5:0,end:range==='first'?.5:1}}
export function candidates(state,selection,method=selection.method) {
  if(selection.edge===null || !['keep','reflect'].includes(method)) return [];
  const src=sourceFor(selection.edge,selection.range);
  if(!free(state,src)) return [];
  const prof=profile(selection.pattern,selection.symmetric,selection.height,selection.bias);
  const cut={...src,profile:prof,sign:1}, half=src.end-src.start===.5;
  // Validate the cut before adding anything: a high cut can cross another
  // boundary, and an addition must not hide that invalid intermediate cut.
  if(!simple(outline(state,[cut]))) return [];
  const result=[], originalArea=area(outline(state));
  for(let edge=0;edge<vertices(state.shape).length;edge++) {
    for(const start of half?[0,.5]:[0]) {
      const dest={edge,start,end:start+(half?.5:1)};
      // Only unused, equal-length attachment intervals are eligible, including
      // the remaining half of the source edge. Never attach to the removed base.
      if(!free(state,dest) || (edge===src.edge && Math.min(dest.end,src.end)-Math.max(dest.start,src.start)>1e-7)) continue;
      // Keep: map source tangent to reversed destination tangent (a rotation).
      // Reflect: map tangents in the same direction and reverse the normal.
      // Both transformations place the congruent piece outside its target edge.
      const dp=method==='keep'?prof.map(([t,h])=>[1-t,h]).reverse():prof;
      const add={...dest,profile:dp,sign:-1};
      const polygon=outline(state,[cut,add]);
      // Preserve the original collision/connectivity safeguards. A simple
      // closed boundary plus area conservation rejects crossings, contact-only
      // joins, overlapping pieces and disconnected or pinched tile regions.
      if(simple(polygon) && Math.abs(area(polygon)-originalArea)<.001)
        result.push({id:`${edge}-${start}`,cut,add,polygon,method});
    }
  }
  return result;
}
// Rigid rotation for 'keep'; visible flip followed by rotation for 'reflect'.
export function placementFrame(shape,candidate,progress) {
  const [a,b]=segment(shape,candidate.cut.edge,candidate.cut.start,candidate.cut.end);
  const [c,d]=segment(shape,candidate.add.edge,candidate.add.start,candidate.add.end);
  const keep=candidate.method==='keep', target=keep?d:c, other=keep?c:d;
  const initial=Math.atan2(b[1]-a[1],b[0]-a[0]);
  const final=Math.atan2(other[1]-target[1],other[0]-target[0]);
  const delta=Math.atan2(Math.sin(final-initial),Math.cos(final-initial));
  const t=Math.max(0,Math.min(1,progress)), angle=initial+delta*t;
  const anchor=mix(a,target,t), length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const normalScale=keep?1:Math.cos(Math.PI*t);
  return candidate.cut.profile.map(([u,h])=>{
    const x=u*length,y=h*length*.19*normalScale;
    return [anchor[0]+Math.cos(angle)*x-Math.sin(angle)*y,anchor[1]+Math.sin(angle)*x+Math.cos(angle)*y];
  });
}
export function applyCandidate(state,selection,id){const c=candidates(state,selection).find(c=>c.id===id);if(!c)throw new Error('この配置は選べません');return {shape:state.shape,mods:[...state.mods,c.cut,c.add],count:state.count+1}}
export const path=p=>'M'+p.map(x=>x.map(n=>+n.toFixed(3)).join(',')).join('L')+'Z';
