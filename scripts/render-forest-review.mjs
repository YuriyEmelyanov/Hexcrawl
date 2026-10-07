// Static render of the actual App SVG, not a separately drawn illustration.
// Only initial React state is seeded with the review fixture. Rendering source
// is unchanged. Browser export remains a separate CI verification.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const root=path.resolve(import.meta.dirname,'..');
const out=path.resolve(root,'../forest-app-preview');
await fs.mkdir(out,{recursive:true});
const original=await fs.readFile(path.join(root,'src/App.tsx'),'utf8');
const fixture=JSON.parse(await fs.readFile(path.join(root,'test/fixtures/forest-review-map.json'),'utf8'));
for(const glade of [false,true]){
 const data=structuredClone(fixture);
 if(glade)data.map.biomeOverrideByHexKey['3,4']='open_plains';
 const swaps=[
  ['useState<Region[]>([])',`useState<Region[]>(${JSON.stringify(data.map.regions)})`],
  ['useState<Map<string, BiomeId>>(new Map())',`useState<Map<string, BiomeId>>(new Map(${JSON.stringify(Object.entries(data.map.biomeOverrideByHexKey))}))`],
  ['useState<AxialHex | null>(START_HEX)','useState<AxialHex | null>(null)'],
  ["useState<'tiles' | 'emoji' | 'color'>('tiles')","useState<'tiles' | 'emoji' | 'color'>('color')"],
  ['useState(createToponymSeed)','useState(197)']
 ];
 let source=original;
 for(const [a,b] of swaps){if(!source.includes(a))throw Error(`State initializer missing: ${a}`);source=source.replace(a,b);}
 const bundle=path.join(root,`.forest-review-${glade}.mjs`);
 await build({stdin:{contents:source,loader:'tsx',resolveDir:path.join(root,'src'),sourcefile:'App.tsx'},bundle:true,platform:'node',format:'esm',outfile:bundle,external:['react','react-dom','react/jsx-runtime'],jsx:'automatic',logLevel:'silent'});
 const {App}=await import(pathToFileURL(bundle).href);
 const html=renderToStaticMarkup(createElement(App));
 const marker=html.indexOf('data-biome-display="color"');
 const start=html.lastIndexOf('<svg',marker),end=html.indexOf('</svg>',marker)+6;
 if(start<0||end<6)throw Error('Map SVG absent');
 let svg=html.slice(start,end);
 const styles=original.match(/const SVG_EXPORT_STYLES = `([\s\S]*?)`;/)[1];
 const viewbox=svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
 svg=svg.replace('<svg ',`<svg xmlns="http://www.w3.org/2000/svg" width="${viewbox[2]}" height="${viewbox[3]}" `);
 const firstEnd=svg.indexOf('>');
 svg=svg.slice(0,firstEnd+1)+`<style>${styles}</style><rect width="100%" height="100%" fill="#0c1423"/>`+svg.slice(firstEnd+1);
 const hrefs=[...new Set([...svg.matchAll(/href="(\/[^\"]+)"/g)].map(m=>m[1]))];
 for(const href of hrefs){const bytes=await fs.readFile(path.join(root,'public',decodeURIComponent(href)));
  const mime=href.endsWith('.svg')?'image/svg+xml':'image/png';
  svg=svg.replaceAll(`href="${href}"`,`href="data:${mime};base64,${bytes.toString('base64')}"`);
 }
 // SVG 1.1 compatibility for the local rasterizer; no geometry changes.
 svg=svg.replace(/stroke:rgba\((\d+), ?(\d+), ?(\d+), ?([.\d]+)\)/g, 'stroke:rgb($1,$2,$3);stroke-opacity:$4');
 svg=svg.replaceAll('fill:transparent','fill:none').replaceAll('fill="transparent"','fill="none"');
 svg=svg.replace('<svg ', '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ').replaceAll(' href=',' xlink:href=');
 const name=glade?'forest-app-glade':'forest-app-sample';
 await fs.writeFile(path.join(out,`${name}.svg`),svg);
 await fs.rm(bundle);
 console.log(`${name}: ${viewbox[2]} x ${viewbox[3]}, ${svg.length} bytes from App`);
}
