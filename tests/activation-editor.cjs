const fs = require('node:fs'), Module = require('node:module'), ts = require('typescript');
const assert = require('node:assert/strict');
const React = require('react');
const {act, create} = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
for (const ext of ['.ts','.tsx']) require.extensions[ext] = (m,f) => m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}
}).outputText,f);
let result = {data:{success:true,business_id:'business-b'},error:null};
let calls=[], destinations=[], routeCode='a7c93e10b842';
let signOutError=null, signOutOptions, signupArgs, authCallback;
const rows=[{business_id:'business-a',business_name:'A'},{business_id:'business-b',business_name:'B'}];
global.window={location:{origin:'https://reputasipro.ulasantoko.space',href:'https://reputasipro.ulasantoko.space/dashboard/landing-page?business_id=business-b'}};
const supabase={
  auth:{getSession:async()=>({data:{session:{user:{email:'customer@example.com'}}}}),
    onAuthStateChange:callback=>{authCallback=callback;return {data:{subscription:{unsubscribe(){}}}};},
    signOut:async options=>{signOutOptions=options;return {error:signOutError};},
    signUp:async args=>{signupArgs=args;return {data:{session:null},error:null};}},
  rpc:async(name,args)=>{
    calls.push({name,args});
    if(name==='v3_resolve_card_code') return {data:'ULAS-01007',error:null};
    if(name==='v3_get_card_activation_state') return {data:{success:true,needs_activation:true}};
    if(name==='v3_get_my_businesses') return {data:rows,error:null};
    if(name==='v3_claim_card') return result;
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
  // New-business activation uses the business ID returned by the server.
  await act(async()=>tree.root.findAllByType('button').find(b=>b.children.includes('Bisnis Baru')).props.onClick());
  result={data:{success:true,business_id:'new-business'},error:null};
  await act(async()=>submit()); assert.equal(destinations[0],'/dashboard/landing-page?business_id=new-business');
  assert.equal(tree.root.findAllByType('a').find(a=>a.children.includes('Kelola Dashboard')).props.href,'/dashboard');
  const register=()=>tree.root.findAllByType('button').find(b=>b.children.includes('Daftar dengan Email Lain')).props.onClick();
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
  assert.equal(signupArgs.email,'new@example.com');
  assert.equal(signupArgs.options.emailRedirectTo,'https://reputasipro.ulasantoko.space/activate/a7c93e10b842');
  assert(JSON.stringify(tree.toJSON()).includes('Cek email untuk konfirmasi'));
  await act(async()=>authCallback('SIGNED_IN',{user:{email:'new@example.com'}}));
  assert.equal(tree.root.findAllByType('input').find(n=>n.props.placeholder==='PIN aktivasi kartu').props.value,'');
  await act(async()=>tree.unmount());
  await act(async()=>{tree=create(React.createElement(Probe));});
  assert.equal(context.businessId,'business-b','Select activated business even when it is not the first business');
  await act(async()=>tree.unmount());
  window.location.href='https://reputasipro.ulasantoko.space/dashboard/landing-page?business_id=someone-elses-business';
  await act(async()=>{tree=create(React.createElement(Probe));});
  assert.equal(context.businessId,'business-a','URL cannot select another account business');
  await act(async()=>tree.unmount());
  console.log('PASS activation → editor: random alias, existing/new business, failed activation stays put, authorized business selection');
})().catch(error=>{console.error(error);process.exitCode=1;});
