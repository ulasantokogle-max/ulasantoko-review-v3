const fs=require('node:fs'),ts=require('typescript'),Module=require('node:module'),assert=require('node:assert/strict');
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
const original=Module._load;
Module._load=function(id,parent,main){if(id.endsWith('/lib/i18n'))return {useLanguage:()=>({tr:id=>id})};return original.call(this,id,parent,main);};
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const Card=require('../app/components/LandingCardContent.tsx').default,Rating=require('../app/[cardCode]/RatingFlow.tsx').default;
const {landingThemes}=require('../lib/landingThemes.ts');
const css=fs.readFileSync('app/components/public-landing.css','utf8');
function markup(key,preview=false,hidden=false){
 const theme=landingThemes[key];
 const props={theme,themeKey:key,businessName:'Mustika Jaya Herbal',title:'Mustika Jaya Herbal',description:'Deskripsi dari form',category:'retail',coverPosition:'bottom-left',promoText:'Promo dari form',aboutText:'Tentang bisnis\nBaris kedua',reviewUrl:'https://google.com/review',whatsappUrl:'https://wa.me/628123',instagramUrl:'https://instagram.com/test',pdfUrl:'https://example.com/menu.pdf',pdfHref:'/a7c93e10b842/menu',pdfTitle:'Daftar Menu',showGoogleReview:!hidden,showWhatsapp:!hidden,showInstagram:!hidden,showPdf:!hidden,showAbout:!hidden,showPromo:!hidden,labels:{review:'★ Beri Ulasan',about:'Tentang Kami',thanks:'Terima kasih sudah mendukung'},preview,
 rating:React.createElement(Rating,{cardCode:'TEST',businessName:'Mustika Jaya Herbal',reviewUrl:'https://google.com/review',primaryColor:theme.primary,softColor:theme.soft,textColor:theme.text,mutedColor:theme.muted,smoothMode:true,previewOnly:preview})};
 return renderToStaticMarkup(React.createElement('div',{className:'modern-landing'+(preview?' landing-preview':''),'data-theme':key,style:{'--landing-bg':theme.bg,'--landing-card':theme.card,'--landing-primary':theme.primary,'--landing-secondary':theme.secondary,'--landing-soft':theme.soft,'--landing-text':theme.text,'--landing-muted':theme.muted}},React.createElement('section',{className:'public-shell'},React.createElement(Card,props))));
}
function normalize(html){return html.replace(' landing-preview','').replace(/<a\b/g,'<span').replace(/<\/a>/g,'</span>').replace(/ href="[^"]*"| target="[^"]*"| rel="[^"]*"| disabled=""/g,'');}
for(const key of Object.keys(landingThemes)){
 const live=markup(key),preview=markup(key,true);
 assert.equal(normalize(preview),normalize(live),key+' must share the same theme, layout, fields, labels and rating markup');
 assert(!preview.includes('<a '),'Preview links cannot navigate');
 assert.equal((preview.match(/disabled=""/g)||[]).length,5,'Preview ratings cannot submit or redirect');
 assert(live.includes('background-position:left bottom'));
 assert(live.includes('white-space:pre-wrap'));
 assert(live.indexOf('class="public-rating"') < live.indexOf('class="public-links'),key+' rating precedes links');
 assert(live.indexOf('public-pdf-wide') < live.indexOf('public-social-link'),key+' PDF precedes social links');
 assert.equal((live.match(/class="public-link public-social-link"/g)||[]).length,2);
 assert(live.includes('smoothie-stars') && live.includes('public-thanks'));
 const hidden=markup(key,false,true);
 for(const name of ['public-rating','public-links','public-about','public-promo']) assert(!hidden.includes('class="'+name),key+' visibility toggle '+name);
 assert(live.includes('/a7c93e10b842/menu')||live.includes('href="/a7c93e10b842/menu"'),'Public PDF uses the existing internal viewer');
}
assert(css.includes('.modern-landing[data-theme="minimal_dark"] .public-review-link'));
console.log('PASS 5 landing themes: identical preview/public content and rating markup, all form toggles, cover position, preserved line breaks, internal PDF URLs and disabled preview actions');
