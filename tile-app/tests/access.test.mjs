import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Load the real app entry point with a minimal DOM and an isolated fetch spy.
// No requests are sent to the production counter by these regression tests.
class Element {
  children=[];attributes={};style={};innerHTML='';textContent='';
  classList={toggle(){}};
  append(child){this.children.push(child)}
  replaceChildren(){this.children=[]}
  setAttribute(key,value){this.attributes[key]=value}
  querySelectorAll(){return []}
  close(){} showModal(){}
}
const endpoint='https://script.google.com/macros/s/AKfycbxssCIHsD-N97SHxNC_GN0ihYeC0qy-lb-EY0KmSs6Gnztaph1sITMerLVEnNWOGkYc/exec?app=tile-shape-maker';
const options={method:'GET',mode:'no-cors',cache:'no-store',credentials:'omit',keepalive:true};
const scenarios={success:()=>Promise.resolve({type:'opaque'}),failure:()=>Promise.reject(new Error('offline')),throw:()=>{throw new Error('blocked')},pending:()=>new Promise(()=>{})};
let loads=0;
for(const [scenario,result] of Object.entries(scenarios)){
 const elements=new Map(),requests=[];
 globalThis.document={getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id)},createElement(){return new Element()}};
 globalThis.fetch=(...args)=>{requests.push(args);return result()};
 const url=new URL(`../dist/app.mjs?access-test=${scenario}`,import.meta.url);
 await import(url.href); // Must not await the request, even when it never settles.
 assert.deepEqual(requests,[[endpoint,options]]);
 assert.equal(elements.get('count').textContent,'0 回加工');
 const click=(id,text)=>{const button=elements.get(id).children.find(b=>b.innerHTML===text);assert.ok(button);button.onclick()};
 click('symmetries','非対称');click('biases','右寄り');click('heights','高い');
 elements.get('black').onclick();elements.get('preview').onclick();
 assert.equal(elements.get('biasControl').hidden,false);
 assert.equal(elements.get('biases').children.find(b=>b.innerHTML==='右寄り').attributes['aria-pressed'],'true');
 assert.equal(elements.get('status').textContent,'背景を選んで、PNG画像として保存できます。');
 await import(url.href); // The same page's module cannot log a second visit.
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(requests.length,1,'UI rerenders and duplicate module imports must not send another request');
 loads++;
}
// Also ensure the production source contains only this one access request.
const source=await readFile(new URL('../dist/app.mjs',import.meta.url),'utf8');
assert.equal(source.split(endpoint).length-1,1);
assert.equal((source.match(/\bfetch\s*\(/g)||[]).length,1);
console.log(`${loads} page loads: one exact GET each; success, rejection, synchronous failure and pending request preserve app behavior.`);
