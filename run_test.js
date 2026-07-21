const THREE = require('three');
global.THREE = THREE;
global.window = { innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1, addEventListener: () => {} };
global.document = {
  createElementNS: () => ({ getContext: () => ({}), style:{} }),
  createElement: () => ({ getContext: () => ({ clearRect:()=>{}, fillText:()=>{} }), style:{} }),
  getElementById: () => ({ appendChild: () => {}, style: {} })
};
global.requestAnimationFrame = () => {};
require('fs').readFile('test.js', 'utf8', (err, data) => {
  const safeData = data.replace(/const renderer = new THREE\.WebGLRenderer[\s\S]*?renderer\.domElement\);/, 'const renderer = { domElement: { addEventListener: ()=>{} }, setSize:()=>{}, shadowMap:{}, setPixelRatio:()=>{}, render:()=>{} };');
  try { eval(safeData); console.log("OK"); } catch(e) { console.error(e); }
});
