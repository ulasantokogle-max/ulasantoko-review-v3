const fs = require('node:fs'), Module = require('node:module'), ts = require('typescript');
const assert = require('node:assert/strict');
const React = require('react');
const {act, create} = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
for (const ext of ['.ts','.tsx']) require.extensions[ext] = (m,f) => m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}
}).outputText,f);
let result = {data:{success:true,business_id:'business-b'},error:null};
let activationState={success:true,needs_activation:true}, activationStateError=null;
let calls=[], destinations=[], routeCode='a7c93e10b842';
let throwClaim=false, throwSignup=false, throwSignout=false, businessFailure=false, claimDeferred=null;
let signOutError=null, signOutOptions, signupArgs, authCallback;
const rows=[{business_id:'business-a',business_name:'A'},{business_id:'business-b',business_name:'B'}];
global.window={location:{origin:'https://yukreview.id',href:'https://yukreview.id/dashboard/landing-page?business_id=business-b'}};
const supabase={
  auth:{getSession:async()=>({data:{session:{user:{email:'customer@example.com'}}}}),
    onAuthStateChange:callback=>{authCallback=callback;return {data:{subscription:{unsubscribe(){}}}};},
    signOut:async options=>{if(throwSignout)throw Error("offline");signOutOptions=options;return {error:signOutError};},
    signUp:async args=>{if(throwSignup)throw Error("offline");signupArgs=args;return {data:{session:null},error:null};}},
  rpc:async(name,args)=>{
    calls.push({name,args});
    if(name==='v3_resolve_card_code') return {data:'ULAS-01007',error:null};
    if(name==='v3_get_card_activation_state') return {data:activationState,error:activationStateError};
    if(name==='v3_get_my_businesses') return businessFailure ? {data:null,error:{message:'offline'}} : {data:rows,error:null};
    if(name==='v3_claim_card'){if(throwClaim)throw Error('offline');if(claimDeferred)return await new Promise(resolve=>claimDeferred.resolve=resolve);return result;}
    return {data:null,error:null};
  }
};
const original=Module._load;
Module._load=function(id,parent,main){
  if(id.endsWith('/lib/supabase')||id==='./supabase') return {supabase};
  if(id==='next/navigation') return {useParams:()=>({cardCode:routeCode}),useRouter:()=>({replace:url=>destinations.push(url)})};
  if(id.endsWith('/lib/i18n')) return {useLanguage:()=>({tr:(id)=>id})};
  if(id.endsWith('/components/LanguageSwitcher')) return {__esModule:true,default:()=>null};
  return original.call(this,id,parent,main);
};
const Activate = require('../app/activate/[cardCode]/page.tsx').default;
const {useBusinessContext}=require('../lib/useBusinessContext.ts');
let context;
function Probe(){context=useBusinessContext('customer@example.com',true);return null;}
(async()=>{
  let tree;
  await act(async()=>{tree=create(React.createElement(Activate));});
  const submit=()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}});
  await act(async()=>submit());
  assert.deepEqual(destinations,['/dashboard/landing-page?business_id=business-b']);
  assert.equal(calls.find(c=>c.name==='v3_claim_card').args.p_card_code,'ULAS-01007');
  destinations=[]; result={data:{success:false,code:'INVALID_ACTIVATION_PIN'},error:null};
  await act(async()=>submit()); assert.equal(destinations.length,0);
  result={data:null,error:{message:'Denied'}};
  await act(async()=>submit()); assert.equal(destinations.length,0);
  throwClaim=true;
  await act(async()=>submit());
  assert.equal(tree.root.findAllByType('button').find(b=>b.children.includes('Aktifkan Kartu')).props.disabled,false,'Thrown claim errors must release the busy state');
  throwClaim=false;claimDeferred={};const claimsBefore=calls.filter(c=>c.name==='v3_claim_card').length;
  let pendingClaim;
  await act(async()=>{pendingClaim=submit();void submit();});
  assert.equal(calls.filter(c=>c.name==='v3_claim_card').length,claimsBefore+1,'Rapid duplicate submit must dispatch only one claim');
  await act(async()=>{claimDeferred.resolve(result);await pendingClaim;});claimDeferred=null;
  // New-business activation uses the business ID returned by the server.
  await act(async()=>tree.root.findAllByType('button').find(b=>b.children.includes('Bisnis Baru')).props.onClick());
  result={data:{success:true,business_id:'new-business'},error:null};
  await act(async()=>submit()); assert.equal(destinations[0],'/dashboard/landing-page?business_id=new-business');
  assert.equal(tree.root.findAllByType('a').find(a=>a.children.includes('Kelola Dashboard')).props.href,'/dashboard');
  const register=()=>tree.root.findAllByType('button').find(b=>b.children.includes('Daftar dengan Email Lain')).props.onClick();
  throwSignout=true;await act(async()=>register());throwSignout=false;
  assert(tree.root.findAllByType('strong').some(n=>n.children.includes('customer@example.com')));
  signOutError={message:'Failed'};
  await act(async()=>register());
  assert(tree.root.findAllByType('strong').some(n=>n.children.includes('customer@example.com')),'Failed sign-out must preserve current account');
  signOutError=null;
  await act(async()=>register());
  assert.deepEqual(signOutOptions,{scope:'local'});
  assert(!JSON.stringify(tree.toJSON()).includes('customer@example.com'));
  await act(async()=>{
    tree.root.findAllByType('input').find(n=>n.props.type==='email').props.onChange({target:{value:'new@example.com'}});
    tree.root.findAllByType('input').find(n=>n.props.type==='password').props.onChange({target:{value:'validpassword'}});
  });
  await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
  throwSignup=true;
  await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));throwSignup=false;
  assert.equal(tree.root.findAllByType('button').find(b=>b.props.type==='submit').props.disabled,false,'Thrown signup errors must release the busy state');
  await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.equal(signupArgs.email,'new@example.com');
  assert.equal(signupArgs.options.emailRedirectTo,'https://yukreview.id/activate/a7c93e10b842');
  assert(JSON.stringify(tree.toJSON()).includes('Cek email untuk konfirmasi'));
  window.location.origin='https://reputasipro.ulasantoko.space';
  await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.equal(signupArgs.options.emailRedirectTo,'https://reputasipro.ulasantoko.space/activate/a7c93e10b842','Legacy-card signups retain their own origin');
  window.location.origin='https://yukreview.id';

  await act(async()=>authCallback('SIGNED_IN',{user:{email:'new@example.com'}}));
  assert.equal(tree.root.findAllByType('input').find(n=>n.props.placeholder==='PIN aktivasi kartu').props.value,'');
  await act(async()=>tree.unmount());
  await act(async()=>{tree=create(React.createElement(Probe));});
  assert.equal(context.businessId,'business-b','Select activated business even when it is not the first business');
  await act(async()=>tree.unmount());
  window.location.href='https://yukreview.id/dashboard/landing-page?business_id=someone-elses-business';
  await act(async()=>{tree=create(React.createElement(Probe));});
  assert.equal(context.businessId,'business-a','URL cannot select another account business');
  await act(async()=>tree.unmount());
  businessFailure=true;
  await act(async()=>{tree=create(React.createElement(Activate));});
  const beforeFailedLoad=calls.filter(c=>c.name==='v3_claim_card').length;
  await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.equal(calls.filter(c=>c.name==='v3_claim_card').length,beforeFailedLoad,'Failed business list must never fall back to creating a business');
  assert.equal(tree.root.findByType('fieldset').props.disabled,true);
  businessFailure=false;
  await act(async()=>tree.root.findAllByType('button').find(b=>b.children.includes('Coba lagi')).props.onClick());
  assert.equal(tree.root.findByType('fieldset').props.disabled,false);
  assert.equal(tree.root.findAllByType('select')[0].props.value,'business-a','Retry restores existing business selection');
  await act(async()=>tree.unmount());
  activationState={success:false};
  await act(async()=>{tree=create(React.createElement(Activate));});
  assert.equal(tree.root.findAllByType('form').length,0,'Unknown card must not expose signup/claim form');
  assert(JSON.stringify(tree.toJSON()).includes('Kartu belum tersedia'));
  activationState={success:true,needs_activation:false};
  await act(async()=>tree.root.findAllByType('button').find(b=>b.children.includes('Coba lagi')).props.onClick());
  assert(JSON.stringify(tree.toJSON()).includes('Kartu sudah aktif'));
  await act(async()=>tree.unmount());
  activationState=null;activationStateError={message:'offline'};
  await act(async()=>{tree=create(React.createElement(Activate));});
  assert.equal(tree.root.findAllByType('form').length,0,'Unavailable database must fail closed');
  await act(async()=>tree.unmount());
  console.log('PASS activation → editor: random alias, existing/new business, failed activation stays put, authorized business selection');
})().catch(error=>{console.error(error);process.exitCode=1;});
