const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
for (const ext of ['.ts','.tsx']) require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
let allowed=false, limit={success:true}, fetched=0, rpcCalls=0;
const oldLoad=Module._load;
Module._load=function(id,parent,main){
 if(id==='@supabase/supabase-js')return {createClient:()=>({auth:{getUser:async()=>({data:{user:allowed?{id:'user'}:null},error:null})},rpc:async()=>{rpcCalls++;return {data:limit,error:null}}})};
 return oldLoad.call(this,id,parent,main);
};
process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test';process.env.GOOGLE_MAPS_API_KEY='test';
const request=(body,headers={})=>new Request('https://example.com/api',{method:'POST',body:JSON.stringify(body),headers});
(async()=>{
 const {readApiJson}=require('../lib/apiInput.ts');
 await assert.rejects(readApiJson(request({value:'x'.repeat(17000)})),e=>e.status===413);
 await assert.rejects(readApiJson(request([])),e=>e.status===400);
 const feedback=require('../app/api/feedback/route.ts').POST;
 const before=rpcCalls;
 assert.equal((await feedback(request({message:'x'.repeat(17000)}))).status,413);assert.equal(rpcCalls,before);
 for(const path of ['google-maps/resolve','google-review/setup','google-review/profile']){
  const post=require('../app/api/'+path+'/route.ts').POST;
  assert.equal((await post(request({}))).status,401);
  assert.equal((await post(request({business_id:'00000000-0000-0000-0000-000000000001',maps_url:'https://google.com/maps/place/Test',place_id:'place'}, {authorization:'Bearer invalid'}))).status,401);
 }
 const resolve=require('../app/api/google-maps/resolve/route.ts').POST;
 allowed=true;limit=null;
 global.fetch=async()=>{fetched++;throw Error('Unexpected outbound request')};
 assert.equal((await resolve(request({maps_url:'https://google.com/maps/place/Test'},{authorization:'Bearer valid'}))).status,503);
 assert.equal(fetched,0,'Missing rate-limit result must fail closed');
 const {resolveGoogleMapsUrl}=require('../lib/googleMapsResolver.ts');
 for(const url of ['http://google.com/maps/place/Test','https://google.com.evil.test/maps/place/Test','https://google.com:8443/maps/place/Test','https://user:password@google.com/maps/place/Test','https://127.0.0.1/'])await assert.rejects(resolveGoogleMapsUrl(url));
 assert.equal(fetched,0,'Invalid destinations must be rejected before fetch');
 global.fetch=async(_url,options)=>{fetched++;assert(options.signal);assert.equal(options.redirect,'manual');return new Response(null,{status:302,headers:{location:'https://127.0.0.1/'}})};
 await assert.rejects(resolveGoogleMapsUrl('https://maps.app.goo.gl/Test'),/UNSAFE_REDIRECT_DOMAIN/);
 assert.equal(fetched,1,'Unsafe redirect must never be fetched');
 console.log('PASS bounded request bodies, login checks, fail-closed limiter, resolver destination/redirect validation and timeout signals');
})().catch(e=>{console.error(e);process.exitCode=1});
