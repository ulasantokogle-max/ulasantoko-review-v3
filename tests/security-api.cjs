const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
for (const ext of ['.ts','.tsx']) require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
let businessRows=[{business_id:'00000000-0000-0000-0000-000000000001'}], cached=null, cacheError=null, clients=[];
let termState={success:true,enabled:false}, termError=null;
let allowed=false, limit={success:true}, quota={success:true}, fetched=0, rpcCalls=0;
const oldLoad=Module._load;
Module._load=function(id,parent,main){
 if(id==='@supabase/supabase-js')return {createClient:(url,key,options)=>{clients.push({url,key,options});return {from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:cached,error:cacheError})})})})}),auth:{getUser:async()=>({data:{user:allowed?{id:'user'}:null},error:null})},rpc:async(name)=>{rpcCalls++;return {data:name==='v3_get_business_term'?termState:name==='v3_get_my_businesses'?businessRows:name==='v3_reserve_google_request'?quota:limit,error:name==='v3_get_business_term'?termError:null}}};}};
 return oldLoad.call(this,id,parent,main);
};
process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test';process.env.SUPABASE_SECRET_KEY='server-test-key';process.env.GOOGLE_MAPS_API_KEY='test';
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
 limit={success:true}; let placesFetched=0;
 global.fetch=async(url)=>{
   if(String(url).includes('places.googleapis.com')){placesFetched++;return Response.json({places:[{id:'ChIJ_test',displayName:{text:'Test'}}]});}
   return new Response('',{status:200});
 };
 for(const value of [null,{success:false}]) {
   quota=value;
   for(const path of ['google-maps/resolve','google-review/setup']) {
     const post=require('../app/api/'+path+'/route.ts').POST;
     const response=await post(request({business_id:'00000000-0000-0000-0000-000000000001',maps_url:'https://google.com/maps/place/Test'},{authorization:'Bearer valid'}));
     assert.equal(response.status,503);
     const body=await response.json();
     assert.equal(body.code,'GOOGLE_TEMPORARILY_UNAVAILABLE');
     assert.equal(body.message,'Pengaturan Google Maps sementara belum tersedia. Silakan coba lagi nanti.');
   }
 }
 assert.equal(placesFetched,0,'Quota exhausted/missing must block before Google Places dispatch');
 quota={success:true};
 assert.equal((await resolve(request({maps_url:'https://google.com/maps/place/Test'},{authorization:'Bearer valid'}))).status,200);
 assert.equal(placesFetched,1);
 const setup=require('../app/api/google-review/setup/route.ts').POST;
 const setupBody={business_id:'00000000-0000-0000-0000-000000000001',maps_url:'https://google.com/maps/place/Test'};
 const authHeaders={authorization:'Bearer valid'};
 let outboundBefore=fetched, beforePlaces=placesFetched, beforeRpc=rpcCalls;
 businessRows=[];
 for (const post of [resolve,setup]) assert.equal((await post(request(setupBody,authHeaders))).status,403);
 assert.equal(placesFetched,beforePlaces);assert.equal(fetched,outboundBefore);
 businessRows=[{business_id:'someone-else'}];
 assert.equal((await setup(request(setupBody,authHeaders))).status,403);
 businessRows=[{business_id:setupBody.business_id}];
 cached={maps_url:setupBody.maps_url,place_id:'ChIJ_cached',business_name:'Saved'};
 quota={success:false};
 const cachedResponse=await setup(request(setupBody,authHeaders));
 assert.equal(cachedResponse.status,200);assert.equal((await cachedResponse.json()).place_id,'ChIJ_cached');
 assert.equal(placesFetched,beforePlaces,'Unchanged saved link must not call Google, even with exhausted quota');
 cached=null;quota={success:true};
 delete process.env.SUPABASE_SECRET_KEY;
 assert.equal((await resolve(request(setupBody,authHeaders))).status,503);
 assert.equal(placesFetched,beforePlaces,'Missing server key must fail before Google dispatch');
 process.env.SUPABASE_SECRET_KEY='server-test-key';
 clients=[];
 assert.equal((await setup(request(setupBody,authHeaders))).status,200);
 const serverClient=clients.find(c=>c.key==='server-test-key');
 assert(serverClient);assert(!serverClient.options.global,'Quota client must never inherit customer JWT');
 assert.equal(serverClient.options.auth.persistSession,false);
 cacheError={message:'offline'};
 assert.equal((await setup(request(setupBody,authHeaders))).status,503);
 assert.equal(placesFetched,beforePlaces+1);
 termState={success:true,enabled:true,days_remaining:-1};
 const beforeExpired=placesFetched;
 assert.equal((await setup(request(setupBody,authHeaders))).status,403);
 assert.equal((await resolve(request(setupBody,authHeaders))).status,403);
 assert.equal(placesFetched,beforeExpired,'Expired customer must not reserve quota or call Google');
 termState={success:true,enabled:false};
 termError={code:'PGRST202',message:'RPC missing'};
 for(const post of [setup,resolve]) assert.equal((await post(request(setupBody,authHeaders))).status,403);
 assert.equal(placesFetched,beforeExpired,'Missing term RPC must not call Google');
 console.log('PASS Google access: unactivated/cross-business denied before fetch; unchanged profile reuses saved result; server-only quota key and cache/network failure closed');
 console.log('PASS Google quota: both API routes fail closed with generic customer message; allowed reservation dispatches once');
 console.log('PASS bounded request bodies, login checks, fail-closed limiter, resolver destination/redirect validation and timeout signals');
})().catch(e=>{console.error(e);process.exitCode=1});
