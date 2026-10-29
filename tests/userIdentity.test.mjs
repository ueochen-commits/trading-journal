import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=(await readFile(new URL('../components/UserContext.tsx',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
let mod=0;
async function setup(){
 let slots=[],refs=[],stateCursor=0,refCursor=0,mounted=false,effects=[],listener;
 const pending=[];
 const fixture={React:{createElement:(type,props)=>({type,props})},createContext:()=>({Provider:'provider'}),useContext:()=>{},useState:initial=>{const i=stateCursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef:initial=>{const i=refCursor++;return refs[i]??(refs[i]={current:initial});},useEffect:cb=>{if(!mounted)effects.push(cb);},supabase:{auth:{onAuthStateChange:cb=>{listener=cb;return {data:{subscription:{unsubscribe(){}}}}}},from:name=>{let id;const q={select(){return q},eq(key,value){if(key==='id'||key==='user_id')id=value;return q;},maybeSingle(){return q;},then(resolve,reject){return new Promise(done=>pending.push({name,id,done})).then(resolve,reject)}};return q;}}};
 globalThis.__identityFixture=fixture;globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
 const text=`const {React,createContext,useContext,useState,useEffect,useRef,supabase}=globalThis.__identityFixture;${source}`;
 const output=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
 const {UserProvider}=await import(`data:text/javascript;base64,${Buffer.from(output+`\n// ${mod++}`).toString('base64')}`);
 const render=()=>{stateCursor=0;refCursor=0;return UserProvider({children:null}).props.value};
 render();const cleanups=effects.map(cb=>cb());mounted=true;
 const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
 const event=async(id,type='SIGNED_IN')=>{listener(type,id?{user:{id,email:`${id}@example.invalid`,user_metadata:{username:id}}}:null);await tick();};
 const finish=(id,name,data)=>{const item=pending.find(p=>p.id===id&&p.name===name);assert.ok(item,`${id} ${name} request exists`);pending.splice(pending.indexOf(item),1);item.done({data,error:null});};
 return {render,event,finish,tick,cleanup:()=>cleanups.forEach(cb=>cb?.())};
}
test('switching identity discards previous subscription/profile/stat replies and resets preferences',async()=>{
 const f=await setup();try{
 await f.event('alice');await f.event('bob');
 f.finish('alice','profiles',{onboarding_completed:true,currency:'EUR',timezone:'Europe/London'});
 f.finish('alice','billing_entitlements',[{plan:'elite'}]);await f.tick();
 assert.equal(f.render().user.id,'bob');assert.equal(f.render().user.tier,'free');assert.equal(f.render().userCurrency,'USD');
 f.finish('bob','profiles',{onboarding_completed:true,currency:'USD',timezone:'UTC'});
 f.finish('bob','billing_entitlements',[]);await f.tick();
 assert.equal(f.render().onboardingCompleted,true);
 await f.event(null,'SIGNED_OUT');assert.equal(f.render().user.id,undefined);assert.equal(f.render().onboardingCompleted,null);
 }finally{f.cleanup();}
});
test('token refresh does not reopen onboarding or replace freshly saved preferences',async()=>{
 const f=await setup();try{
 await f.event('alice');f.finish('alice','profiles',{onboarding_completed:false,currency:'USD',timezone:'UTC'});f.finish('alice','billing_entitlements',[]);await f.tick();
 f.render().markOnboardingComplete();f.render().updateUserPreferences('EUR','Europe/Paris');
 await f.event('alice','TOKEN_REFRESHED');assert.equal(f.render().onboardingCompleted,true);assert.equal(f.render().userCurrency,'EUR');assert.equal(f.render().userTimezone,'Europe/Paris');
 }finally{f.cleanup();}
});
