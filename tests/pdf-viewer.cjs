const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
global.window = { devicePixelRatio: 3 };
global.ResizeObserver = class { observe() {} disconnect() {} };
let requested = [], pages = [], destroyed = 0, fail = false;
const pdf = { numPages: 2, getPage: async number => {
  pages.push(number);
  return { getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }), render: () => ({ promise: Promise.resolve(), cancel() {} }) };
} };
const fake = { GlobalWorkerOptions: {}, getDocument: () => ({ promise: Promise.resolve(pdf), destroy: async () => { destroyed++; } }) };
const originalLoad = Module._load;
Module._load = function(id, parent, main) { if (id === 'pdfjs-dist') return fake; return originalLoad.call(this, id, parent, main); };
require.extensions['.tsx'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8').replaceAll('import.meta.url', '"https://yukreview.id/chunk.js"'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, file);
global.fetch = async source => { requested.push(source); return fail ? new Response('missing', { status: 404 }) : new Response('%PDF-1.7\n'); };
const Viewer = require('../app/[cardCode]/menu/PdfViewer.tsx').default;
let root;
const props = { source: '/a7c93e10b842/menu/file', title: 'Menu', language: 'id' };
const nodeMock = element => element.type === 'canvas' ? { style: {}, width: 0, height: 0 } : {};
const button = text => root.root.findAllByType('button').find(node => node.children.join('') === text);
(async () => {
  await act(async () => { root = create(React.createElement(Viewer, props), { createNodeMock: nodeMock }); });
  assert.deepEqual(requested, [props.source]);
  assert.deepEqual(pages, [1], 'First page must render without a second click');
  assert.equal(root.root.findAllByType('iframe').length, 0);
  assert.equal(button('Sebelumnya').props.disabled, true);
  await act(async () => button('Berikutnya').props.onClick());
  assert.equal(pages.at(-1), 2);
  assert.equal(button('Berikutnya').props.disabled, true);
  await act(async () => root.unmount());
  assert.equal(destroyed, 1);
  fail = true;
  await act(async () => { root = create(React.createElement(Viewer, props), { createNodeMock: nodeMock }); });
  assert.equal(root.root.findAll(node => node.props.role === 'alert').length, 1);
  fail = false;
  await act(async () => button('Coba Lagi').props.onClick());
  assert.equal(root.root.findAll(node => node.props.role === 'alert').length, 0);
  assert.equal(pages.at(-1), 1);
  await act(async () => root.unmount());
  console.log('PASS PDF viewer: automatic first page, same-domain source, mobile page controls, failure/retry and unmount cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });
