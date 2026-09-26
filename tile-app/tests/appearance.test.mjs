import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PALETTE,paintTile,outlineColor} from '../dist/appearance.mjs';
import {outline} from '../dist/geometry.mjs';
const require=createRequire(import.meta.url);
// Use an installed canvas implementation: npm install --no-save @napi-rs/canvas
// NODE_PATH may point to a bundled runtime instead.
const {createCanvas,Path2D}=require('@napi-rs/canvas');
globalThis.Path2D=Path2D;
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
for(const bg of ['white','black'])for(const color of PALETTE){
 const canvas=createCanvas(1,1);paintTile(canvas,outline({shape:'square',mods:[]}),bg,color.value);
 assert.equal(canvas.width,1200);assert.equal(canvas.height,1200);
 const ctx=canvas.getContext('2d'),pixel=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);
 assert.deepEqual(pixel(600,600),[...rgb(color.value),255]);
 assert.deepEqual(pixel(10,10),bg==='white'?[255,255,255,255]:[0,0,0,255]);
 assert.deepEqual(pixel(61,600),[...rgb(outlineColor(bg)),255]);
 assert.deepEqual(pixel(59,600),bg==='white'?[255,255,255,255]:[0,0,0,255]);
 assert.equal(canvas.toBuffer('image/png').subarray(1,4).toString(),'PNG');
}
console.log('14 PNG color/background combinations passed: exact fill, opaque background, visible inside outline, no silhouette expansion.');
