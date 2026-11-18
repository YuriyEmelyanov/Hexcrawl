import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// Usage: node --disable-warning=ExperimentalWarning this-file.mjs /path/to/exact-checkout
const root = pathToFileURL(resolve(process.argv[2] ?? '.') + sep);
const { terrainTextures: rawTextures } = await import(new URL('src/rendering/terrainBlend.ts', root));
const colors = JSON.parse(readFileSync(new URL('src/rendering/engravingCatalog.json', root), 'utf8'));
const cells = [
  { q: 0, r: 0, color: colors.open_plains.color },
  { q: 1, r: 0, color: colors.sea.color },
  { q: 1, r: -1, color: colors.open_plains.color },
  { q: 0, r: 1, color: colors.sea.color },
];
const context = {
  createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
  putImageData(data) { this.data = data; },
};
globalThis.document = { createElement: () => ({ getContext: () => context }) };
let serial = 0;
const rasters = new Map();
context.canvas = { toDataURL() {
  const id = String(++serial);
  rasters.set(id, Uint8ClampedArray.from(context.data.data));
  return id;
} };
console.log('Actual palettes', colors.open_plains.color, colors.sea.color);
const raster = rawTextures(cells);
const rgb = (key, x, y) => [...rasters.get(raster.get(key)).slice((y * 62 + x) * 4, (y * 62 + x) * 4 + 3)];
console.log('Production output 62×72, last and first neighboring raster columns');
for (let row = 29; row <= 47; row++) console.log(row, rgb('0,0', 61, row), rgb('1,0', 0, row));
const pair = rawTextures(cells.slice(0, 2));
const ordinary = rasters.get(pair.get('0,0'));
console.log('Ordinary edge, red channel at last six columns for 20 rows');
for (let row = 26; row <= 45; row++) console.log(row, [56, 57, 58, 59, 60, 61].map(x => ordinary[(row * 62 + x) * 4]).join(','));

// Keep the exact production formula and change only its sampling position,
// pixel quantization, and per-call cache, so both neighboring evaluations
// can be queried at the same physical location instead of adjacent pixels.
const sampledSource = readFileSync(new URL('src/rendering/terrainBlend.ts', root), 'utf8')
  .replace('const width = 62;', 'const width = 1;')
  .replace('const height = 72;', 'const height = 1;')
  .replace('function preparePixels() {', 'function preparePixels(phaseX:number,phaseY:number) {')
  .replace('const x=((index%width+.5)/width*2-1)*apothem, y=(Math.floor(index/width)+.5)/height*2-1;', 'const [x,y] = globalThis.samplePoint(phaseX,phaseY);')
  .replace('pixels ??= preparePixels();', 'pixels = preparePixels(phaseX,phaseY);')
  .replace('const byKey=new Map', 'cache.clear(); const byKey=new Map');
const { terrainTextures } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(sampledSource)).toString('base64'));
context.createImageData = (width, height) => ({ data: new Float64Array(width * height * 4) });
context.canvas.toDataURL = () => [...context.data.data].slice(0, 3).map(i => +i.toFixed(4)).join(',');
console.log('Exact same physical point on each side of the line x=√3/2 R');
for (const y of [-.140001, -.139999, 0, .139999, .140001]) {
  globalThis.samplePoint = (cx, cy) => [Math.sqrt(3) / 2 - cx, y - cy];
  const samples = terrainTextures(cells);
  console.log(y, samples.get('0,0'), samples.get('1,0'));
}
