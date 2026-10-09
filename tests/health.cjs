const fs=require('node:fs'),ts=require('typescript'),Module=require('node:module'),assert=require('node:assert/strict');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
let result={data:{ok:true},error:null},throwRpc=false,calls=0;
const oldLoad=Module._load;
Module._load=function(id,p,main){
 if(id==='@supabase/supabase-js')return {createClient:()=>({rpc:async()=>{calls++;if(throwRpc)throw Error('private-backend-message');return result;}})};
 return oldLoad.call(this,id,p,main);
};
process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test';
const {GET}=require('../app/api/health/route.ts');
(async()=>{
 let response=await GET();assert.equal(response.status,200);assert.equal((await response.json()).public_card_ok,true);
 assert.equal(response.headers.get('cache-control'),'no-store');
 for(const data of [{ok:false},{success:false},null,[],true]){
  result={data,error:null};response=await GET();const body=await response.json();
  assert.equal(body.supabase_connected,true,'A missing historical card does not mean the database is down');
  assert.equal(body.public_card_ok,false,'Unsuccessful/malformed card payload must not pass the probe');
 }
 result={data:{ok:true},error:{message:'private-backend-message'}};
 response=await GET();assert.equal(response.status,503);assert.equal((await response.json()).success,false);
 throwRpc=true;response=await GET();assert.equal(response.status,503);assert(!(await response.text()).includes('private-backend-message'));
 const before=calls;delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 response=await GET();assert.equal(response.status,503);assert.equal(calls,before);
 console.log('PASS health probe: valid/failed/malformed cards, connection independence, RPC throws/errors, missing configuration, 503 and uncached safe responses');
})().catch(e=>{console.error(e);process.exitCode=1});
