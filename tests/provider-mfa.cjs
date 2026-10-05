const fs = require('node:fs'), ts = require('typescript'), Module = require('node:module'), assert = require('node:assert/strict');
for (const ext of ['.ts','.tsx']) require.extensions[ext] = (m,f) => m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const React = require('react'), {act,create} = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
let session=true,member=true,level='aal1',factor=false,verifyError=false,rpcError=false,callback,verifyCalls=0,enrollCalls=0,extraFactors=[],lastFactor='',deleted=[];
let editorMounts=0;
const sessionData=()=>({user:{id:'provider-id',email:'provider@example.com'},access_token:'header.'+Buffer.from(JSON.stringify({aal:level})).toString('base64url')+'.signature'});
const supabase={auth:{getSession:async()=>({data:{session:session?{user:{email:'provider@example.com'}}:null}}),onAuthStateChange:cb=>{callback=cb;return {data:{subscription:{unsubscribe(){}}}}},signOut:async()=>{session=false;callback('SIGNED_OUT');},mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:level}}),listFactors:async()=>({data:{totp:factor?[{id:'verified',status:'verified',friendly_name:'Primary'},...extraFactors]:[],all:[]}}),enroll:async()=>{enrollCalls++;return {data:{id:'pending',totp:{qr_code:'<svg></svg>',secret:'setup-secret'}}};},unenroll:async({factorId})=>{deleted.push(factorId);return {data:{}};},challengeAndVerify:async({factorId})=>{lastFactor=factorId;verifyCalls++; if(verifyError)return {error:{message:'invalid'}};level='aal2';return {data:{}};}}},rpc:async()=>({data:member,error:rpcError?{message:'migration missing'}:null})};
const original=Module._load;
Module._load=function(id,parent,main){if(id.endsWith('/supabase'))return {supabase};if(id.endsWith('/i18n'))return {useLanguage:()=>({tr:id=>id})};if(id==='./LanguageSwitcher')return {__esModule:true,default:()=>null};return original.call(this,id,parent,main);};
const Gate=require('../app/components/ProviderMfaGate.tsx').default;
function text(node){return !node?'':typeof node==='string'?node:Array.isArray(node)?node.map(text).join(' '):text(node.children);}
function PrivateEditor(){React.useEffect(()=>{editorMounts++;},[]);return React.createElement('div',null,'PRIVATE INVENTORY');}
supabase.auth.getSession=async()=>({data:{session:session?sessionData():null}});
async function mount(allowCustomers=false){let tree;await act(async()=>{tree=create(React.createElement(Gate,{allowCustomers},React.createElement(PrivateEditor)));});return tree;}
(async()=>{
 let tree=await mount(); assert(!text(tree.toJSON()).includes('PRIVATE INVENTORY'));assert(text(tree.toJSON()).includes('Siapkan Authenticator'));
 await act(async()=>tree.root.findAllByType('button').find(b=>b.children.includes('Siapkan Authenticator')).props.onClick());assert.equal(enrollCalls,1);assert(tree.root.findByType('img').props.src.startsWith('data:image/svg+xml'));assert(text(tree.toJSON()).includes('setup-secret'));
 await act(async()=>tree.root.findByType('input').props.onChange({target:{value:'12a3456'}}));assert.equal(tree.root.findByType('input').props.value,'123456');
 verifyError=true;await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(verifyCalls,1);assert(!text(tree.toJSON()).includes('PRIVATE INVENTORY'));assert(text(tree.toJSON()).includes('Kode tidak valid'));
 verifyError=false;await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));assert(text(tree.toJSON()).includes('PRIVATE INVENTORY'));assert(!text(tree.toJSON()).includes('setup-secret'));
 const mountsBefore=editorMounts;
 for(const event of ['SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED']) {
   await act(async()=>callback(event,sessionData()));
   assert.equal(editorMounts,mountsBefore,'Same identity/AAL session event must preserve editor state');
 }
 await act(async()=>{level='aal1';factor=true;callback('TOKEN_REFRESHED',sessionData());});
 assert(!text(tree.toJSON()).includes('PRIVATE INVENTORY'),'AAL downgrade immediately blocks editor');
 await act(async()=>{level='aal1';factor=true;callback('TOKEN_REFRESHED');});assert(!text(tree.toJSON()).includes('PRIVATE INVENTORY'));assert.equal(tree.root.findAllByType('img').length,0);assert.equal(tree.root.findAllByType('input').length,1);
 await act(async()=>{member=false;callback('SIGNED_IN');});assert(text(tree.toJSON()).includes('tidak memiliki akses'));assert.equal(tree.root.findAllByType('input').length,0);
 await act(async()=>{member=true;rpcError=true;callback('TOKEN_REFRESHED');});assert(text(tree.toJSON()).includes('migrasi 0039'));assert(!text(tree.toJSON()).includes('PRIVATE INVENTORY'));
 await act(async()=>tree.unmount());
 session=true;member=true;rpcError=false;factor=true;level='aal1';
 tree=await mount(true);
 assert(!text(tree.toJSON()).includes('PRIVATE INVENTORY'),'Direct dashboard entry must block unverified providers');
 assert.equal(tree.root.findAllByType('a').length,0,'MFA screen must not link around verification');
 await act(async()=>{level='aal2';callback('MFA_CHALLENGE_VERIFIED');});
 assert(text(tree.toJSON()).includes('PRIVATE INVENTORY'));
 await act(async()=>{level='aal1';callback('SIGNED_IN');});
 assert(!text(tree.toJSON()).includes('PRIVATE INVENTORY'));
 await act(async()=>{member=false;callback('SIGNED_IN');});
 assert(text(tree.toJSON()).includes('PRIVATE INVENTORY'),'Ordinary customer dashboard does not require provider MFA');
 await act(async()=>tree.unmount());
 // Multiple verified factors can be selected without submitting the primary factor ID.
 member=true;level='aal1';factor=true;extraFactors=[{id:'backup',status:'verified',friendly_name:'Backup phone'}];
 tree=await mount();
 assert.equal(tree.root.findByType('select').props.value,'verified');
 await act(async()=>tree.root.findByType('select').props.onChange({target:{value:'backup'}}));
 await act(async()=>tree.root.findByType('input').props.onChange({target:{value:'654321'}}));
 await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.equal(lastFactor,'backup');assert(text(tree.toJSON()).includes('PRIVATE INVENTORY'));
 await act(async()=>tree.unmount());
 // Settings enroll a separate factor, reject wrong codes and never remove verified factors.
 const Settings=require('../app/components/ProviderAuthenticatorSettings.tsx').default;
 await act(async()=>{tree=create(React.createElement(Settings));});
 assert(text(tree.toJSON()).includes('Primary'));assert(text(tree.toJSON()).includes('Backup phone'));
 await act(async()=>tree.root.findByType('input').props.onChange({target:{value:'Backup device 2'}}));
 await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert(text(tree.toJSON()).includes('setup-secret'));
 await act(async()=>tree.root.findByType('input').props.onChange({target:{value:'654321'}}));
 verifyError=true;await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert(text(tree.toJSON()).includes('Verifikasi belum berhasil'));assert(text(tree.toJSON()).includes('setup-secret'));
 verifyError=false;await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.equal(lastFactor,'pending');assert(!text(tree.toJSON()).includes('setup-secret'));
 assert(text(tree.toJSON()).includes('sudah aktif'));assert.equal(deleted.length,0);
 const beforeEnroll=enrollCalls;member=false;
 await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.equal(enrollCalls,beforeEnroll,'Enrollment must fail closed if provider verification check denies');
 await act(async()=>tree.unmount());
 member=true;
 await act(async()=>{tree=create(React.createElement(Settings));});
 await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 await act(async()=>tree.root.findAllByType('button').find(b=>b.children.includes('Batalkan pengaturan')).props.onClick());
 assert.deepEqual(deleted,['pending']);assert(!text(tree.toJSON()).includes('setup-secret'));
 await act(async()=>tree.unmount());
 console.log('PASS backup authenticator selection/enrollment, verification errors, access denial, cancellation and primary preservation');
 console.log('PASS direct dashboard entry requires provider MFA; customers retain access; no dashboard escape link');
 console.log('PASS provider MFA gate: enrollment, invalid code, successful verification, session downgrade, customer denial and missing-migration failure');
})().catch(e=>{console.error(e);process.exitCode=1;});
