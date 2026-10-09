const fs=require('node:fs'),ts=require('typescript'),Module=require('node:module'),assert=require('node:assert/strict');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const React=require('react'),{act,create}=require('react-test-renderer');global.IS_REACT_ACT_ENVIRONMENT=true;
const storage=new Map();global.window={localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}};global.document={cookie:''};
let language='id';const original=Module._load;Module._load=function(id,p,m){if(id.endsWith('/i18n'))return {useLanguage:()=>({tr:(id,en)=>language==='en'?en:id})};return original.call(this,id,p,m);};
const {DashboardThemeShell,DashboardThemePicker,validDashboardTheme}=require('../app/dashboard/DashboardTheme.tsx');
async function mount(initialTheme){let tree;await act(async()=>{tree=create(React.createElement(DashboardThemeShell,{initialTheme},React.createElement(DashboardThemePicker)));});return tree;}
function selected(tree){return tree.root.findByProps({className:'dashboard-shell'}).props['data-dashboard-theme'];}
(async()=>{
 storage.set('reputasipro-dashboard-theme','ocean');let tree=await mount('smoothie');assert.equal(selected(tree),'smoothie','Server preference overrides stale storage');
 assert.equal(storage.get('reputasipro-dashboard-theme'),'smoothie');
 for(const choice of ['modern','ocean','smoothie']){
  await act(async()=>tree.root.findByType('select').props.onChange({target:{value:choice}}));assert.equal(selected(tree),choice);assert(document.cookie.startsWith('reputasipro-dashboard-theme='+choice+';'));assert.equal(storage.get('reputasipro-dashboard-theme'),choice);
 }
 await act(async()=>tree.unmount());tree=await mount('smoothie');assert.equal(selected(tree),'smoothie');await act(async()=>tree.unmount());
 window.localStorage={getItem(){throw new Error('disabled');},setItem(){throw new Error('disabled');}};language='en';tree=await mount('ocean');
 assert.equal(selected(tree),'ocean');assert.equal(tree.root.findByType('label').findByType('span').children.join(''),'Dashboard Theme');
 await act(async()=>tree.root.findByType('select').props.onChange({target:{value:'smoothie'}}));assert.equal(selected(tree),'smoothie');assert(document.cookie.startsWith('reputasipro-dashboard-theme=smoothie;'));
 await act(async()=>tree.root.findByType('select').props.onChange({target:{value:'untrusted'}}));assert.equal(selected(tree),'modern');assert.equal(validDashboardTheme(undefined),'modern');
 await act(async()=>tree.unmount());console.log('PASS dashboard theme switching, persisted reload, cookie precedence, blocked storage fallback, ID/EN and invalid value handling');
})().catch(e=>{console.error(e);process.exitCode=1;});
