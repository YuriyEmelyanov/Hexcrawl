/** GEO2 accepted geometry boundary. Preparation is pure; loading checks the
 * stored choices and their correspondence, and never invokes a route search. */
import type {Detail1State,DetailPoiFootprint} from './detailModel.ts';
import {parseDetail1StateV11} from './detailModel.ts';
import {createDetailGrid,detailCellCenter,detailCellPolygon,worldToDetailCell,type WorldPoint} from './detailGrid.ts';
import {roadPair} from './manualRoads.ts';
import {detailFootprintWorldAnchor,detailFootprintHasOutline,detailFootprintPolygons,detailPointInPolygon} from './detailSizes.ts';
import {prepareRefinementGeographyFromSource,prepareRefinementGeographyPreview} from './geometryRefinementPreview.ts';
import {refinementInputFingerprint} from './geometryRefinementFingerprint.ts';
import {refinementPreferredSide,refinementWorldPoint} from './geometryRefinementGrid.ts';
import {refinementPolylineArc} from './geometryRefinementSource.ts';
import {normalizeRefinementRiverSource} from './geometryRefinementSource.ts';
import {refinementWaterContains,refinementWaterIntervals} from './geometryRefinementWater.ts';
import {prepareRefinementShoreCells,refinementShoreIntervals,refinementShoreLocation,shoreCurvePoint,type RefinementShore} from './geometryRefinementShore.ts';
import {refinementPoiAttachmentMatches,refinementPoiRequirementValid} from './geometryRefinementPoiFeatures.ts';

type PreviewInput=Parameters<typeof prepareRefinementGeographyPreview>[0];
type SourceInput=Parameters<typeof prepareRefinementGeographyFromSource>[0];
type Prepared=Extract<ReturnType<typeof prepareRefinementGeographyPreview>,{status:'prepared'}>;
export type GeometrySideChoice=Readonly<{riverId:number;sourceEdgeKey:string;stepIndex:number;cell:Readonly<{q:number;r:number}>;preferredSide:'left'|'right';chosenSide:'left'|'right'|null;constraintFallback:boolean}>;
export type GeometryRefinement=Readonly<{
 version:1;algorithmVersion:'geo2-v1';sourceFingerprint:string;sourceState:Detail1State;
 riverPlan:Prepared['rivers'];pois:Prepared['pois'];roads:Prepared['roads'];
 unresolved:readonly string[];lockedPoiIds:readonly string[];sideChoices:readonly GeometrySideChoice[];
}>;
export type GeometryPlanInput=(SourceInput|PreviewInput&Readonly<{seed:number}>)&Readonly<{authoredState?:Detail1State}>;
export type GeometryPlanChanges=Readonly<{riverIds:readonly number[];poiIds:readonly string[];roadIds:readonly number[];crossingKeys:readonly string[]}>;
export type GeometryPlanError=Readonly<{status:'error';code:'geometry_conflict';stage:string;refs:readonly string[];completeGeometryPlan:false;readyForApplication:false}>;
const EPS=1e-8;
type Obj=Record<string,unknown>;
const fail=(ref:string):never=>{throw Error(`Invalid GEO2 ${ref}`);};
function object(v:unknown,ref:string,required:readonly string[],optional:readonly string[]=[]):Obj {
 if(!v||typeof v!=='object'||Array.isArray(v))return fail(ref);
 const p=v as Obj,allowed=new Set([...required,...optional]);
 if(required.some(k=>!Object.prototype.hasOwnProperty.call(p,k))||Object.keys(p).some(k=>!allowed.has(k)))return fail(`${ref} fields`);
 return p;
}
function list<T>(v:unknown,ref:string,max=24576):T[]{if(!Array.isArray(v)||v.length>max)return fail(ref);return v as T[];}
function text(v:unknown,ref:string,max=2048):string{if(typeof v!=='string'||!v.length||v.length>max)return fail(ref);return v;}
function integer(v:unknown,ref:string,min=0):number{if(!Number.isSafeInteger(v)||(v as number)<min)return fail(ref);return v as number;}
function scalar(v:unknown,ref:string):number{if(typeof v!=='number'||!Number.isFinite(v))return fail(ref);return v;}
function unit(v:unknown,ref:string):number{const n=scalar(v,ref);if(n<0||n>1)return fail(ref);return n;}
function point(v:unknown,ref:string):WorldPoint{const p=object(v,ref,['x','y']);return {x:scalar(p.x,ref),y:scalar(p.y,ref)};}
const dist=(a:WorldPoint,b:WorldPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
const same=(a:WorldPoint,b:WorldPoint,ref:string)=>{if(dist(a,b)>EPS)return fail(ref);};
const pair=(id:number,key:string)=>JSON.stringify([id,key]);
function unique<T>(items:readonly T[],key:(item:T)=>string,ref:string){const m=new Map(items.map(v=>[key(v),v]));if(m.size!==items.length)return fail(`${ref} duplicate`);return m;}
function strings(v:unknown,ref:string):readonly string[]{const a=list<unknown>(v,ref,4096).map(s=>text(s,ref));unique(a,s=>s,ref);return a;}
/** Also rejects cycles, prototypes, accessors, non-JSON values and resource
 * bombs before any spatial arithmetic. The returned tree shares no input. */
function immutableJson<T>(value:T):T {
 let count=0;const active=new Set<object>();
 function clone(v:unknown,depth:number):unknown{
  if(++count>1000000||depth>64)return fail('capacity');
  if(v===null||typeof v==='boolean')return v;
  if(typeof v==='string'){if(v.length>2000000)return fail('text capacity');return v;}
  if(typeof v==='number')return scalar(v,'finite number');
  if(!v||typeof v!=='object'||active.has(v))return fail('JSON value');
  const proto=Object.getPrototypeOf(v);if(!Array.isArray(v)&&proto!==Object.prototype&&proto!==null)return fail('object prototype');
  active.add(v);let out:unknown;
  if(Array.isArray(v)){if(v.length>100000)return fail('array capacity');out=Object.freeze(v.map(x=>clone(x,depth+1)));}
  else {const p:Obj={};for(const [k,d]of Object.entries(Object.getOwnPropertyDescriptors(v))){if(!('value'in d)||!d.enumerable||k==='__proto__'||k==='constructor'||k==='prototype')return fail('object property');p[k]=clone(d.value,depth+1);}out=Object.freeze(p);}
  active.delete(v);return out;
 }
 return clone(value,0) as T;
}
function vertex(v:unknown,ref:string){const p=point(v,ref);integer(p.x,ref,-Number.MAX_SAFE_INTEGER);integer(p.y,ref,-Number.MAX_SAFE_INTEGER);
 const mod=((p.y%3)+3)%3;if(mod===0)return fail(`${ref} lattice`);
 const r=mod===1?(p.y-1)/3:(p.y+1)/3;if(((p.x-r-1)%2+2)%2!==0)return fail(`${ref} lattice`);return p;
}
function gridEdge(key:unknown,ref:string){const k=text(key,ref),parts=k.split('|');if(parts.length!==2)return fail(ref);
 const vs=parts.map(s=>{const a=s.split(',');if(a.length!==2)return fail(ref);const v=vertex({x:Number(a[0]),y:Number(a[1])},ref);if(`${v.x},${v.y}`!==s)return fail(ref);return v;});
 const [a,b]=vs,dx=b.x-a.x,dy=b.y-a.y;if(!(dx>0||dx===0&&dy>0)||!(dx===0&&dy===2||dx===1&&Math.abs(dy)===1))return fail(`${ref} edge`);return {key:k,from:a,to:b};
}
function onEdge(key:string,t:number,origin:WorldPoint){const e=gridEdge(key,key),a=refinementWorldPoint(e.from,origin),b=refinementWorldPoint(e.to,origin);return {x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)};}
function nodeKey(key:unknown,origin:WorldPoint,ref:string):WorldPoint{
 const k=text(key,ref),v:unknown=JSON.parse(k);if(!Array.isArray(v))return fail(ref);
 if(v.length===3&&v[0]==='vertex'){const p=vertex({x:v[1],y:v[2]},ref);if(k!==JSON.stringify(['vertex',p.x,p.y]))return fail(ref);return refinementWorldPoint(p,origin);}
 if(v.length===3&&v[0]==='edge'){const e=gridEdge(v[1],ref),t=unit(v[2],ref);if(t===0||t===1||k!==JSON.stringify(['edge',e.key,t]))return fail(ref);return onEdge(e.key,t,origin);}
 return fail(ref);
}
function prepared(v:unknown,ref:string,keys:readonly string[],optional:readonly string[]=[]){const p=object(v,ref,['status','completeGeometryPlan',...keys],optional);if(p.status!=='prepared'||p.completeGeometryPlan!==false)return fail(ref);return p;}
function tangent(v:unknown,ref:string){const p=point(v,ref);if(Math.abs(Math.hypot(p.x,p.y)-1)>EPS)return fail(ref);return p;}
function shore(value:unknown,ref:string):RefinementShore{
 const s=object(value,ref,['status','loops','depths','signature']);if(s.status!=='prepared')return fail(ref);
 const loops=list<unknown[]>(s.loops,ref,4096),depths=list<number>(s.depths,ref,4096);if(!loops.length||loops.length!==depths.length)return fail(ref);
 for(let i=0;i<loops.length;i++){integer(depths[i],ref);const curves=list<unknown>(loops[i],ref,24576);if(curves.length<3)return fail(ref);
  for(let j=0;j<curves.length;j++){const c=object(curves[j],ref,['from','control','to']),next=object(curves[(j+1)%curves.length],ref,['from','control','to']);point(c.control,ref);same(point(c.to,ref),point(next.from,ref),`${ref} disconnected`);if(dist(point(c.from,ref),point(c.to,ref))<1e-12)return fail(`${ref} collapsed`);}
 }
 if(!equality(JSON.parse(text(s.signature,ref,2000000)),loops))return fail(`${ref} signature`);
 return s as unknown as RefinementShore;
}
function chosenSide(source:Prepared['rivers']['source']['segments'][number],a:WorldPoint,b:WorldPoint,origin:WorldPoint){
 const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},dx=source.to.point.x-source.from.point.x,dy=source.to.point.y-source.from.point.y,base=source.from.point;
 const t=Math.max(0,Math.min(1,((mid.x-base.x)*dx+(mid.y-base.y)*dy)/(dx*dx+dy*dy))),projected={x:base.x+t*dx,y:base.y+t*dy},cross=dx*(mid.y-base.y)-dy*(mid.x-base.x);
 return {cell:worldToDetailCell(createDetailGrid(1,origin),projected),side:Math.abs(cross)<1e-12?null:cross>0?'left' as const:'right' as const};
}
function validateRivers(g:GeometryRefinement){
 const r=g.riverPlan,origin=g.sourceState.grid.origin;
 prepared(r,'river plan',['source','ports','paths','rapids','waterfalls','boundaries','allocation','exitConstraints','terminations','water','lakes','mouths','paintWater']);
 if(!['existing_endpoint_edges_only','endpoint_corridor_boundaries','endpoint_corridor_shores'].includes(r.allocation))return fail('river allocation');
 const src=r.source;prepared(src,'river source',['segments','sectors','boundaries','rapids','waterfalls','sourceSignature']);
 const source=unique(list<typeof src.segments[number]>(src.segments,'source segments',4096),s=>pair(integer(s.riverId,'river id',1),text(s.edgeKey,'source edge')),'source segments');
 const nodes=new Map<string,WorldPoint>(),incidences=new Map<string,{incoming:number;outgoing:number;next:string[]}>(),allEdges=new Set<string>();
 for(const s of source.values()){
  object(s,'source segment',['riverId','edgeKey','from','to','fullness']);if(![1,2,3,4,5].includes(s.fullness))return fail(s.edgeKey);
  for(const n of [s.from,s.to]){object(n,s.edgeKey,['key','point']);text(n.key,s.edgeKey);const p=point(n.point,s.edgeKey),old=nodes.get(n.key);if(old)same(old,p,s.edgeKey);else nodes.set(n.key,p);if(!incidences.has(n.key))incidences.set(n.key,{incoming:0,outgoing:0,next:[]});}
  if(s.from.key===s.to.key||dist(s.from.point,s.to.point)<EPS||s.edgeKey!==[s.from.key,s.to.key].sort().join('|')||allEdges.has(s.edgeKey))return fail(s.edgeKey);allEdges.add(s.edgeKey);
  const a=incidences.get(s.from.key)!,b=incidences.get(s.to.key)!;a.outgoing++;a.next.push(s.to.key);b.incoming++;
 }
 // Delta distributaries are typed source splits, separate from numerical
 // confluences. Their accepted1-in/2-out topology still has maximum degree3.
 const splitNodes=new Set(list<typeof src.boundaries[number]>(src.boundaries,'source boundaries',8192).filter(b=>b&&b.end==='start'&&b.reason==='split').map(b=>b.sourceNodeKey));
 const visited=new Set<string>(),active=new Set<string>();const visit=(k:string)=>{if(active.has(k))return fail(`${k} cyclic source`);if(visited.has(k))return;active.add(k);const n=incidences.get(k)!;if(n.incoming>2||n.outgoing>2||n.incoming+n.outgoing>3||n.outgoing===2&&(n.incoming!==1||!splitNodes.has(k)))return fail(`${k} degree`);for(const t of n.next)visit(t);active.delete(k);visited.add(k);};for(const k of nodes.keys())visit(k);
 const sectors=unique(list<typeof src.sectors[number]>(src.sectors,'sectors',4096),s=>pair(s.riverId,s.sectorId),'sectors'),covered=new Set<string>();
 for(const sector of sectors.values()){object(sector,'sector',['riverId','sectorId','sectorIndex','assignedRegionId','edgeKeys']);integer(sector.riverId,'sector river',1);text(sector.sectorId,'sector id');integer(sector.sectorIndex,'sector index');if(sector.assignedRegionId!==null)integer(sector.assignedRegionId,'sector owner',1);for(const key of strings(sector.edgeKeys,'sector edges')){const k=pair(sector.riverId,key);if(!source.has(k)||covered.has(k))return fail('sector incidence');covered.add(k);}}
 if(covered.size!==source.size)return fail('uncovered source');
 for(const b of unique(list<typeof src.boundaries[number]>(src.boundaries,'source boundaries',8192),b=>JSON.stringify([b.riverId,b.sectorId,b.end]),'source boundaries').values()){object(b,'source boundary',['riverId','sectorId','sourceNodeKey','end','reason','assignedRegionId']);const s=sectors.get(pair(b.riverId,b.sectorId));if(!s||!nodes.has(b.sourceNodeKey)||!['start','end'].includes(b.end)||!['river_start','river_confluence','lake','region_boundary','split','unknown','river_end'].includes(b.reason)||b.assignedRegionId!==s.assignedRegionId)return fail('source boundary incidence');const edges=s.edgeKeys.map(k=>source.get(pair(s.riverId,k))!);if(b.sourceNodeKey!==(b.end==='start'?edges[0]?.from.key:edges[edges.length-1]?.to.key))return fail('source boundary endpoint');}
 if(src.boundaries.length!==sectors.size*2)return fail('source boundary count');
 unique(list<typeof src.rapids[number]>(src.rapids,'source rapids',4096),r=>{object(r,'source rapid',['riverId','sourceEdgeKey']);const k=pair(r.riverId,r.sourceEdgeKey);if(!source.has(k))return fail('rapid incidence');return k;},'source rapids');for(const k of strings(src.waterfalls,'source waterfalls'))if(!nodes.has(k))return fail('waterfall incidence');
 const expectedSignature=JSON.stringify(['geo2-source-v1',src.segments.map(s=>[s.riverId,s.edgeKey,s.from.key,[s.from.point.x,s.from.point.y],s.to.key,[s.to.point.x,s.to.point.y],s.fullness]),src.sectors,src.boundaries,src.rapids,src.waterfalls]);
 if(!equality(JSON.parse(src.sourceSignature),JSON.parse(expectedSignature)))return fail('source signature');
 const ports=unique(list<typeof r.ports[number]>(r.ports,'ports',8192),p=>text(p.sourceKey,'port source'),'ports'),occupied=new Map<string,string>();
 if(ports.size!==nodes.size)return fail('missing port');
 for(const p of ports.values()){
  object(p,p.sourceKey,['sourceKey','nodeKey','point','location','sourceExitRef']);if(!nodes.has(p.sourceKey))return fail(p.sourceKey);
  same(point(p.point,p.sourceKey),nodeKey(p.nodeKey,origin,p.sourceKey),p.sourceKey);if(occupied.has(p.nodeKey))return fail(`${p.sourceKey} collapsed port`);occupied.set(p.nodeKey,p.sourceKey);
  if(p.sourceExitRef!==null)text(p.sourceExitRef,p.sourceKey);
  if(p.location.kind==='vertex'){object(p.location,p.sourceKey,['kind','vertex']);const v=vertex(p.location.vertex,p.sourceKey);if(p.nodeKey!==JSON.stringify(['vertex',v.x,v.y]))return fail(p.sourceKey);if(incidences.get(p.sourceKey)!.incoming+incidences.get(p.sourceKey)!.outgoing<1)return fail(p.sourceKey);}
  else if(p.location.kind==='edge'){object(p.location,p.sourceKey,['kind','edgeKey','fraction']);if(incidences.get(p.sourceKey)!.incoming+incidences.get(p.sourceKey)!.outgoing!==1||p.nodeKey!==JSON.stringify(['edge',gridEdge(p.location.edgeKey,p.sourceKey).key,unit(p.location.fraction,p.sourceKey)]))return fail(p.sourceKey);}
  else return fail(p.sourceKey);
 }
 const paths=unique(list<typeof r.paths[number]>(r.paths,'paths',4096),p=>pair(integer(p.riverId,'path river',1),text(p.sourceEdgeKey,'path source')),'paths');if(paths.size!==source.size)return fail('path count');
 const used=new Map<string,string|null>(),fineEdges=new Map<string,{a:number;b:number}[]>();
 for(const [id,p]of paths){object(p,id,['riverId','sourceEdgeKey','fromNode','toNode','fullness','nodeKeys','points','steps']);const s=source.get(id);if(!s||p.fromNode!==s.from.key||p.toNode!==s.to.key||p.fullness!==s.fullness)return fail(id);
  const keys=strings(p.nodeKeys,id),points=list<WorldPoint>(p.points,id),steps=list<typeof p.steps[number]>(p.steps,id);if(keys.length<2||points.length!==keys.length||steps.length!==keys.length-1)return fail(id);
  if(keys[0]!==ports.get(p.fromNode)!.nodeKey||keys[keys.length-1]!==ports.get(p.toNode)!.nodeKey)return fail(`${id} endpoint`);
  for(let i=0;i<keys.length;i++){same(point(points[i],id),nodeKey(keys[i],origin,id),id);const sourceNode=i===0?p.fromNode:i===keys.length-1?p.toNode:null;if(used.has(keys[i])&&(!sourceNode||used.get(keys[i])!==sourceNode))return fail(`${id} new join`);used.set(keys[i],sourceNode);}
  for(let i=0;i<steps.length;i++){const step=steps[i];object(step,id,['sourceEdgeKey','from','to','startFraction','endFraction']);const e=gridEdge(step.sourceEdgeKey,id),a=unit(step.startFraction,id),b=unit(step.endFraction,id);if(step.from!==keys[i]||step.to!==keys[i+1]||Math.abs(a-b)<1e-12)return fail(`${id} step`);same(points[i],onEdge(e.key,a,origin),id);same(points[i+1],onEdge(e.key,b,origin),id);const ranges=fineEdges.get(e.key)??[],lo=Math.min(a,b),hi=Math.max(a,b);if(ranges.some(v=>Math.min(v.b,hi)-Math.max(v.a,lo)>1e-12))return fail(`${id} overlap`);ranges.push({a:lo,b:hi});fineEdges.set(e.key,ranges);}
 }
 const capsules=(value:typeof r.water,all:boolean)=>{prepared(value,'water',['capsules']);const entries=unique(list<typeof value.capsules[number]>(value.capsules,'capsules'),c=>JSON.stringify([c.riverId,c.sourceEdgeKey,c.stepIndex]),'capsules');let expected=0;for(const p of paths.values())expected+=p.steps.length;if(all&&entries.size!==expected)return fail('water step count');
  for(const c of entries.values()){object(c,'capsule',['riverId','sourceEdgeKey','stepIndex','from','to','radius','length','ux','uy']);const p=paths.get(pair(c.riverId,c.sourceEdgeKey)),i=integer(c.stepIndex,'capsule step');if(!p||!p.points[i+1]||!(scalar(c.radius,'radius')>0))return fail('capsule ref');same(point(c.from,'capsule'),p.points[i],'capsule');same(point(c.to,'capsule'),p.points[i+1],'capsule');const n=dist(c.from,c.to);if(Math.abs(n-c.length)>EPS||Math.abs(c.ux-(c.to.x-c.from.x)/n)>EPS||Math.abs(c.uy-(c.to.y-c.from.y)/n)>EPS)return fail('capsule metrics');if(!all){const original=r.water.capsules.find(w=>w.riverId===c.riverId&&w.sourceEdgeKey===c.sourceEdgeKey&&w.stepIndex===c.stepIndex);if(!original||!equality(original,c))return fail('paint water ref');}}
 };capsules(r.water,true);capsules(r.paintWater,false);
 const lakes=unique(list<typeof r.lakes[number]>(r.lakes,'lakes',4096),l=>String(integer(l.lakeId,'lake id',1)),'lakes');for(const l of lakes.values()){object(l,'lake',['lakeId','modes']);object(l.modes,'lake modes',['tiles','emoji','color']);for(const mode of ['tiles','emoji','color'] as const)shore(l.modes[mode],`lake:${l.lakeId}:${mode}`);}
 const mouths=unique(list<typeof r.mouths[number]>(r.mouths,'mouths',12288),m=>JSON.stringify([m.riverId,m.sourceEdgeKey,m.sourceNodeKey,m.lakeId,m.mode]),'mouths'),mouthGroups=new Map<string,Set<string>>();
 for(const m of mouths.values()){object(m,'mouth',['riverId','sourceEdgeKey','sourceNodeKey','lakeId','direction','mode','point','stepIndex','stepFraction','loopIndex','curveIndex','shoreFraction']);const p=paths.get(pair(m.riverId,m.sourceEdgeKey)),l=lakes.get(String(m.lakeId));if(!p||!l||!['tiles','emoji','color'].includes(m.mode)||!['inlet','outlet'].includes(m.direction)||m.sourceNodeKey!==(m.direction==='outlet'?p.fromNode:p.toNode))return fail('mouth ref');const i=integer(m.stepIndex,'mouth step'),t=unit(m.stepFraction,'mouth fraction');if(!p.points[i+1])return fail('mouth step');same(point(m.point,'mouth'),{x:p.points[i].x+t*(p.points[i+1].x-p.points[i].x),y:p.points[i].y+t*(p.points[i+1].y-p.points[i].y)},'mouth path');const body=l.modes[m.mode],loop=body.loops[integer(m.loopIndex,'mouth loop')],curve=loop?.[integer(m.curveIndex,'mouth curve')];if(!curve||body.depths[m.loopIndex]%2!==0)return fail('mouth island');same(m.point,shoreCurvePoint(curve,unit(m.shoreFraction,'shore fraction')),'mouth shore');const k=JSON.stringify([m.riverId,m.sourceEdgeKey,m.sourceNodeKey,m.lakeId]);const modes=mouthGroups.get(k)??new Set<string>();modes.add(m.mode);mouthGroups.set(k,modes);}
 for(const modes of mouthGroups.values())if(modes.size!==3)return fail('mouth missing mode');
 for(const mark of unique(list<typeof r.rapids[number]>(r.rapids,'rapids',4096),m=>pair(m.riverId,m.sourceEdgeKey),'rapids').values()){object(mark,'rapid',['riverId','sourceEdgeKey','kind','sourceRef','point','tangent','fraction']);const p=paths.get(pair(mark.riverId,mark.sourceEdgeKey));if(!p||mark.kind!=='rapid'||mark.sourceRef!==`rapid:${mark.riverId}:${mark.sourceEdgeKey}`||!src.rapids.some(s=>s.riverId===mark.riverId&&s.sourceEdgeKey===mark.sourceEdgeKey)||mark.fraction!==.5)return fail('rapid ref');const arc=refinementPolylineArc(p.points,.5);same(point(mark.point,'rapid'),arc.point,'rapid');same(tangent(mark.tangent,'rapid'),arc.tangent,'rapid direction');}
 if(r.rapids.length!==src.rapids.length)return fail('missing rapid');
 for(const fall of unique(list<typeof r.waterfalls[number]>(r.waterfalls,'waterfalls',4096),f=>f.sourceNodeKey,'waterfalls').values()){object(fall,'waterfall',['kind','sourceRef','sourceNodeKey','point','incidences']);if(fall.kind!=='waterfall'||fall.sourceRef!==`vertex:${fall.sourceNodeKey}`||!src.waterfalls.includes(fall.sourceNodeKey))return fail('waterfall ref');const port=ports.get(fall.sourceNodeKey);if(!port)return fail('waterfall port');same(point(fall.point,'waterfall'),port.point,'waterfall');const links=list<typeof fall.incidences[number]>(fall.incidences,'waterfall incidences',3);if(links.length!==[...paths.values()].filter(p=>p.fromNode===fall.sourceNodeKey||p.toNode===fall.sourceNodeKey).length)return fail('waterfall incidence count');unique(links,l=>pair(l.riverId,l.sourceEdgeKey),'waterfall links');for(const link of links){object(link,'waterfall link',['riverId','sourceEdgeKey','flow','point','tangent','fraction']);const p=paths.get(pair(link.riverId,link.sourceEdgeKey));if(!p||link.flow!==(p.fromNode===fall.sourceNodeKey?'leaving':'entering')||link.fraction!==(p.fromNode===fall.sourceNodeKey?0:1))return fail('waterfall direction');const a=refinementPolylineArc(p.points,link.fraction);same(point(link.point,'waterfall'),a.point,'waterfall');same(tangent(link.tangent,'waterfall'),a.tangent,'waterfall');}}
 if(r.waterfalls.length!==src.waterfalls.length)return fail('missing waterfall');
 const exits=unique(list<typeof r.exitConstraints[number]>(r.exitConstraints,'exit constraints',8192),e=>e.sourceKey,'exits');for(const e of exits.values()){object(e,'exit',['sourceKey','sourceExitRef','edgeKeys','riverId','sourceEdgeKey','flow','fullness']);const p=ports.get(e.sourceKey),s=source.get(pair(e.riverId,e.sourceEdgeKey));if(!p||!s||p.sourceExitRef!==e.sourceExitRef||e.fullness!==s.fullness||e.flow!==(s.from.key===e.sourceKey?'entering':'leaving'))return fail('exit correspondence');const edges=strings(e.edgeKeys,'exit edges');if(!edges.length||!edges.some(k=>{gridEdge(k,'exit edge');const a=onEdge(k,0,origin),b=onEdge(k,1,origin);return Math.abs(dist(a,p.point)+dist(p.point,b)-dist(a,b))<EPS;}))return fail('exit edge');}
 for(const p of ports.values())if(p.sourceExitRef!==null&&!exits.has(p.sourceKey))return fail('missing exit');
 const terminations=unique(list<typeof r.terminations[number]>(r.terminations,'terminations',8192),t=>t.sourceKey,'terminations');for(const t of terminations.values()){object(t,'termination',['sourceKey','kind','hydrologyNodeId']);const degree=incidences.get(t.sourceKey);if(!ports.has(t.sourceKey)||!degree||degree.incoming+degree.outgoing!==1||exits.has(t.sourceKey)||!['source','sea','lake'].includes(t.kind))return fail('termination');text(t.hydrologyNodeId,'termination id');if(t.kind!=='lake'&&(t.hydrologyNodeId!==t.sourceKey||src.boundaries.some(b=>b.sourceNodeKey===t.sourceKey&&b.reason==='lake')))return fail('termination correspondence');if(t.kind==='lake'){const lakeId=Number(t.hydrologyNodeId.replace(/^lake:/,''));if(!lakes.has(String(lakeId)))return fail('termination lake');for(const p of paths.values())if((p.fromNode===t.sourceKey||p.toNode===t.sourceKey)&&r.paintWater.capsules.some(c=>c.riverId===p.riverId&&c.sourceEdgeKey===p.sourceEdgeKey)&&!mouthGroups.has(JSON.stringify([p.riverId,p.sourceEdgeKey,t.sourceKey,lakeId])))return fail('missing lake mouths');}}
 for(const m of mouths.values()){const t=terminations.get(m.sourceNodeKey);if(t?.kind!=='lake'||t.hydrologyNodeId!==`lake:${m.lakeId}`)return fail('mouth terminal correspondence');}
 for(const [key,n]of incidences)if(n.incoming+n.outgoing===1&&!exits.has(key)&&!terminations.has(key))return fail('missing terminal classification');
 for(const b of unique(list<typeof r.boundaries[number]>(r.boundaries,'boundaries',8192),b=>JSON.stringify([b.riverId,b.sectorId,b.end]),'boundaries').values()){object(b,'boundary',['riverId','sectorId','sourceNodeKey','end','reason','assignedRegionId','point']);const p=ports.get(b.sourceNodeKey);if(!p||!src.boundaries.some(s=>Object.keys(s).every(k=>(s as unknown as Obj)[k]===(b as unknown as Obj)[k])))return fail('boundary ref');same(point(b.point,'boundary'),p.point,'boundary');}
 if(r.boundaries.length!==src.boundaries.length)return fail('boundary count');
 const choices=unique(list<GeometrySideChoice>(g.sideChoices,'side choices'),c=>JSON.stringify([c.riverId,c.sourceEdgeKey,c.stepIndex]),'side choices');if(choices.size!==r.paths.reduce((n,p)=>n+p.steps.length,0))return fail('side choice count');
 for(const c of choices.values()){object(c,'side choice',['riverId','sourceEdgeKey','stepIndex','cell','preferredSide','chosenSide','constraintFallback']);const p=paths.get(pair(c.riverId,c.sourceEdgeKey)),s=source.get(pair(c.riverId,c.sourceEdgeKey)),i=integer(c.stepIndex,'side step');if(!p||!s||!p.points[i+1]||!['left','right'].includes(c.preferredSide))return fail('side choice ref');const a=chosenSide(s,p.points[i],p.points[i+1],origin);object(c.cell,'side cell',['q','r']);if(c.cell.q!==a.cell.q||c.cell.r!==a.cell.r||c.chosenSide!==a.side||c.constraintFallback!==(a.side!==null&&a.side!==c.preferredSide))return fail('side choice geometry');}
 return paths;
}

function validatePois(g:GeometryRefinement,parseState:(v:unknown)=>Detail1State,inputs:Obj){
 const result=g.pois,origin=g.sourceState.grid.origin,fine=createDetailGrid(1,origin),coarse=createDetailGrid(6,origin),sources=new Map(g.sourceState.poiFootprints.map(f=>[f.poiId,f]));
 prepared(result,'POIs',['pois','unresolved','unchanged']);const pois=unique(list<typeof result.pois[number]>(result.pois,'POIs',4096),p=>text(p.poiId,'POI id'),'POIs');
 const unresolved=strings(result.unresolved,'unresolved POIs'),unchanged=strings(result.unchanged,'unchanged POIs');
 if(!equality([...unresolved].sort(),[...g.unresolved].sort())||unresolved.some(id=>pois.has(id)||unchanged.includes(id))||unchanged.some(id=>pois.has(id))||pois.size+unresolved.length+unchanged.length!==sources.size||[...unresolved,...unchanged].some(id=>!sources.has(id)))return fail('POI disposition');
 const requirements=unique(list<{id:string;requirement:typeof result.pois[number]['provenance']}>(inputs.owners,'source POI requirements',4096),o=>o.id,'source POI requirements');
 if(requirements.size!==sources.size)return fail('POI requirement owners');for(const id of unresolved)if(requirements.get(id)?.requirement.provenance!=='unknown')return fail(`${id} unknown provenance`);for(const id of unchanged){const r=requirements.get(id)?.requirement;if(!r||r.provenance==='unknown'||['river','rapid','waterfall','crossing'].includes(r.requirement))return fail(`${id} unchanged requirement`);}
 const footprints=g.sourceState.poiFootprints.map(f=>pois.get(f.poiId)?.footprint??f);const parsed=parseState({...g.sourceState,poiFootprints:footprints});
 if(parsed.version!==3||parsed.poiFootprints.length!==footprints.length)return fail('POI footprint state');
 for(const p of pois.values()){
  object(p,p.poiId,['poiId','parent6','oldAnchor','newAnchor','footprint','contact','provenance','routeEntries'],['feature']);const old=sources.get(p.poiId);if(!old||p.footprint.poiId!==p.poiId||p.footprint.legacyRef!==old.legacyRef)return fail(`${p.poiId} owner`);
  object(p.parent6,p.poiId,['q','r']);integer(p.parent6.q,p.poiId,-Number.MAX_SAFE_INTEGER);integer(p.parent6.r,p.poiId,-Number.MAX_SAFE_INTEGER);const polygon=detailCellPolygon(coarse,p.parent6);
  same(point(p.oldAnchor,p.poiId),detailFootprintWorldAnchor(old,fine),`${p.poiId} authored anchor`);same(point(p.newAnchor,p.poiId),detailFootprintWorldAnchor(p.footprint,fine),`${p.poiId} new anchor`);
  if(!detailPointInPolygon(p.oldAnchor,polygon)||!detailPointInPolygon(p.newAnchor,polygon)||old.legacyRef&&old.legacyRef.slice(old.legacyRef.lastIndexOf(':')+1)!==`${p.parent6.q},${p.parent6.r}`)return fail(`${p.poiId} parent`);
  if(!equality(p.footprint.extent,old.extent)||p.footprint.cells.length!==old.cells.length)return fail(`${p.poiId} extent`);
  if((g.lockedPoiIds.includes(p.poiId)||old.extent.kind==='measured_polygon'||'basis'in old.extent&&old.extent.basis==='measured_override')&&dist(p.newAnchor,p.oldAnchor)>EPS)return fail(`${p.poiId} locked`);
  object(p.provenance,p.poiId,['provenance','requirement','predicates']);strings(p.provenance.predicates,p.poiId);if(!refinementPoiRequirementValid(p.provenance,p.feature))return fail(`${p.poiId} provenance`);
  const requirement=requirements.get(p.poiId)?.requirement;if(!requirement||!equality({...p.provenance,predicates:[...p.provenance.predicates].sort()},requirement))return fail(`${p.poiId} source provenance`);
  if(p.feature){object(p.feature,p.poiId,['kind','sourceRef'],['point','bankPoints']);text(p.feature.sourceRef,p.poiId);if(!['rapid','waterfall','crossing','river_start'].includes(p.feature.kind))return fail(`${p.poiId} feature`);if(p.feature.point)point(p.feature.point,p.poiId);if(p.feature.bankPoints)for(const q of list(p.feature.bankPoints,p.poiId,2))point(q,p.poiId);}
  const c=p.contact;object(c,p.poiId,['point','riverId','sourceEdgeKey','stepIndex','side','tangent','distance','cell']);const capsule=g.riverPlan.paintWater.capsules.find(v=>v.riverId===c.riverId&&v.sourceEdgeKey===c.sourceEdgeKey&&v.stepIndex===c.stepIndex);if(!capsule||![-1,0,1].includes(c.side)||scalar(c.distance,p.poiId)<0)return fail(`${p.poiId} bank ref`);
  const oldWater=old.attachments.filter(a=>a.kind==='water'&&a.waterId.startsWith('river:'));if(oldWater.length!==1||oldWater[0].kind!=='water'||oldWater[0].waterId!==`river:${c.riverId}`||oldWater[0].segmentId!==(p.feature?.sourceRef??c.sourceEdgeKey)||oldWater[0].waterKind!==(p.feature?.kind==='river_start'?'river':p.feature?.kind??'river'))return fail(`${p.poiId} source water ref`);
  if(p.footprint.attachments.length!==old.attachments.length||!old.attachments.every(a=>p.footprint.attachments.some(b=>a.kind==='water'&&b.kind==='water'?a.waterKind===b.waterKind&&a.waterId===b.waterId&&a.segmentId===b.segmentId:a.kind==='route'&&b.kind==='route'&&a.routeKind===b.routeKind&&a.routeId===b.routeId&&a.accessNodeId===b.accessNodeId)))return fail(`${p.poiId} attachment identities`);
  if(p.feature?.kind==='rapid'&&!g.riverPlan.rapids.some(r=>r.riverId===c.riverId&&r.sourceEdgeKey===c.sourceEdgeKey&&r.sourceEdgeKey===p.feature!.sourceRef))return fail(`${p.poiId} rapid ref`);
  if(p.feature?.kind==='waterfall'){const mark=g.riverPlan.waterfalls.find(m=>m.sourceRef===p.feature!.sourceRef&&m.incidences.some(i=>i.riverId===c.riverId&&i.sourceEdgeKey===c.sourceEdgeKey));if(!mark||!p.feature.point)return fail(`${p.poiId} waterfall ref`);same(p.feature.point,mark.point,p.poiId);}
  if(p.feature?.kind==='river_start'){const edge=g.riverPlan.source.segments.find(s=>s.riverId===c.riverId&&s.edgeKey===c.sourceEdgeKey),boundary=g.riverPlan.source.boundaries.find(b=>b.riverId===c.riverId&&b.end==='start'&&b.reason==='river_start'&&b.sourceNodeKey===edge?.from.key),port=g.riverPlan.ports.find(p=>p.sourceKey===boundary?.sourceNodeKey);if(!port||!p.feature.point||p.feature.sourceRef!=='start')return fail(`${p.poiId} river start ref`);same(p.feature.point,port.point,p.poiId);}
  if(p.feature?.kind==='crossing'){const crossing=g.roads.crossings.find(x=>`crossing:${x.key}`===p.feature!.sourceRef&&x.riverId===c.riverId&&x.riverEdgeKey===c.sourceEdgeKey);if(!crossing||![crossing.bankEntry,crossing.bankExit].some(q=>dist(q,c.point)<EPS)||!p.provenance.predicates.filter(k=>k.startsWith('crossing_')).every(k=>k==='crossing_any'||k===`crossing_${crossing.kind}`))return fail(`${p.poiId} crossing feature ref`);}
  const location=refinementWaterContains(g.riverPlan.paintWater,point(c.point,p.poiId));if(location.status!=='prepared'||location.clearance===null||Math.abs(location.clearance)>1e-7)return fail(`${p.poiId} bank surface`);
  const t=Math.max(0,Math.min(1,((c.point.x-capsule.from.x)*capsule.ux+(c.point.y-capsule.from.y)*capsule.uy)/capsule.length)),axis={x:capsule.from.x+t*(capsule.to.x-capsule.from.x),y:capsule.from.y+t*(capsule.to.y-capsule.from.y)};
  if(Math.abs(dist(c.point,axis)-capsule.radius)>1e-7||!p.footprint.attachments.some(a=>refinementPoiAttachmentMatches(a,c.riverId,c.sourceEdgeKey,p.feature)&&a.kind==='water'&&dist(a.contact,c.point)<EPS)||g.riverPlan.lakes.some(l=>Object.values(l.modes).some(s=>refinementShoreLocation(s,c.point)==='inside')))return fail(`${p.poiId} bank contact`);
  same(tangent(c.tangent,p.poiId),{x:capsule.ux,y:capsule.uy},`${p.poiId} bank direction`);const cell=worldToDetailCell(fine,c.point);object(c.cell,p.poiId,['q','r']);if(c.cell.q!==cell.q||c.cell.r!==cell.r)return fail(`${p.poiId} bank cell`);
  const delta={x:p.newAnchor.x-p.oldAnchor.x,y:p.newAnchor.y-p.oldAnchor.y};if(old.cells.length>1||old.extent.kind==='manual'||old.extent.kind==='measured_polygon'){
   const shifts=p.footprint.cells.map(n=>old.cells.map(o=>({q:n.q-o.q,r:n.r-o.r}))),first=shifts[0];if(!first.some(shift=>old.cells.every(o=>p.footprint.cells.some(n=>n.q===o.q+shift.q&&n.r===o.r+shift.r))))return fail(`${p.poiId} rigid footprint`);
  }
  const outlined=detailFootprintHasOutline(old,fine)||old.extent.kind==='manual'||old.extent.kind==='measured_polygon'||old.cells.length>1;
  if(outlined){const polygons=detailFootprintPolygons(p.footprint,fine);if(!p.footprint.cells.every(c=>detailCellPolygon(fine,c).every(q=>detailPointInPolygon(q,polygon)))||!(polygons.length?polygons:p.footprint.cells.map(c=>detailCellPolygon(fine,c))).some(poly=>detailPointInPolygon(p.contact.point,poly)))return fail(`${p.poiId} footprint contact`);}
  else same(p.newAnchor,p.contact.point,`${p.poiId} marker contact`);
  const signed=capsule.ux*(c.point.y-capsule.from.y)-capsule.uy*(c.point.x-capsule.from.x),actualSide=signed>1e-9?1:signed< -1e-9?-1:0;if(c.side!==actualSide||Math.abs(c.distance-dist(c.point,outlined?p.newAnchor:p.oldAnchor))>1e-7)return fail(`${p.poiId} bank metrics`);
  const sourceSegment=g.riverPlan.source.segments.find(s=>s.riverId===c.riverId&&s.edgeKey===c.sourceEdgeKey)!;const sourceCross=(sourceSegment.to.point.x-sourceSegment.from.point.x)*(p.oldAnchor.y-sourceSegment.from.point.y)-(sourceSegment.to.point.y-sourceSegment.from.point.y)*(p.oldAnchor.x-sourceSegment.from.point.x);if(Math.abs(sourceCross)>1e-8&&c.side!==0&&c.side!==(sourceCross>0?1:-1))return fail(`${p.poiId} bank side`);
  const entries=unique(list<typeof p.routeEntries[number]>(p.routeEntries,p.poiId,4096),e=>JSON.stringify([e.routeId,e.accessNodeId]),'route entries'),oldRoutes=old.attachments.filter(a=>a.kind==='route');if(entries.size!==oldRoutes.length)return fail(`${p.poiId} route entry count`);
  for(const e of entries.values()){object(e,p.poiId,['routeId','accessNodeId','oldEntry','newEntry']);const oldEntry=oldRoutes.find(a=>a.kind==='route'&&a.routeId===e.routeId&&a.accessNodeId===e.accessNodeId);if(!oldEntry||oldEntry.kind!=='route')return fail(`${p.poiId} route ref`);same(point(e.oldEntry,p.poiId),oldEntry.entry,p.poiId);same(point(e.newEntry,p.poiId),{x:e.oldEntry.x+delta.x,y:e.oldEntry.y+delta.y},p.poiId);if(!p.footprint.attachments.some(a=>a.kind==='route'&&a.routeId===e.routeId&&a.accessNodeId===e.accessNodeId&&dist(a.entry,e.newEntry)<EPS))return fail(`${p.poiId} route attachment`);}
 }
 return footprints;
}
function validateRoads(g:GeometryRefinement,footprints:readonly DetailPoiFootprint[],inputs:Obj){
 const result=g.roads,river=g.riverPlan,owners=new Map(footprints.map(f=>[f.poiId,f]));
 prepared(result,'roads',['roads','crossings','masks','allocation','searchWork','validationWork','searchScope']);if(result.allocation!=='ordered_crossing_candidates_with_visibility_approaches'||result.searchScope!=='moved_POI_parts_with_ordered_crossing_candidates')return fail('road allocation');integer(result.searchWork,'search work');integer(result.validationWork,'validation work');
 const masks=unique(list<typeof result.masks[number]>(result.masks,'road masks',4096),m=>m.poiId,'road masks');for(const m of masks.values()){object(m,'road mask',['poiId','body']);const f=owners.get(m.poiId);if(!f)return fail('mask owner');shore(m.body,'road mask');const expected=prepareRefinementShoreCells(f.cells,g.sourceState.grid.origin,1);if(expected.status!=='prepared'||expected.signature!==m.body.signature)return fail('mask footprint');}
 const roads=unique(list<typeof result.roads[number]>(result.roads,'roads'),r=>pair(integer(r.roadId,'road id',1),text(r.sourceRoadSegmentKey,'road segment')),'roads');
 const crossings=unique(list<typeof result.crossings[number]>(result.crossings,'crossings',4096),c=>text(c.key,'crossing key'),'crossings');
 type SourceRoad={id:number;regionId:number;segments:readonly {kind:'road'|'trail';ends:readonly {q:number;r:number}[]}[]};
 const expectedRoads=new Map<string,{road:SourceRoad;segment:SourceRoad['segments'][number]}>();for(const road of list<SourceRoad>(inputs.roads,'source roads',4096)){integer(road.id,'source road id',1);integer(road.regionId,'source road owner',1);for(const segment of list<SourceRoad['segments'][number]>(road.segments,'source road parts')){if(segment.ends.length!==2)return fail('source road ends');const key=pair(road.id,roadPair(segment.ends[0],segment.ends[1]));if(expectedRoads.has(key))return fail('source road duplicate');expectedRoads.set(key,{road,segment});}}
 const expectedCrossings=unique(list<{key:string;roadId:number;roadSegmentKey:string;riverId:number;riverEdgeKey:string;kind:string}>(inputs.crossings,'source crossings',4096),c=>c.key,'source crossings');
 if(roads.size!==expectedRoads.size||crossings.size!==expectedCrossings.size)return fail('source route count');
 const land=prepareRefinementShoreCells(list<{q:number;r:number}>(inputs.landCells,'land cells',20000),g.sourceState.grid.origin);if(land.status!=='prepared')return fail('generated land');
 for(const r of roads.values()){
  const ref=pair(r.roadId,r.sourceRoadSegmentKey);object(r,ref,['roadId','regionId','sourceRoadSegmentKey','kind','fromNode','toNode','sourceFrom','sourceTo','points','fromEntry','toEntry','linkedPoiIds','usedPorts','bankContacts','adapted','crossingKeys','paint']);integer(r.regionId,ref,1);if(!['road','trail'].includes(r.kind)||typeof r.adapted!=='boolean')return fail(ref);point(r.sourceFrom,ref);point(r.sourceTo,ref);text(r.fromNode,ref);text(r.toNode,ref);
  const actualSource=expectedRoads.get(ref);if(!actualSource||actualSource.road.regionId!==r.regionId||actualSource.segment.kind!==r.kind)return fail(`${ref} source road`);const [from,to]=[...actualSource.segment.ends].sort((a,b)=>`${a.q},${a.r}`<`${b.q},${b.r}`?-1:1);if(r.fromNode!==`${from.q},${from.r}`||r.toNode!==`${to.q},${to.r}`)return fail(`${ref} source nodes`);same(r.sourceFrom,detailCellCenter(createDetailGrid(6,g.sourceState.grid.origin),from),ref);same(r.sourceTo,detailCellCenter(createDetailGrid(6,g.sourceState.grid.origin),to),ref);
  const linked=strings(r.linkedPoiIds,ref);if(linked.some(id=>!owners.has(id))||r.adapted!==(linked.length>0))return fail(`${ref} linked POI`);strings(r.usedPorts,ref);for(const q of list(r.bankContacts,ref,4096))point(q,ref);if(r.fromEntry)point(r.fromEntry,ref);if(r.toEntry)point(r.toEntry,ref);
  const points=list<WorldPoint>(r.points,ref);if(points.length<2)return fail(ref);const arcs=[0];for(let i=0;i<points.length;i++){point(points[i],ref);if(i){const n=dist(points[i],points[i-1]);if(n<EPS)return fail(`${ref} collapsed`);arcs.push(arcs[i-1]+n);}}
  const movedAt=(node:string)=>g.pois.pois.find(p=>`${p.parent6.q},${p.parent6.r}`===node);const fromPoi=movedAt(r.fromNode),toPoi=movedAt(r.toNode);same(points[0],fromPoi?.newAnchor??r.sourceFrom,`${ref} road start`);same(points[points.length-1],toPoi?.newAnchor??r.sourceTo,`${ref} road end`);const expectedLinks=[fromPoi,toPoi].filter((p):p is NonNullable<typeof p>=>!!p).map(p=>p.poiId);if(!equality([...linked].sort(),expectedLinks.sort()))return fail(`${ref} access owners`);
  const keys=strings(r.crossingKeys,ref);for(const k of keys){const c=crossings.get(k);if(!c||c.roadId!==r.roadId||c.roadSegmentKey!==r.sourceRoadSegmentKey)return fail(`${ref} crossing ref`);}
  const at=(s:number)=>{if(s< -EPS||s>arcs[arcs.length-1]+EPS)return fail(`${ref} arc`);const i=arcs.findIndex((a,i)=>i>0&&a>=s-EPS);if(i<1)return points[points.length-1];const t=Math.max(0,Math.min(1,(s-arcs[i-1])/(arcs[i]-arcs[i-1])));return {x:points[i-1].x+t*(points[i].x-points[i-1].x),y:points[i-1].y+t*(points[i].y-points[i-1].y)};};
  let last=-Infinity;for(const k of keys){const c=crossings.get(k)!;object(c,k,['key','roadId','roadSegmentKey','riverId','riverEdgeKey','kind','sourcePoint','point','fullness','roadDistance','roadFraction','roadPieceIndex','roadTangent','riverTangents','bankEntry','bankExit','bankPath','wetStart','wetEnd']);const path=river.paths.find(p=>p.riverId===c.riverId&&p.sourceEdgeKey===c.riverEdgeKey);if(!path||!['bridge','ford','ferry'].includes(c.kind)||c.fullness!==path.fullness||c.kind==='ford'&&c.fullness>2||c.wetStart>=c.wetEnd||c.roadDistance<=last||c.roadDistance<c.wetStart-EPS||c.roadDistance>c.wetEnd+EPS||Math.abs(c.roadFraction-c.roadDistance/arcs[arcs.length-1])>EPS)return fail(`${k} crossing incidence`);last=c.roadDistance;const index=integer(c.roadPieceIndex,k);if(!points[index+1]||c.roadDistance<arcs[index]-EPS||c.roadDistance>arcs[index+1]+EPS)return fail(`${k} road piece`);same(point(c.point,k),at(c.roadDistance),k);same(point(c.bankEntry,k),at(c.wetStart),k);same(point(c.bankExit,k),at(c.wetEnd),k);point(c.sourcePoint,k);same(tangent(c.roadTangent,k),{x:(points[index+1].x-points[index].x)/(arcs[index+1]-arcs[index]),y:(points[index+1].y-points[index].y)/(arcs[index+1]-arcs[index])},k);const tangents=list<WorldPoint>(c.riverTangents,k,2);if(!tangents.length)return fail(`${k} river tangent`);for(const t of tangents)tangent(t,k);if(!path.points.slice(1).some((p,i)=>Math.abs(dist(path.points[i],c.point)+dist(c.point,p)-dist(path.points[i],p))<EPS))return fail(`${k} river point`);for(const q of [c.bankEntry,c.bankExit]){const loc=refinementWaterContains(river.paintWater,q);if(loc.status!=='prepared'||loc.clearance===null||Math.abs(loc.clearance)>1e-7)return fail(`${k} bank`);}const banks=list<WorldPoint>(c.bankPath,k);if(banks.length<2)return fail(`${k} bank path`);same(point(banks[0],k),c.bankEntry,k);same(point(banks[banks.length-1],k),c.bankExit,k);}
  for(let i=1;i<points.length;i++){const query={from:points[i-1],to:points[i]},span=arcs[i]-arcs[i-1],dry=refinementShoreIntervals(land,query);if(dry.status!=='prepared'||dry.intervals.length!==1||!dry.intervals[0].startClipped||!dry.intervals[0].endClipped)return fail(`${ref} outside land`);for(const lake of river.lakes)for(const body of Object.values(lake.modes)){const clip=refinementShoreIntervals(body,query);if(clip.status!=='prepared'||clip.intervals.some(v=>(v.endFraction-v.startFraction)*span>EPS))return fail(`${ref} lake crossing`);}const wet=refinementWaterIntervals(river.paintWater,query);if(wet.status!=='prepared')return fail(`${ref} water`);for(const w of wet.intervals){const a=arcs[i-1]+w.startFraction*span,b=arcs[i-1]+w.endFraction*span;if(b-a>EPS&&!keys.some(k=>{const c=crossings.get(k)!;return a>=c.wetStart-EPS&&b<=c.wetEnd+EPS&&w.contributors.every(v=>v.riverId===c.riverId&&v.sourceEdgeKey===c.riverEdgeKey);}))return fail(`${ref} untyped water crossing`);}}
  const paint=list<typeof r.paint[number]>(r.paint,ref);if(!paint.length)return fail(`${ref} paint`);let endpoint=points[0];for(const piece of paint){object(piece,ref,['from','to','visible','poiMaskIds','crossingKey','waterKind']);same(point(piece.from,ref),endpoint,`${ref} disconnected paint`);endpoint=point(piece.to,ref);if(dist(piece.from,piece.to)<EPS||typeof piece.visible!=='boolean'||strings(piece.poiMaskIds,ref).some(id=>!masks.has(id)))return fail(`${ref} paint`);const c=piece.crossingKey===null?null:crossings.get(piece.crossingKey);if(piece.crossingKey!==null&&!c||piece.waterKind!==(c?.kind??null)||piece.visible!==(piece.poiMaskIds.length===0&&c?.kind!=='ferry'))return fail(`${ref} paint crossing`);}same(endpoint,points[points.length-1],`${ref} paint endpoint`);
 }
 for(const c of crossings.values()){const r=roads.get(pair(c.roadId,c.roadSegmentKey)),source=expectedCrossings.get(c.key);if(!r?.crossingKeys.includes(c.key)||!source||!['roadId','roadSegmentKey','riverId','riverEdgeKey','kind'].every(k=>(source as unknown as Obj)[k]===(c as unknown as Obj)[k]))return fail(`${c.key} source crossing`);}
}

/** The callback must parse an authored physical3 snapshot. It allows the
 * physical-state parser to use this boundary without recursively accepting4. */
export function parseGeometryRefinement(value:unknown,parseSourceState:(value:unknown)=>Detail1State):GeometryRefinement {
 const raw=immutableJson(value);const root=object(raw,'refinement',['version','algorithmVersion','sourceFingerprint','sourceState','riverPlan','pois','roads','unresolved','lockedPoiIds','sideChoices']);
 if(root.version!==1||root.algorithmVersion!=='geo2-v1')return fail('version');
 const fingerprint=text(root.sourceFingerprint,'source fingerprint',2000000),prefix='geo2-source-input-v1:';if(!fingerprint.startsWith(prefix))return fail('source fingerprint');const inputs=JSON.parse(fingerprint.slice(prefix.length));if(!inputs||typeof inputs!=='object'||inputs.version!==1||inputs.algorithmVersion!=='geo2-v1')return fail('source fingerprint payload');
 if(!root.sourceState||typeof root.sourceState!=='object'||(root.sourceState as Obj).version!==3||Object.prototype.hasOwnProperty.call(root.sourceState,'geometryRefinement'))return fail('authored physical3');
 const sourceState=parseSourceState(root.sourceState);if(sourceState.version!==3)return fail('authored physical3');const g=Object.freeze({...root,sourceState}) as unknown as GeometryRefinement;
 const owners=new Set(sourceState.poiFootprints.map(f=>f.poiId));if(strings(g.lockedPoiIds,'locks').some(id=>!owners.has(id)))return fail('lock owner');strings(g.unresolved,'unresolved');validateRivers(g);const footprints=validatePois(g,parseSourceState,inputs);validateRoads(g,footprints,inputs);
 return g;
}

export type GeometrySourceValidationInput=Omit<PreviewInput,'riverPlan'>&Readonly<{riverPlan?:PreviewInput['riverPlan']}>;
/** Checks a loaded plan against the actual accepted source. Persisted routes
 * are inputs to the exact signature, never regenerated during this check. */
export function validateGeometryRefinementSource(input:GeometrySourceValidationInput,refinement:GeometryRefinement):boolean {
 try {
  const source=normalizeRefinementRiverSource({rivers:input.map.rivers,marks:input.marks,origin:input.origin});
  if(source.status!=='prepared'||source.sourceSignature!==refinement.riverPlan.source.sourceSignature)return false;
  return refinementInputFingerprint({...input,riverPlan:refinement.riverPlan,lockedPoiIds:new Set(refinement.lockedPoiIds)},refinement.sourceState)===refinement.sourceFingerprint;
 }catch{return false;}
}

function equality(a:unknown,b:unknown):boolean{if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;if(Array.isArray(a)&&Array.isArray(b))return a.length===b.length&&a.every((v,i)=>equality(v,b[i]));const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();return ka.length===kb.length&&ka.every((k,i)=>k===kb[i]&&equality((a as Obj)[k],(b as Obj)[k]));}
function inputPayload(g:GeometryRefinement):Obj{return JSON.parse(g.sourceFingerprint.slice('geo2-source-input-v1:'.length)) as Obj;}
/** A new generated domain must remain unrefined. Until a stored subdomain can
 * be projected independently, refuse that transition rather than acquire or
 * move its geometry implicitly. Ordinary edits inside the accepted domain do
 * not have this restriction. */
function dependencyClosure(previous:GeometryRefinement,next:GeometryRefinement){
 const before=inputPayload(previous),after=inputPayload(next),riverIds=new Set<number>(),roadIds=new Set<number>(),poiIds=new Set<string>();
 const diff=<T>(a:readonly T[],b:readonly T[],key:(v:T)=>string,changed:(v:T)=>void)=>{const old=new Map(a.map(v=>[key(v),v])),current=new Map(b.map(v=>[key(v),v]));for(const [k,v]of current)if(!equality(old.get(k),v))changed(v);for(const [k,v]of old)if(!current.has(k))changed(v);};
 const oldRegions=list<{id:number;hexes:readonly unknown[]}>(before.regions,'old regions'),newRegions=list<{id:number;hexes:readonly unknown[]}>(after.regions,'new regions');
 const domain=(regions:typeof oldRegions)=>new Set(regions.flatMap(r=>r.hexes.map(h=>JSON.stringify([r.id,h]))));const oldDomain=domain(oldRegions),newDomain=domain(newRegions);
 if([...newDomain].some(k=>!oldDomain.has(k)))return fail('refinement_domain_expansion');
 const oldSegments=previous.riverPlan.source.segments,newSegments=next.riverPlan.source.segments;
 diff(oldSegments,newSegments,s=>pair(s.riverId,s.edgeKey),s=>riverIds.add(s.riverId));
 diff(previous.riverPlan.source.boundaries,next.riverPlan.source.boundaries,b=>JSON.stringify([b.riverId,b.sectorId,b.end]),b=>riverIds.add(b.riverId));
 diff(previous.riverPlan.source.rapids,next.riverPlan.source.rapids,r=>pair(r.riverId,r.sourceEdgeKey),r=>riverIds.add(r.riverId));
 const changedFalls=new Set([...previous.riverPlan.source.waterfalls,...next.riverPlan.source.waterfalls].filter(k=>previous.riverPlan.source.waterfalls.includes(k)!==next.riverPlan.source.waterfalls.includes(k)));for(const s of [...oldSegments,...newSegments])if(changedFalls.has(s.from.key)||changedFalls.has(s.to.key))riverIds.add(s.riverId);
 const changedLakes=new Set<number>();diff(previous.riverPlan.lakes,next.riverPlan.lakes,l=>String(l.lakeId),l=>changedLakes.add(l.lakeId));for(const m of [...previous.riverPlan.mouths,...next.riverPlan.mouths])if(changedLakes.has(m.lakeId))riverIds.add(m.riverId);
 diff(list<{id:number}>(before.roads,'old roads'),list<{id:number}>(after.roads,'new roads'),r=>String(r.id),r=>roadIds.add(r.id));
 diff(list<{key:string;roadId:number}>(before.crossings,'old crossings'),list<{key:string;roadId:number}>(after.crossings,'new crossings'),c=>c.key,c=>roadIds.add(c.roadId));
 const authored=(f:DetailPoiFootprint)=>{const {note:ignored,...extent}=f.extent as DetailPoiFootprint['extent']&{note?:string};return {...f,extent};};
 diff(previous.sourceState.poiFootprints.map(authored),next.sourceState.poiFootprints.map(authored),f=>f.poiId,f=>poiIds.add(f.poiId));
 diff(list<{id:string}>(before.owners,'old owners'),list<{id:string}>(after.owners,'new owners'),o=>o.id,o=>poiIds.add(o.id));
 for(const p of [...previous.pois.pois,...next.pois.pois])if(riverIds.has(p.contact.riverId))poiIds.add(p.poiId);
 for(const r of [...previous.roads.roads,...next.roads.roads])if(r.linkedPoiIds.some(id=>poiIds.has(id)))roadIds.add(r.roadId);
 for(const c of [...previous.roads.crossings,...next.roads.crossings])if(riverIds.has(c.riverId))roadIds.add(c.roadId);
 const assertUnrelated=<T>(a:readonly T[],b:readonly T[],key:(v:T)=>string,affected:(v:T)=>boolean,ref:string)=>{const old=new Map(a.map(v=>[key(v),v]));for(const v of b){const prior=old.get(key(v));if(prior&&!affected(v)&&!equality(prior,v))return fail(`${ref}:${key(v)}:unrelated_geometry_changed`);}};
 assertUnrelated(previous.riverPlan.paths,next.riverPlan.paths,p=>pair(p.riverId,p.sourceEdgeKey),p=>riverIds.has(p.riverId),'river');
 assertUnrelated(previous.pois.pois,next.pois.pois,p=>p.poiId,p=>poiIds.has(p.poiId),'POI');
 assertUnrelated(previous.roads.roads,next.roads.roads,r=>pair(r.roadId,r.sourceRoadSegmentKey),r=>roadIds.has(r.roadId),'road');
 assertUnrelated(previous.roads.crossings,next.roads.crossings,c=>c.key,c=>roadIds.has(c.roadId),'crossing');
 return {riverIds,roadIds,poiIds};
}
function changes(previous:GeometryRefinement|undefined,next:GeometryRefinement):GeometryPlanChanges {
 const modified=<T>(a:readonly T[],b:readonly T[],key:(v:T)=>string,id:(v:T)=>string|number)=>{const old=new Map(a.map(v=>[key(v),v]));return [...new Set(b.filter(v=>!equality(old.get(key(v)),v)).map(id))];};
 return Object.freeze({riverIds:Object.freeze(modified(previous?.riverPlan.paths??[],next.riverPlan.paths,p=>pair(p.riverId,p.sourceEdgeKey),p=>p.riverId) as number[]),poiIds:Object.freeze(next.pois.pois.filter(p=>dist(p.oldAnchor,p.newAnchor)>EPS||!equality(previous?.pois.pois.find(o=>o.poiId===p.poiId),p)).map(p=>p.poiId)),roadIds:Object.freeze(modified(previous?.roads.roads??[],next.roads.roads,r=>pair(r.roadId,r.sourceRoadSegmentKey),r=>r.roadId) as number[]),crossingKeys:Object.freeze(modified(previous?.roads.crossings??[],next.roads.crossings,c=>c.key,c=>c.key) as string[])});
}

/** One candidate contains all dependent geometry and its authored source. An
 * existing refined state is unwrapped before preparation; its detailed output
 * must never become the next operation's authored geometry by accident. */
export function prepareGeometryPlan(input:GeometryPlanInput){
 const error=(stage:string,refs:readonly string[]):GeometryPlanError=>Object.freeze({status:'error',code:'geometry_conflict',stage,refs:Object.freeze([...refs]),completeGeometryPlan:false,readyForApplication:false});
 try {
  const accepted=input.map.physicalGrid,previous=accepted?.version===4?accepted.geometryRefinement:undefined;
  if(input.cancelled?.())return error('source',['prepare_cancelled']);
  const authored=input.authoredState??accepted?.globalAuthoredState??previous?.sourceState??accepted;
  if(authored&&authored.version!==3)return error('source',['authored_physical3_required']);
  const sourceState=authored?parseDetail1StateV11(authored):undefined;
  const map=sourceState?{...input.map,physicalGrid:sourceState}:input.map;
  const seed='riverInput'in input?input.riverInput.seed:input.seed;integer(seed,'world seed');
  if(previous&&sourceState){
   const current=refinementInputFingerprint({...input,map,riverPlan:previous.riverPlan,lockedPoiIds:input.lockedPoiIds??new Set(previous.lockedPoiIds)},sourceState);
   if(current===previous.sourceFingerprint){if(input.expectedSourceFingerprint!==undefined&&input.expectedSourceFingerprint!==current)return error('fingerprint',['stale_source_fingerprint']);return Object.freeze({status:'unchanged' as const,candidateState:accepted!,geometryRefinement:previous,sourceFingerprint:current,completeGeometryPlan:true as const,readyForApplication:false as const});}
  }
  if(!input.map.rivers.length&&!previous)return Object.freeze({status:'unchanged' as const,...(accepted?{candidateState:accepted}:{}),completeGeometryPlan:true as const,readyForApplication:false as const});
  const prepared='riverInput'in input?prepareRefinementGeographyFromSource({...input,map,lockedPoiIds:input.lockedPoiIds??(previous?new Set(previous.lockedPoiIds):undefined)}):prepareRefinementGeographyPreview({...input,map,lockedPoiIds:input.lockedPoiIds??(previous?new Set(previous.lockedPoiIds):undefined)});
  if(prepared.status!=='prepared')return Object.freeze({...prepared,code:'geometry_conflict' as const,completeGeometryPlan:false as const,readyForApplication:false as const});
  const source=prepared.candidateState,origin=source.grid.origin,sourceSegments=new Map(prepared.rivers.source.segments.map(s=>[pair(s.riverId,s.edgeKey),s]));
  const sideChoices=prepared.rivers.paths.flatMap(p=>p.steps.map((_,stepIndex)=>{const actual=chosenSide(sourceSegments.get(pair(p.riverId,p.sourceEdgeKey))!,p.points[stepIndex],p.points[stepIndex+1],origin),preferredSide=refinementPreferredSide(seed,p.riverId,p.sourceEdgeKey,actual.cell);return {riverId:p.riverId,sourceEdgeKey:p.sourceEdgeKey,stepIndex,cell:actual.cell,preferredSide,chosenSide:actual.side,constraintFallback:actual.side!==null&&actual.side!==preferredSide};}));
  const refinement=parseGeometryRefinement({version:1,algorithmVersion:'geo2-v1',sourceFingerprint:prepared.sourceFingerprint,sourceState:source,riverPlan:prepared.rivers,pois:prepared.pois,roads:prepared.roads,unresolved:prepared.unresolved,lockedPoiIds:[...(input.lockedPoiIds??previous?.lockedPoiIds??[])].sort(),sideChoices},parseDetail1StateV11);
  if(previous)dependencyClosure(previous,refinement);
  const candidateState=parseDetail1StateV11({...source,version:4,poiFootprints:prepared.footprints,geometryRefinement:refinement,...(accepted?{viewStep:accepted.viewStep,fineCellEdits:accepted.fineCellEdits,...(accepted.selectedCell?{selectedCell:accepted.selectedCell}:{}),...(accepted.selectedWorldPoint?{selectedWorldPoint:accepted.selectedWorldPoint}:{})}:{})});
  return Object.freeze({status:'prepared' as const,candidateState,geometryRefinement:candidateState.geometryRefinement!,changes:changes(previous,refinement),sourceFingerprint:prepared.sourceFingerprint,workBudget:prepared.workBudget,bootstrap:prepared.bootstrap,completeGeometryPlan:true as const,readyForApplication:true as const});
 }catch(e){return error('validation',[e instanceof Error?e.message:'invalid_geometry_plan']);}
}
export const createGeometryPlan=prepareGeometryPlan;
