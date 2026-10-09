const fs=require('node:fs'),ts=require('typescript'),Module=require('node:module'),assert=require('node:assert/strict');
for(const ext of ['.ts','.tsx']) require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const React=require('react'),{act,create}=require('react-test-renderer');global.IS_REACT_ACT_ENVIRONMENT=true;
let mode='success',writes=[],copied='',language='id';
class Reader { async write(message,options){writes.push({message,options});if(mode==='fail')throw new Error('NotAllowedError');if(mode==='pending')await new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('AbortError')),{once:true}));} }
global.window={isSecureContext:true,NDEFReader:Reader};Object.defineProperty(global,'navigator',{value:{clipboard:{writeText:async value=>{copied=value;}}},configurable:true});
const original=Module._load;Module._load=function(id,p,m){if(id.endsWith('/i18n'))return {useLanguage:()=>({tr:(id,en)=>language==='en'?en:id})};return original.call(this,id,p,m);};
const Component=require('../app/components/WriteCardNfc.tsx').default;
const url='https://yukreview.id/a7c93e10b842';
function text(n){return !n?'':typeof n==='string'?n:Array.isArray(n)?n.map(text).join(' '):text(n.children);}
async function mount(props={}){let tree;await act(async()=>{tree=create(React.createElement(Component,{cardCode:'ULAS-01007',url,...props}));});return tree;}
(async()=>{
 let tree=await mount();assert.equal(writes.length,0,'Mount must not write');
 await act(async()=>tree.root.findByType('button').props.onClick());
 assert.deepEqual(writes[0].message,{records:[{recordType:'url',data:url}]});assert.equal(writes[0].options.overwrite,true);assert(text(tree.toJSON()).includes('URL berhasil ditulis'));
 await act(async()=>tree.unmount());
 mode='fail';tree=await mount();await act(async()=>tree.root.findByType('button').props.onClick());assert(text(tree.toJSON()).includes('belum berhasil'));assert(!text(tree.toJSON()).includes('URL berhasil ditulis'));await act(async()=>tree.unmount());
 delete window.NDEFReader;tree=await mount();await act(async()=>tree.root.findByType('button').props.onClick());assert(text(tree.toJSON()).includes('Chrome Android'));await act(async()=>tree.root.findAllByType('button').find(b=>b.children.includes('Salin URL NFC')).props.onClick());assert.equal(copied,url);await act(async()=>tree.unmount());
 window.NDEFReader=Reader;mode='pending';tree=await mount();let pending;
 await act(async()=>{pending=tree.root.findByType('button').props.onClick();});assert(text(tree.toJSON()).includes('Menunggu'));const before=writes.length;
 await act(async()=>tree.root.findAllByType('button')[0].props.onClick());assert.equal(writes.length,before,'Duplicate operation must be rejected');
 await act(async()=>{tree.root.findAllByType('button').find(b=>b.children.includes('Batalkan')).props.onClick();await pending;});assert(text(tree.toJSON()).includes('dibatalkan'));await act(async()=>tree.unmount());
 tree=await mount();await act(async()=>{pending=tree.root.findByType('button').props.onClick();});const current=writes.at(-1);await act(async()=>{tree.unmount();});await pending;assert.equal(current.options.signal.aborted,true);
 mode='success';tree=await mount({enabled:false});const count=writes.length;assert.equal(tree.root.findByType('button').props.disabled,true);await act(async()=>tree.root.findByType('button').props.onClick());assert.equal(writes.length,count);await act(async()=>tree.unmount());
 language='en';tree=await mount({url:'javascript:alert(1)'});assert.equal(tree.root.findByType('button').children.join(''),'Write NFC');await act(async()=>tree.root.findByType('button').props.onClick());assert.equal(writes.length,count);assert(text(tree.toJSON()).includes('writing failed'));await act(async()=>tree.unmount());
 console.log('PASS NFC user-triggered exact URL records, confirmed success, failures, unsupported fallback, cancellation/unmount, duplicate/disabled guard and invalid URL');
})().catch(e=>{console.error(e);process.exitCode=1;});
