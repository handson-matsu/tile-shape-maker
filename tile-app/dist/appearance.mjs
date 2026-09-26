import {path} from './geometry.mjs';
export const PALETTE=[
  {name:'白',value:'#ffffff'}, {name:'水色',value:'#85d5f5'},
  {name:'緑',value:'#65cdb6'}, {name:'黄色',value:'#f5d65d'},
  {name:'オレンジ',value:'#f6a357'}, {name:'ピンク',value:'#f09dbe'},
  {name:'紫',value:'#b39ae3'}
];
export const outlineColor=background=>background==='black'?'#d9eeee':'#36545b';
export function paintTile(canvas,points,background,tileColor) {
  canvas.width=canvas.height=1200;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=background==='black'?'#000000':'#ffffff';
  ctx.fillRect(0,0,1200,1200);
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const scale=1080/Math.max(maxX-minX,maxY-minY),tilePath=new Path2D(path(points));
  ctx.save();ctx.translate(600,600);ctx.scale(scale,scale);
  ctx.translate(-(minX+maxX)/2,-(minY+maxY)/2);
  ctx.fillStyle=tileColor;ctx.fill(tilePath);
  // Draw the outline inside the tile so even white-on-white stays visible
  // without enlarging the exported silhouette or colouring the background.
  ctx.save();ctx.clip(tilePath);ctx.strokeStyle=outlineColor(background);
  ctx.lineWidth=4/scale;ctx.lineJoin='round';ctx.stroke(tilePath);ctx.restore();ctx.restore();
}
