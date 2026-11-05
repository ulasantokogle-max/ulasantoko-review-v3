const fs=require('node:fs'),ts=require('typescript'),Module=require('node:module'),assert=require('node:assert/strict');
const React=require('react'),{act,create}=require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
for(const ext of ['.ts','.tsx']) require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
global.window={setInterval:()=>1,clearInterval(){}};global.document={visibilityState:'visible'};
let data,lang='id';const old=Module._load;
Module._load=function(id,parent,main){
 if(id.endsWith('/lib/supabase'))return {supabase:{rpc:async()=>({data,error:null})}};
 if(id.endsWith('/lib/i18n'))return {useLanguage:()=>({tr:(a,b)=>lang==='en'?(b||a):a})};
 return old.call(this,id,parent,main);
};
const Panel=require('../app/components/GoogleQuotaPanel.tsx').default;
function text(node){return node==null?'':typeof node==='string'?node:Array.isArray(node)?node.map(text).join(' '):text(node.children);}
(async()=>{
 for(const [daily,monthly,label] of [[1,1,'Pemakaian normal'],[112,4000,'Peringatan kuota'],[126,4500,'Mendekati batas'],[140,5000,'Batas tercapai']]){
  data={success:true,daily_used:daily,daily_limit:140,monthly_used:monthly,monthly_reference:5000,blocked:daily===140,tracking_since:'2026-10-04'};
  let tree;await act(async()=>{tree=create(React.createElement(Panel));});
  const html=text(tree.toJSON());assert(html.includes(label));
  assert.equal(tree.root.findAllByType('progress').length,2);
  if(daily===140)assert(html.includes('dihentikan sampai pergantian hari WIB'));
  await act(async()=>tree.unmount());
 }
 data={success:true};let tree;await act(async()=>{tree=create(React.createElement(Panel));});
 assert(text(tree.toJSON()).includes('Pemantauan belum tersedia'));await act(async()=>tree.unmount());
 lang='en';data={success:true,daily_used:112,daily_limit:140,monthly_used:4000,monthly_reference:5000,blocked:false};
 await act(async()=>{tree=create(React.createElement(Panel));});assert(text(tree.toJSON()).includes('Usage warning'));await act(async()=>tree.unmount());
 console.log('PASS provider quota panel: daily/monthly 80/90/100 alerts, exhausted notice, malformed data and ID/EN');
})().catch(error=>{console.error(error);process.exitCode=1});
