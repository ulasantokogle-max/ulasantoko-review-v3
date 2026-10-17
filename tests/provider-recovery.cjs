const fs=require('node:fs'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict');
const React=require('react'),{act,create}=require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
let failAccess=false,failList=true,failCreate=true,failReset=true,createDeferred=null,listDeferred=null,calls=[],callback;
const card={id:'card-a',card_code:'ULAS-01007',inventory_status:'ready_to_sell',operational_status:'active',activation_status:'pending',qr_url:'https://yukreview.id/a7c93e10b842',created_at:'2026-10-08T00:00:00Z'};
const supabase={auth:{getSession:async()=>({data:{session:{user:{email:'provider@example.com'}}}}),onAuthStateChange:cb=>{callback=cb;return {data:{subscription:{unsubscribe(){}}}};}},rpc:async(name,args)=>{
 calls.push({name,args});
 if(name==='v3_is_provider_admin'){if(failAccess)throw Error('offline');return {data:true,error:null};}
 if(name==='v3_provider_list_cards'){if(failList)throw Error('offline');if(listDeferred)return await new Promise(resolve=>listDeferred.resolve=resolve);return {data:[card],error:null};}
 if(name==='v3_provider_create_card'){if(failCreate)throw Error('offline');if(createDeferred)return await new Promise(resolve=>createDeferred.resolve=resolve);return {data:{success:true,card_code:card.card_code,qr_url:card.qr_url},error:null};}
 if(name==='v3_provider_reset_activation_pin'){if(failReset)throw Error('offline');return {data:{success:true,activation_pin:'123456'},error:null};}
 return {data:{success:true},error:null};
}};
global.window={confirm:()=>true,setTimeout:()=>0};
const original=Module._load;
Module._load=function(id,p,main){
 if(id.endsWith('/lib/supabase'))return {supabase};
 if(id.endsWith('/lib/i18n'))return {useLanguage:()=>({tr:id=>id})};
 if(id==='next/link')return {__esModule:true,default:props=>React.createElement('a',props,props.children)};
 if(id.includes('/components/'))return {__esModule:true,default:props=>id.endsWith('ProviderMfaGate')?props.children:null};
 return original.call(this,id,p,main);
};
const Page=require('../app/provider/cards/page.tsx').default;
(async()=>{
 let tree;await act(async()=>{tree=create(React.createElement(Page));});
 const text=()=>JSON.stringify(tree.toJSON());
 const button=name=>tree.root.findAllByType('button').find(b=>b.children.includes(name));
 assert(text().includes('Daftar kartu belum dapat dimuat'));
 failList=false;await act(async()=>button('Muat Ulang').props.onClick());
 assert(text().includes(card.card_code),'List reload must recover from a thrown error');
 const submit=()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}});
 await act(async()=>submit());
 assert.equal(button('Buat Kartu').props.disabled,false,'Thrown create errors must unlock the form');
 failCreate=false;createDeferred={};let pending;
 const before=calls.filter(c=>c.name==='v3_provider_create_card').length;
 await act(async()=>{pending=submit();void submit();});
 assert.equal(calls.filter(c=>c.name==='v3_provider_create_card').length,before+1,'Rapid submits must dispatch only one creation');
 await act(async()=>{createDeferred.resolve({data:{success:true,card_code:card.card_code,qr_url:card.qr_url},error:null});await pending;});createDeferred=null;
 assert.equal(button('Buat Kartu').props.disabled,false);
 await act(async()=>button('Reset PIN').props.onClick());
 assert.equal(button('Reset PIN').props.disabled,false,'Thrown PIN reset errors must unlock the button');
 failReset=false;await act(async()=>button('Reset PIN').props.onClick());
 assert(text().includes('123456'),'PIN reset can recover');
 listDeferred={};let oldList;
 await act(async()=>{oldList=button('Muat Ulang').props.onClick();});
 await act(async()=>callback('SIGNED_OUT',null));
 await act(async()=>{listDeferred.resolve({data:[card],error:null});await oldList;});
 assert(!text().includes(card.card_code),'A late list response must not restore inventory after logout');
 await act(async()=>tree.unmount());
 listDeferred=null;failAccess=true;
 await act(async()=>{tree=create(React.createElement(Page));});
 assert(text().includes('Akses provider belum dapat diverifikasi'));
 assert(!text().includes('tidak memiliki akses provider.'),'Network error must not be misreported as membership denial');
 failAccess=false;await act(async()=>button('Coba lagi').props.onClick());
 assert(text().includes(card.card_code),'Provider access verification can recover');
 await act(async()=>tree.unmount());
 console.log('PASS provider recovery: list/create/PIN thrown errors, duplicate creation guard, retry and stale-account response denial');
})().catch(e=>{console.error(e);process.exitCode=1});
