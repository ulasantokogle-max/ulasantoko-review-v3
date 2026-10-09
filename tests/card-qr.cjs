const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { act, create } = require('react-test-renderer');
const { PNG } = require('pngjs');
const jsQR = require('jsqr');
global.IS_REACT_ACT_ENVIRONMENT = true;
let language = 'id';
let downloaded;
let clicks = 0;
let removals = 0;
global.document = {
  createElement: tag => {
    if (tag === 'canvas') {
      let pixels;
      return { width:0,height:0,getContext:()=>({ createImageData:(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}), putImageData:image=>{pixels=image;} }), toDataURL:()=> 'data:image/png;base64,'+PNG.sync.write({width:pixels.width,height:pixels.height,data:Buffer.from(pixels.data)}).toString('base64') };
    }
    assert.equal(tag, 'a');
    return { click() { downloaded = { href: this.href, name: this.download }; clicks++; }, remove() { removals++; } };
  },
  body: { appendChild() {} },
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, file);
const originalLoad = Module._load;
Module._load = function(id, parent, main) {
  if (id === '../../lib/i18n') return { useLanguage: () => ({ tr: (id, en) => language === 'en' ? en : id }) };
  return originalLoad.call(this, id, parent, main);
};
const DownloadCardQr = require('../app/components/DownloadCardQr.tsx').default;
(async () => {
  for (const palette of ['rainbow','classic']) for (const url of ['https://yukreview.id/a7c93e10b842', 'https://reputasipro.ulasantoko.space/ULAS-01007', 'https://ulasantoko-review-v3.vercel.app/ULAS-01006']) {
    let ui;
    await act(async () => { ui = create(React.createElement(DownloadCardQr, { cardCode: 'ULAS-01007', url })); });
    assert.equal(ui.root.findByType('button').children.join(''), 'Unduh QR (PNG)');
    await act(async () => ui.root.findByType('select').props.onChange({ target: { value: palette } }));
    await act(async () => { await ui.root.findByType('button').props.onClick(); });
    assert.equal(downloaded.name, 'ULAS-01007-QR.png');
    const png = PNG.sync.read(Buffer.from(downloaded.href.split(',')[1], 'base64'));
    assert(png.width >= 1000);
    assert.deepEqual(Array.from(png.data.subarray(0,4)),[255,255,255,255]);
    const colors=new Set();
    for(let i=0;i<png.data.length;i+=4) {
      if(png.data[i]===255 && png.data[i+1]===255 && png.data[i+2]===255) continue;
      colors.add(png.data[i]+','+png.data[i+1]+','+png.data[i+2]);
      assert.equal(png.data[i+3],255);
    }
    if(palette==='rainbow') assert(colors.size>100,'Rainbow must contain an actual continuous gradient');
    else assert.deepEqual([...colors],['0,0,0']);
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    assert(decoded, 'Downloaded PNG must be decodable');
    assert.equal(decoded.data, url, 'QR must encode the exact stored destination');
    assert.equal(ui.root.findByType('button').props.disabled, false);
    await act(async () => ui.unmount());
  }
  language = 'en';
  let ui;
  await act(async () => { ui = create(React.createElement(DownloadCardQr, { cardCode: 'CARD', url: 'javascript:alert(1)' })); });
  assert.equal(ui.root.findByType('button').children.join(''), 'Download QR (PNG)');
  await act(async () => { await ui.root.findByType('button').props.onClick(); });
  assert.equal(clicks, 6);
  assert.equal(removals, 6);
  assert(ui.root.findByProps({ role: 'alert' }).children.join('').includes('Could not download'));
  await act(async () => ui.unmount());
  await act(async () => { ui = create(React.createElement(DownloadCardQr, { cardCode: 'CARD', url: 'https://example.com', enabled: false })); });
  assert.equal(ui.root.findByType('button').props.disabled, true);
  await act(async () => ui.unmount());
  console.log('PASS QR download PNG decoding, exact destinations, ID/EN, disabled state and invalid URL handling');
})().catch(error => { console.error(error); process.exitCode = 1; });
