/** KNC-1.0 domain adapter. No book corpus, geometry mutation, ambient RNG or UI.
 * Source text is supplied by a separately approved/private catalog package. */
import {drawTagIndex} from './engine.ts';
import policy from './knavePolicy.json' with {type:'json'};
export const KNAVE_CATALOG_VERSION='knave2.ru.torbin1.0.knc1.0-draft1';
export const KNAVE_SOURCE_ID='KNAVE2-RU-1.0';
export const KNAVE_SOURCE_SHA='30cf89b9547fd0f76a56f4bcd0ab2dd0303b6be02c00500b37050ad4c71b8795';
export type KnaveTable='locations'|'structures'|'place_traits'|'dungeons';
type PrimaryTable=Exclude<KnaveTable,'place_traits'>;
export type KnaveReference={printedPage:number;resolution:'unresolved_source_reference'};
export type KnaveEntry={row:number;printedResult:string;ru:string;sourceRef:{pdfPage:number;printedPage:number;table:KnaveTable;row:number};references:KnaveReference[]};
export type KnaveCatalog={schemaVersion:1;catalogVersion:typeof KNAVE_CATALOG_VERSION;sourceId:typeof KNAVE_SOURCE_ID;source:{sha256:string};tables:Record<KnaveTable,KnaveEntry[]>};
export type KnaveFacts={owner:string;kind:'land'|'settlement'|'water';dry:boolean;height:1|2|3|null;forest:boolean;wetland:boolean;sand:boolean;coldIce:boolean;river:boolean;riverStart:boolean;rapids:boolean;waterfall:boolean;waterContact:boolean;road:boolean;roadJunction:boolean;crossings:readonly ('bridge'|'ford'|'ferry')[]};
type Site={selection:'compatible_pool';table:PrimaryTable;sourceRow:number;ru:string;references:KnaveReference[];representation:string};
type Trait={selection:'d100';roll:number;sourceRow:number;ru:string;references:KnaveReference[]};
export type KnavePoiContent={catalogVersion:typeof KNAVE_CATALOG_VERSION;sourceId:typeof KNAVE_SOURCE_ID;category:'natural'|'structure'|'dungeon'|'settlement'|'water';site:Site|null;trait:Trait};
export type KnaveContentState={schemaVersion:1;byPoi:Record<string,KnavePoiContent>;rollCounters:Record<string,{category:number;primary:number;trait:number}>};
export const emptyKnaveContent=():KnaveContentState=>({schemaVersion:1,byPoi:{},rollCounters:{}});
const fail=():never=>{throw Error('Invalid Knave content');};
const own=(o:object,k:string)=>Object.prototype.hasOwnProperty.call(o,k);
const obj=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.prototype.toString.call(x)==='[object Object]';
const keys=(x:Record<string,unknown>,names:readonly string[])=>Object.keys(x).length===names.length&&names.every(n=>own(x,n));
const integer=(x:unknown,min=1,max=Number.MAX_SAFE_INTEGER):x is number=>Number.isSafeInteger(x)&&(x as number)>=min&&(x as number)<=max;
const text=(x:unknown):x is string=>typeof x==='string'&&x.trim()===x&&x.length>0&&[...x].length<=256;
const owner=(s:string)=>{const m=/^(?:poi:([1-9]\d*):|waterPoi:)(-?\d+),(-?\d+)$/.exec(s);return !!m&&(!m[1]||integer(Number(m[1])))&&[m[2],m[3]].every(n=>Number.isSafeInteger(Number(n))&&String(Number(n))===n);};
const refs=(x:unknown):x is KnaveReference[]=>Array.isArray(x)&&x.length<=8&&x.every(v=>obj(v)&&keys(v,['printedPage','resolution'])&&integer(v.printedPage,1,1000)&&v.resolution==='unresolved_source_reference');
const tables:KnaveTable[]=['locations','structures','place_traits','dungeons'];
/** Catalog row metadata may include bbox/normalization evidence; snapshots use
 * only these bounded contract fields. Unknown versions never become fallbacks. */
export function validateKnaveCatalog(value:unknown):asserts value is KnaveCatalog {
  if(!obj(value)||value.schemaVersion!==1||value.catalogVersion!==KNAVE_CATALOG_VERSION||value.sourceId!==KNAVE_SOURCE_ID||!obj(value.source)||value.source.sha256!==KNAVE_SOURCE_SHA||!obj(value.tables)||!keys(value.tables,tables))fail();
  const c=value as unknown as KnaveCatalog;
  for(const table of tables){const entries=c.tables[table];if(!Array.isArray(entries)||entries.length!==100)fail();
    for(let i=0;i<100;i++){const e=entries[i],printed=table==='locations'?10:table==='dungeons'?16:11,pdf=table==='dungeons'?12:9;
      if(!obj(e)||e.row!==i+1||e.printedResult!==(i===99?'00':String(i+1))||!text(e.ru)||!refs(e.references)||!obj(e.sourceRef)||e.sourceRef.row!==i+1||e.sourceRef.table!==table||e.sourceRef.printedPage!==printed||e.sourceRef.pdfPage!==pdf)fail();
    }
  }
}
export function validateKnaveContent(value:unknown,live:ReadonlySet<string>):asserts value is KnaveContentState {
  if(!obj(value)||!keys(value,['schemaVersion','byPoi','rollCounters'])||value.schemaVersion!==1||!obj(value.byPoi)||!obj(value.rollCounters))fail();
  const state=value as unknown as KnaveContentState;
  if(Object.keys(state.byPoi).length!==Object.keys(state.rollCounters).length)fail();
  for(const [key,c]of Object.entries(state.byPoi)){
    if(!owner(key)||!live.has(key)||!obj(c)||!keys(c,['catalogVersion','sourceId','category','site','trait'])||c.catalogVersion!==KNAVE_CATALOG_VERSION||c.sourceId!==KNAVE_SOURCE_ID||!['natural','structure','dungeon','settlement','water'].includes(c.category))fail();
    if(key.startsWith('waterPoi:')!==(c.category==='water'))fail();
    const t=c.trait;
    if(!obj(t)||!keys(t,['selection','roll','sourceRow','ru','references'])||t.selection!=='d100'||!integer(t.roll,1,100)||t.sourceRow!==t.roll||!text(t.ru)||!refs(t.references))fail();
    const site=c.site,primary=['natural','structure','dungeon'].includes(c.category);
    if(primary){const table=c.category==='natural'?'locations':c.category==='structure'?'structures':'dungeons';
      if(!obj(site)||!keys(site,['selection','table','sourceRow','ru','references','representation'])||site.selection!=='compatible_pool'||site.table!==table||!integer(site.sourceRow,1,100)||!text(site.ru)||!refs(site.references))fail();
      const accepted=site as Site,rule=policy.rows.find(r=>r.table===table&&r.sourceRow===accepted.sourceRow);
      if(!rule||rule.status!=='eligible'||rule.poiKind!==accepted.representation)fail();
    }else if(site!==null)fail();
    const counter=state.rollCounters[key];
    if(!obj(counter)||!keys(counter,['category','primary','trait'])||!integer(counter.trait)||!integer(counter.category,primary?1:0)||!integer(counter.primary,primary?1:0)||(!primary&&(counter.category!==0||counter.primary!==0)))fail();
  }
  if(Object.keys(state.rollCounters).some(k=>!own(state.byPoi,k)))fail();
}
function matches(predicate:string,f:KnaveFacts):boolean {
  switch(predicate){
    case'any_dry':return f.dry;case'elevated':return f.height!==null&&f.height>=2;case'hill':return f.height===2;case'mountain':return f.height===3;
    case'forest':return f.forest;case'wetland':return f.wetland;case'sand':return f.sand;case'cold_ice':return f.coldIce;
    case'river_contact':return f.river;case'river_start':return f.riverStart;case'river_rapids':return f.rapids;case'river_waterfall':return f.waterfall;
    case'water_contact':return f.waterContact;case'road_contact':return f.road;case'road_junction':return f.roadJunction;
    case'crossing_any':return f.crossings.length>0;case'crossing_bridge':return f.crossings.includes('bridge');case'crossing_ford':return f.crossings.includes('ford');case'crossing_ferry':return f.crossings.includes('ferry');
    default:throw Error('Unknown Knave compatibility predicate');
  }
}
export function knaveCompatibleRows(table:PrimaryTable,facts:KnaveFacts):number[] {
  if(facts.kind!=='land'||!facts.dry)return [];
  return policy.rows.filter(r=>r.table===table&&r.status==='eligible'&&r.requiresAll?.every(p=>p==='dry_hex'?facts.dry:matches(p,facts))).map(r=>r.sourceRow);
}

function validateFacts(f:KnaveFacts):void {
  if(!owner(f.owner)||!['land','settlement','water'].includes(f.kind)||f.owner.startsWith('waterPoi:')!==(f.kind==='water')||f.kind!=='water'&&!f.dry||f.kind==='water'&&f.dry
    ||f.height!==null&&![1,2,3].includes(f.height)||!['dry','forest','wetland','sand','coldIce','river','riverStart','rapids','waterfall','waterContact','road','roadJunction'].every(k=>typeof f[k as keyof KnaveFacts]==='boolean')
    ||!Array.isArray(f.crossings)||new Set(f.crossings).size!==f.crossings.length||f.crossings.some(k=>!['bridge','ford','ferry'].includes(k)))fail();
}
/** Only missing live owners are filled. Existing snapshots/text/counters are
 * immutable, regardless of catalog text changes or the requested target order. */
export function fillKnaveContent(state:KnaveContentState,catalog:KnaveCatalog,facts:readonly KnaveFacts[],seed:number,preservedOwners?:ReadonlySet<string>):KnaveContentState {
  validateKnaveCatalog(catalog);
  const live=new Set(facts.map(f=>f.owner));if(live.size!==facts.length)fail();
  for(const f of facts)validateFacts(f);
  validateKnaveContent(state,live);
  const pending=facts.filter(f=>!own(state.byPoi,f.owner)&&!preservedOwners?.has(f.owner)).sort((a,b)=>a.owner<b.owner?-1:a.owner>b.owner?1:0);
  if(!pending.length)return state;
  const next=structuredClone(state);
  for(const f of pending){let counter={category:0,primary:0,trait:0},category:KnavePoiContent['category']=f.kind==='water'?'water':'settlement',site:Site|null=null;
    if(f.kind==='land'){
      const pools=([['natural','locations'],['structure','structures'],['dungeon','dungeons']]as const).map(([category,table])=>({category,table,rows:knaveCompatibleRows(table,f)})).filter(p=>p.rows.length>0);
      if(!pools.length)throw Error('Empty Knave compatible pools');
      const categoryDraw=drawTagIndex(seed,`knave-content-v1:${f.owner}:category`,counter.category,pools.length);counter.category=categoryDraw.nextCounter;
      const pool=pools[categoryDraw.index];category=pool.category;
      const primaryDraw=drawTagIndex(seed,`knave-content-v1:${f.owner}:primary`,counter.primary,pool.rows.length);counter.primary=primaryDraw.nextCounter;
      const row=pool.rows[primaryDraw.index],entry=catalog.tables[pool.table][row-1],rule=policy.rows.find(r=>r.table===pool.table&&r.sourceRow===row)!;
      site={selection:'compatible_pool',table:pool.table,sourceRow:row,ru:entry.ru,references:structuredClone(entry.references),representation:rule.poiKind!};
    }
    const traitDraw=drawTagIndex(seed,`knave-content-v1:${f.owner}:trait`,counter.trait,100);counter.trait=traitDraw.nextCounter;
    const roll=traitDraw.index+1,entry=catalog.tables.place_traits[traitDraw.index];
    next.byPoi[f.owner]={catalogVersion:KNAVE_CATALOG_VERSION,sourceId:KNAVE_SOURCE_ID,category,site,trait:{selection:'d100',roll,sourceRow:roll,ru:entry.ru,references:structuredClone(entry.references)}};
    next.rollCounters[f.owner]=counter;
  }
  validateKnaveContent(next,live);return next;
}

/** Reuse the accepted stream/counter contract. A primary is a draw from the
 * current compatible pool, never a claim that its source row was rolled d100. */
export function rerollKnaveContent(state:KnaveContentState,catalog:KnaveCatalog,facts:KnaveFacts,seed:number,part:'primary'|'trait'|'both'):KnaveContentState {
  validateKnaveCatalog(catalog);
  validateFacts(facts);
  const live=new Set(Object.keys(state.byPoi));validateKnaveContent(state,live);
  const current=state.byPoi[facts.owner];
  if(!current||!['primary','trait','both'].includes(part))fail();
  // A changed map can make a literal accepted site incompatible. Refuse an
  // empty current pool atomically; traits remain independently rerollable.
  const rows=part!=='trait'&&current.site?knaveCompatibleRows(current.site.table,facts):null;
  if(part!=='trait'&&(!current.site||!rows?.length))throw Error('Empty Knave compatible pool');
  const next=structuredClone(state),content=next.byPoi[facts.owner],counter=next.rollCounters[facts.owner];
  if(rows&&content.site){
    const draw=drawTagIndex(seed,`knave-content-v1:${facts.owner}:primary`,counter.primary,rows.length),row=rows[draw.index];
    const entry=catalog.tables[content.site.table][row-1],rule=policy.rows.find(r=>r.table===content.site!.table&&r.sourceRow===row)!;
    content.site={selection:'compatible_pool',table:content.site.table,sourceRow:row,ru:entry.ru,references:structuredClone(entry.references),representation:rule.poiKind!};counter.primary=draw.nextCounter;
  }
  if(part!=='primary'){
    const draw=drawTagIndex(seed,`knave-content-v1:${facts.owner}:trait`,counter.trait,100),entry=catalog.tables.place_traits[draw.index],roll=draw.index+1;
    content.trait={selection:'d100',roll,sourceRow:roll,ru:entry.ru,references:structuredClone(entry.references)};counter.trait=draw.nextCounter;
  }
  validateKnaveContent(next,live);return next;
}
