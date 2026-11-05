const fs=require('node:fs'),Module=require('node:module'),ts=require('typescript'),assert=require('node:assert/strict');
const React=require('react'),{act,create}=require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT=true;
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
const oldLoad=Module._load;let lang='id';
Module._load=function(id,p,main){if(id.endsWith('/lib/i18n'))return {useLanguage:()=>({tr:(id,en)=>lang==='en'?(en||id):id})};return oldLoad.call(this,id,p,main);};
const Flow=require('../app/[cardCode]/RatingFlow.tsx').default;
let requests=[],redirects=0,mode='success';
global.window={location:{assign(){redirects++;}},sessionStorage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}};
global.fetch=async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});if(mode==='network')throw Error('offline');return Response.json(mode==='failure'?{success:false,code:'FEEDBACK_RATE_LIMITED'}:{success:true},{status:mode==='failure'?429:200});};
const props={cardCode:'CANONICAL',businessName:'Test Business',reviewUrl:'https://search.google.com/local/writereview?placeid=test',whatsappUrl:'https://wa.me/628123',smoothMode:true};
(async()=>{
 for(const language of ['id','en']) {
  lang=language;
  for(const rating of [1,2,3,4,5]){
   let tree;await act(async()=>{tree=create(React.createElement(Flow,props));});
   const google=()=>tree.root.findAllByType('a').find(a=>a.props.href===props.reviewUrl);
   assert(google(),'Google is directly available before rating/form');
   assert.equal(tree.root.findAllByProps({role:'radio'}).length,0);
   const privateButton=()=>tree.root.findAllByType('button').find(b=>b.props['aria-expanded']!==undefined);
   await act(async()=>privateButton().props.onClick());
   const stars=tree.root.findAllByProps({role:'radio'});assert.equal(stars.length,5);assert(stars.every(b=>b.props['aria-checked']===false));
   await act(async()=>stars[rating-1].props.onClick());
   assert(google());assert.equal(redirects,0,'Choosing any internal star never redirects');
   assert.equal(tree.root.findAllByType('form').length,1,'Every rating has the same private form');
   await act(async()=>tree.root.findByType('textarea').props.onChange({target:{value:'My honest experience'}}));
   for(const failure of ['failure','network']) {
    mode=failure;await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
    assert(google());assert.equal(tree.root.findAllByType('form').length,1);assert.equal(tree.root.findByType('textarea').props.value,'My honest experience');
   }
   mode='success';await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
   assert(google(),'Google remains accessible after success');assert.equal(requests.at(-1).body.rating,rating);assert.equal(requests.at(-1).body.card_code,'CANONICAL');assert.equal(requests.at(-1).body.contact_consent,false);assert.equal(requests.at(-1).body.session_id,null);
   assert.equal(tree.root.findAllByType('form').length,0);
   await act(async()=>privateButton().props.onClick());assert(google());
   await act(async()=>tree.unmount());
  }
 }
 let tree;await act(async()=>{tree=create(React.createElement(Flow,{...props,privateFeedbackAvailable:false}));});
 const open=tree.root.findAllByType('button').find(b=>b.props['aria-expanded']!==undefined);await act(async()=>open.props.onClick());
 assert(tree.root.findByType('a').props.href===props.reviewUrl);assert.equal(tree.root.findAllByType('form').length,0);assert.equal(tree.root.findAllByProps({role:'radio'}).length,0);
 await act(async()=>tree.unmount());
 const before=requests.length;await act(async()=>{tree=create(React.createElement(Flow,{...props,previewOnly:true}));});
 assert.equal(tree.root.findAllByType('a').length,0);assert(tree.root.findAllByType('button').every(b=>b.props.disabled));
 const previewOpen=tree.root.findAllByType('button').find(b=>b.props.onClick);await act(async()=>previewOpen.props.onClick());assert.equal(tree.root.findAllByType('form').length,0);assert.equal(requests.length,before);
 await act(async()=>tree.unmount());
 assert.equal(redirects,0);
 console.log('PASS review flow ID/EN: Google access before/after every rating, failure/network/success, optional internal form, no redirects, preserved drafts, blocked storage, missing migration and inert preview');
})().catch(e=>{console.error(e);process.exitCode=1});
