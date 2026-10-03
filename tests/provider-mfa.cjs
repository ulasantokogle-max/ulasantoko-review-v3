const fs = require('node:fs'), ts = require('typescript'), Module = require('node:module'), assert = require('node:assert/strict');
for (const ext of ['.ts','.tsx']) require.extensions[ext] = (m,f) => m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const React = require('react'), {act,create} = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
let session=true,member=true,level='aal1',factor=false,verifyError=false,rpcError=false,callback,verifyCalls=0,enrollCalls=0;
const supabase={auth:{getSession:async()=>({data:{session:session?{user:{email:'provider@example.com'}}:null}}),onAuthStateChange:cb=>{callback=cb;return {data:{subscription:{unsubscribe(){}}}}},signOut:async()=>{session=false;callback('SIGNED_OUT');},mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:level}}),listFactors:async()=>({data:{totp:factor?[{id:'verified',status:'verified'}]:[],all:[]}}),enroll:async()=>{enrollCalls++;return {data:{id:'pending',totp:{qr_code:'<svg></svg>',secret:'setup-secret'}}};},challengeAndVerify:async()=>{verifyCalls++; if(verifyError)return {error:{message:'invalid'}};level='aal2';return {data:{}};}}},rpc:async()=>({data:member,error:rpcError?{message:'migration missing'}:null})};
const original=Module._load;
Module._load=function(id,parent,main){if(id.endsWith('/supabase'))return {supabase};if(id.endsWith('/i18n'))return {useLanguage:()=>({tr:id=>id})};if(id==='./LanguageSwitcher')return {__esModule:true,default:()=>null};return original.call(this,id,parent,main);};
const Gate=require('../app/components/ProviderMfaGate.tsx').default;
function text(node){return !node?'':typeof node==='string'?node:Array.isArray(node)?node.map(text).join(' '):text(node.children);}
async function mount(){let tree;await act(async()=>{tree=create(React.createElement(Gate,null,React.createElement('div',null,'PRIVATE INVENTORY')));});return tree;}
(async()=>{
 let tree=await mount(); assert(!text(tree.toJSON()).includes('PRIVATE INVENTORY'));assert(text(tree.toJSON()).includes('Siapkan Authenticator'));
 await act(async()=>tree.root.findAllByType('button').find(b=>b.children.includes('Siapkan Authenticator')).props.onClick());assert.equal(enrollCalls,1);assert(tree.root.findByType('img').props.src.startsWith('data:image/svg+xml'));assert(text(tree.toJSON()).includes('setup-secret'));
 await act(async()=>tree.root.findByType('input').props.onChange({target:{value:'12a3456'}}));assert.equal(tree.root.findByType('input').props.value,'123456');
 verifyError=true;await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(verifyCalls,1);assert(!text(tree.toJSON()).includes('PRIVATE INVENTORY'));assert(text(tree.toJSON()).includes('Kode tidak valid'));
 verifyError=false;await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert(text(tree.toJSON()).includes('PRIVATE INVENTORY'));assert(!text(tree.toJSON()).includes('setup-secret'));
 await act(async()=>{level='aal1';factor=true;callback('TOKEN_REFRESHED');});assert(!text(tree.toJSON()).includes('PRIVATE INVENTORY'));assert.equal(tree.root.findAllByType('img').length,0);assert.equal(tree.root.findAllByType('input').length,1);
 await act(async()=>{member=false;callback('SIGNED_IN');});assert(text(tree.toJSON()).includes('tidak memiliki akses'));assert.equal(tree.root.findAllByType('input').length,0);
 await act(async()=>{member=true;rpcError=true;callback('TOKEN_REFRESHED');});assert(text(tree.toJSON()).includes('migrasi 0039'));assert(!text(tree.toJSON()).includes('PRIVATE INVENTORY'));
 await act(async()=>tree.unmount());
 console.log('PASS provider MFA gate: enrollment, invalid code, successful verification, session downgrade, customer denial and missing-migration failure');
})().catch(e=>{console.error(e);process.exitCode=1;});
