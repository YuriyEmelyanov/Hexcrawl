import data from './pf2FeatureData.json' with {type:'json'};
import {drawTagIndex} from './engine.ts';
import {physicalUnitCenter,physicalUnitWidth,type PhysicalUnit} from '../physicalUnit.ts';
import type {DetailCell} from '../detailGrid.ts';

export type FeatureCategory='landmark'|'secret'|'resource'|'standard';
export type FeatureContext='forest'|'mountain'|'deadwood'|'swamp'|'desert'|'plains'|'aquatic';
type Text={ru:string;en:string};
export type FeatureSeed={id:string;context:string;category:string;title:Text;description:Text;authorship:string;basis:string;source_context_ref:string;source_url:string;creates_geography:boolean;mechanical_stats:null};
export type UnitRecord={q:number;r:number;outcome:number;category:FeatureCategory;context:FeatureContext;featureId:number|null;disposition:'active'|'standard'|'removed'};
export type PreparedFeature={id:number;unitKey:string;worldAnchor:{x:number;y:number};category:Exclude<FeatureCategory,'standard'>;context:FeatureContext;template:FeatureSeed;nameOverride?:string;descriptionOverride?:string;discoveryOverride?:'obvious'|'passage'|'search'};
export type FeaturePreparation={schemaVersion:1;profileId:'pf2-gmc-feature-v1';catalogVersion:string;physicalUnit:PhysicalUnit;coordinateBasis:'known'|'project_assumption';nextFeatureId:number;units:Record<string,UnitRecord>;features:Record<string,PreparedFeature>};
export type FeatureCandidate=DetailCell&{context:FeatureContext;protected:boolean};
export const pf2FeatureCatalog:readonly FeatureSeed[]=data.entries as FeatureSeed[];
const contexts=new Set<FeatureContext>(['forest','mountain','deadwood','swamp','desert','plains','aquatic']);
const key=(c:DetailCell)=>`${c.q},${c.r}`;
const safe=(n:number)=>Number.isSafeInteger(n)&&n>=1;
const own=(v:object,k:string)=>Object.prototype.hasOwnProperty.call(v,k);
const categories=['landmark','secret','resource','standard'] as const;
export function featureCategory(outcome:number):FeatureCategory {
 if(!Number.isInteger(outcome)||outcome<1||outcome>20)throw Error('Invalid PF2 outcome');
 return outcome<=3?'landmark':outcome<=6?'secret':outcome<=9?'resource':'standard';
}
export function featureContext(biome:string,water:'land'|'lake'|'sea'):FeatureContext {
 if(!['land','lake','sea'].includes(water))throw Error('Invalid PF2 water context');
 if(water!=='land')return 'aquatic';
 for(const [context,biomes]of Object.entries(data.contexts))if(biomes.includes(biome))return context as FeatureContext;
 throw Error('Unsupported PF2 environment');
}
export function emptyFeaturePreparation(origin={x:0,y:0},coordinateBasis:'known'|'project_assumption'='project_assumption'):FeaturePreparation {
 const state:FeaturePreparation={schemaVersion:1,profileId:'pf2-gmc-feature-v1',catalogVersion:data.version,physicalUnit:{length:12,unit:'mile',measurement:'opposite_vertices',orientation:'pointy',origin:{...origin}},coordinateBasis,nextFeatureId:1,units:{},features:{}};
 validateFeaturePreparation(state);return state;
}
function plain(value:unknown,label:string,required:string[],optional:string[]=[]):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error(`Invalid ${label}`);
 const obj=value as Record<string,unknown>;
 if(required.some(k=>!own(obj,k))||Object.keys(obj).some(k=>!required.includes(k)&&!optional.includes(k)))throw Error(`Unknown ${label} fields`);return obj;
}
function text(value:unknown,max:number){if(typeof value!=='string'||value.length>max)throw Error('Invalid PF2 text');}
function assertCell(c:DetailCell){if(!Number.isSafeInteger(c.q)||!Number.isSafeInteger(c.r)||Object.is(c.q,-0)||Object.is(c.r,-0))throw Error('Invalid PF2 cell');}
/** Detached validator; App will additionally assert live-territory references
 * before v13 import. It never rewrites accepted snapshots from today's catalog. */
export function validateFeaturePreparation(input:unknown):asserts input is FeaturePreparation {
 const s=plain(input,'PF2 preparation',['schemaVersion','profileId','catalogVersion','physicalUnit','coordinateBasis','nextFeatureId','units','features']);
 if(s.schemaVersion!==1||s.profileId!=='pf2-gmc-feature-v1'||s.catalogVersion!==data.version||!['known','project_assumption'].includes(s.coordinateBasis as string)||!safe(s.nextFeatureId as number))throw Error('Invalid PF2 header');
 const u=plain(s.physicalUnit,'PF2 unit',['length','unit','measurement','orientation','origin']);plain(u.origin,'PF2 origin',['x','y']);
 physicalUnitWidth(s.physicalUnit as PhysicalUnit);
 if(u.length!==12||u.measurement!=='opposite_vertices')throw Error('Invalid PF2 convention');
 if(!s.units||typeof s.units!=='object'||Array.isArray(s.units)||!s.features||typeof s.features!=='object'||Array.isArray(s.features))throw Error('Invalid PF2 records');
 const state=input as FeaturePreparation,ids=new Set<number>();
 for(const [k,raw]of Object.entries(state.units)){
  plain(raw,'PF2 unit record',['q','r','outcome','category','context','featureId','disposition']);assertCell(raw);
  if(k!==key(raw)||featureCategory(raw.outcome)!==raw.category||!contexts.has(raw.context)||!['active','standard','removed'].includes(raw.disposition))throw Error('Invalid PF2 unit record');
  physicalUnitCenter(state.physicalUnit,raw);
  if(raw.disposition==='active'){
   if(raw.category==='standard'||!safe(raw.featureId!)||ids.has(raw.featureId!))throw Error('Invalid PF2 identity');ids.add(raw.featureId!);
   const f=state.features[String(raw.featureId)];if(!f||f.unitKey!==k)throw Error('Missing PF2 feature');
  }else if(raw.featureId!==null||(raw.disposition==='standard')!==(raw.category==='standard'))throw Error('Invalid PF2 disposition');
 }
 for(const [id,raw]of Object.entries(state.features)){
  plain(raw,'PF2 feature',['id','unitKey','worldAnchor','category','context','template'],['nameOverride','descriptionOverride','discoveryOverride']);
  if(!safe(raw.id)||id!==String(raw.id)||raw.id>=state.nextFeatureId||!ids.has(raw.id))throw Error('Orphan PF2 feature');
  const unit=state.units[raw.unitKey];if(!unit||unit.featureId!==raw.id||unit.context!==raw.context||unit.category!==raw.category||!categories.includes(raw.category)||raw.category as string==='standard')throw Error('Invalid PF2 feature owner');
  plain(raw.worldAnchor,'PF2 anchor',['x','y']);const p=physicalUnitCenter(state.physicalUnit,unit);if(raw.worldAnchor.x!==p.x||raw.worldAnchor.y!==p.y)throw Error('Invalid PF2 anchor');
  const t=plain(raw.template,'PF2 snapshot',['id','context','category','title','description','authorship','basis','source_context_ref','source_url','creates_geography','mechanical_stats']);
  const declared=pf2FeatureCatalog.find(e=>e.id===t.id);
  if(!declared||['context','category','authorship','basis','source_context_ref','source_url','creates_geography','mechanical_stats'].some(k=>(declared as unknown as Record<string,unknown>)[k]!==t[k]))throw Error('Forged PF2 source');
  if(t.category!==raw.category||![raw.context,raw.context==='aquatic'?'aquatic':'land'].includes(t.context as FeatureContext)||t.authorship!=='project_authored_seed_not_book_quotation'||t.creates_geography!==false||t.mechanical_stats!==null)throw Error('Invalid PF2 snapshot');
  for(const field of ['id','context','basis','source_context_ref','source_url'])text(t[field],512);
  for(const field of ['title','description']){const tx=plain(t[field],'PF2 bilingual text',['ru','en']);text(tx.ru,field==='title'?200:20000);text(tx.en,field==='title'?200:20000);}
  if(raw.nameOverride!==undefined)text(raw.nameOverride,200);if(raw.descriptionOverride!==undefined)text(raw.descriptionOverride,20000);
  if(raw.discoveryOverride!==undefined&&!['obvious','passage','search'].includes(raw.discoveryOverride))throw Error('Invalid PF2 discovery');
 }
}
/** Pure all-or-nothing batch. No callback, UI effect, global stream or ID write
 * occurs here. Caller supplies the live-territory/protected candidate set. */
export function fillFeaturePreparation(input:FeaturePreparation,candidates:readonly FeatureCandidate[],seed:number):FeaturePreparation {
 validateFeaturePreparation(input);
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('Invalid PF2 seed');
 const seen=new Set<string>();
 for(const c of candidates){plain(c,'PF2 candidate',['q','r','context','protected']);assertCell(c);physicalUnitCenter(input.physicalUnit,c);if(!contexts.has(c.context)||typeof c.protected!=='boolean'||seen.has(key(c)))throw Error('Invalid PF2 candidate');seen.add(key(c));}
 const available=candidates.filter(c=>!c.protected&&!own(input.units,key(c))).sort((a,b)=>a.q-b.q||a.r-b.r);
 if(!available.length)return input;
 const next=structuredClone(input);
 for(const c of available){
  const k=key(c),outcome=drawTagIndex(seed,`pf2-feature:v1:unit:${k}:category`,0,20).index+1,category=featureCategory(outcome);
  const unit:UnitRecord={q:c.q,r:c.r,outcome,category,context:c.context,featureId:null,disposition:'standard'};
  if(category!=='standard'){
   const pool=pf2FeatureCatalog.filter(t=>t.category===category&&[c.context,c.context==='aquatic'?'aquatic':'land'].includes(t.context as FeatureContext));
   if(!pool.length)throw Error('Missing PF2 content');if(next.nextFeatureId===Number.MAX_SAFE_INTEGER)throw Error('PF2 identity exhausted');
   const snapshot=pool[drawTagIndex(seed,`pf2-feature:v1:unit:${k}:template`,0,pool.length).index],id=next.nextFeatureId++;
   next.features[String(id)]={id,unitKey:k,worldAnchor:physicalUnitCenter(next.physicalUnit,c),category,context:c.context,template:structuredClone(snapshot)};
   unit.featureId=id;unit.disposition='active';
  }
  next.units[k]=unit;
 }
 validateFeaturePreparation(next);return next;
}
export function editPreparedFeature(input:FeaturePreparation,id:number,patch:{name?:string;description?:string;discovery?:'obvious'|'passage'|'search'}):FeaturePreparation {
 validateFeaturePreparation(input);plain(patch,'PF2 edit',[],['name','description','discovery']);if(!safe(id)||!input.features[String(id)])throw Error('Unknown PF2 feature');
 const next=structuredClone(input),f=next.features[String(id)];
 if(patch.name!==undefined)f.nameOverride=patch.name;if(patch.description!==undefined)f.descriptionOverride=patch.description;if(patch.discovery!==undefined)f.discoveryOverride=patch.discovery;
 validateFeaturePreparation(next);return JSON.stringify(next)===JSON.stringify(input)?input:next;
}
export function removePreparedFeature(input:FeaturePreparation,id:number):FeaturePreparation {
 validateFeaturePreparation(input);const f=input.features[String(id)];if(!safe(id)||!f)throw Error('Unknown PF2 feature');const next=structuredClone(input);delete next.features[String(id)];next.units[f.unitKey]={...next.units[f.unitKey],featureId:null,disposition:'removed'};validateFeaturePreparation(next);return next;
}
