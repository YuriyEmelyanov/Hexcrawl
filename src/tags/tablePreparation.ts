/** TABLES1 detached preparation contract. App/history/save-v12 activation is
 * deliberately separate: these commands never mutate geometry or world RNG. */
import {drawTagIndex} from './engine.ts';
import {emptyKnaveContent,fillKnaveContent,KNAVE_CATALOG_VERSION,KNAVE_SOURCE_ID,knaveResultText,validateKnaveCatalog,validateKnaveContent,knaveCompatibleRows,type KnaveCatalog,type KnaveContentState,type KnaveFacts,type KnaveTable,type KnavePoiContent,type KnaveReference} from './knave.ts';
export type TableSnapshot={table:KnaveTable;sourceRow:number;printedResult:string;ru:string;en?:string;sourceRef:{pdfPage:number;printedPage:number;table:KnaveTable;row:number};references:KnaveReference[]};
export type TableCall=TableSnapshot&{id:number;selection:'manual'|'d100'|'legacy_compatible_pool';rollCounter:number;rollValue?:number;parentId?:number;edgeId?:string;nextEntry?:TableSnapshot&{policy:'confirmed_next_entry'};legacySelection?:{role:'primary'|'trait';representation?:string}};
export type PreparedPlace={catalogVersion:typeof KNAVE_CATALOG_VERSION;sourceId:typeof KNAVE_SOURCE_ID;category:KnavePoiContent['category'];calls:TableCall[];description:string;migrationMeta?:{categoryCounter:number}};
export type PreparationState={schemaVersion:2;nextCallId:number;byPoi:Record<string,PreparedPlace>};
export type PreparationInput=KnaveContentState|PreparationState|undefined;
export type TableChoice={kind:'manual';row:number}|{kind:'roll'};
export type PreparationContext={catalog:KnaveCatalog;live:ReadonlySet<string>;seed:number;categories?:Readonly<Record<string,PreparedPlace['category']>>;facts?:Readonly<Record<string,KnaveFacts>>};
export type PreparationCommand=
 |{kind:'add';owner:string;table:KnaveTable;choice:TableChoice}
 |{kind:'replace';owner:string;id:number;table:KnaveTable;choice:TableChoice;confirmDependents?:boolean}
 |{kind:'reroll';owner:string;id:number;confirmDependents?:boolean}
 |{kind:'link';owner:string;id:number;choice:TableChoice}
 |{kind:'nextEntry';owner:string;id:number}
 |{kind:'remove';owner:string;id:number;confirmDependents?:boolean}
 |{kind:'description';owner:string;value:string};
export class PreparationError extends Error {readonly code:string;constructor(code:string){super(code);this.code=code;this.name='PreparationError';}}
function fail(code:string):never {throw new PreparationError(code);}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const hasOwn=(v:object,k:PropertyKey)=>Object.prototype.hasOwnProperty.call(v,k);
const keys=(v:Record<string,unknown>,required:string[],optional:string[]=[])=>required.every(k=>hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const table=(v:unknown):v is KnaveTable=>['locations','structures','place_traits','dungeons'].includes(v as string);
const owner=(v:string)=>{const m=/^(?:poi:([1-9]\d*):|waterPoi:)(-?\d+),(-?\d+)$/.exec(v);return !!m&&(!m[1]||integer(Number(m[1]),1))&&[m[2],m[3]].every(n=>Number.isSafeInteger(Number(n))&&String(Number(n))===n);};
const text=(v:unknown,max=256)=>typeof v==='string'&&v.length>0&&[...v].length<=max&&v===v.trim();
export function preparationLink(snapshot:Pick<TableSnapshot,'table'|'sourceRow'>):{id:string;target:KnaveTable}|undefined {
 const target=snapshot.table==='structures'&&snapshot.sourceRow===27?'dungeons':snapshot.table==='dungeons'&&snapshot.sourceRow===84?'structures':undefined;
 return target?{id:`${snapshot.table}:${snapshot.sourceRow}->${target}`,target}:undefined;
}
const snapshotKeys=['table','sourceRow','printedResult','ru','sourceRef','references'];
function validateSnapshot(s:unknown):void {
 if(!object(s)||!table(s.table)||!integer(s.sourceRow,1,100)||s.printedResult!==(s.sourceRow===100?'00':String(s.sourceRow))||!text(s.ru)||(hasOwn(s,'en')&&!text(s.en)))fail('snapshot');
 const r=s.sourceRef,pdf=s.table==='dungeons'?12:9,printed=s.table==='locations'?10:s.table==='dungeons'?16:11;
 if(!object(r)||!keys(r,['pdfPage','printedPage','table','row'])||r.pdfPage!==pdf||r.printedPage!==printed||r.table!==s.table||r.row!==s.sourceRow)fail('source_locator');
 if(!Array.isArray(s.references)||s.references.length>8||s.references.some(r=>!object(r)||!keys(r,['printedPage','resolution'])||!integer(r.printedPage,1,1000)||r.resolution!=='unresolved_source_reference'))fail('references');
}
/** Strict imported detached value, not an assertion that every literal snapshot
 * has been freshly rechecked against a later catalog/translation version. */
export function validatePreparation(value:unknown,live:ReadonlySet<string>):asserts value is PreparationState {
 if(!object(value)||!keys(value,['schemaVersion','nextCallId','byPoi'])||value.schemaVersion!==2||!integer(value.nextCallId,1)||!object(value.byPoi))fail('state');
 const ids=new Set<number>();
 for(const [key,p]of Object.entries(value.byPoi)){
  if(!owner(key)||!live.has(key)||!object(p)||!keys(p,['catalogVersion','sourceId','category','calls','description'],['migrationMeta'])||p.catalogVersion!==KNAVE_CATALOG_VERSION||p.sourceId!==KNAVE_SOURCE_ID||!['natural','structure','dungeon','settlement','water'].includes(p.category as string)||key.startsWith('waterPoi:')!==(p.category==='water')||typeof p.description!=='string'||p.description.length>20000||!Array.isArray(p.calls))fail('place');
  if(hasOwn(p,'migrationMeta')&&(!object(p.migrationMeta)||!keys(p.migrationMeta,['categoryCounter'])||!integer(p.migrationMeta.categoryCounter)))fail('migration_meta');
  const local=new Map<number,TableCall>();
  for(const c of p.calls){
   if(!object(c)||!keys(c,[...snapshotKeys,'id','selection','rollCounter'],['en','rollValue','parentId','edgeId','nextEntry','legacySelection']))fail('call');
   validateSnapshot(c);
   if(!integer(c.id,1)||c.id>=value.nextCallId||ids.has(c.id)||!integer(c.rollCounter)||!['manual','d100','legacy_compatible_pool'].includes(c.selection as string))fail('call_identity');
   if((c.selection!=='manual'&&!integer(c.rollCounter,1))||(hasOwn(c,'parentId')&&!integer(c.parentId,1))||(c.selection==='d100'?c.rollValue!==c.sourceRow:hasOwn(c,'rollValue')))fail('roll_value');
   if(hasOwn(c,'legacySelection')){const m=c.legacySelection;if(!object(m)||!keys(m,['role'],['representation'])||!['primary','trait'].includes(m.role as string)||hasOwn(m,'representation')&&!text(m.representation))fail('legacy_selection');}
   if(c.selection==='legacy_compatible_pool'&&(c.table==='place_traits'||!object(c.legacySelection)||c.legacySelection.role!=='primary'))fail('legacy_pool');
   if(hasOwn(c,'nextEntry')){if(!object(c.nextEntry)||!keys(c.nextEntry,[...snapshotKeys,'policy'],['en'])||c.nextEntry.policy!=='confirmed_next_entry'||!integer(c.parentId,1)||!Array.isArray(c.references)||!c.references.length||!integer(c.sourceRow,1,99))fail('next_entry');validateSnapshot(c.nextEntry);if(c.nextEntry.table!==c.table||c.nextEntry.sourceRow!==c.sourceRow+1)fail('next_entry');}
   ids.add(c.id);local.set(c.id,c as TableCall);
  }
  const parentIds=new Set<number>();
  for(const c of local.values()){
   if(c.parentId===undefined){if(hasOwn(c,'edgeId'))fail('root_edge');continue;}
   if(!integer(c.parentId,1)||c.parentId===c.id||parentIds.has(c.parentId))fail('parent');
   const parent=local.get(c.parentId),edge=parent&&preparationLink(parent);
   if(!parent||parent.parentId!==undefined||!edge||c.edgeId!==edge.id||c.table!==edge.target)fail('link');parentIds.add(c.parentId);
  }
 }
}
function snapshot(catalog:KnaveCatalog,t:KnaveTable,row:number):TableSnapshot {
 if(!table(t)||!integer(row,1,100))fail('row');const e=catalog.tables[t][row-1];
 return {table:t,sourceRow:row,printedResult:e.printedResult,ru:e.ru,en:knaveResultText({sourceRow:row,ru:e.ru},t,'en'),sourceRef:{pdfPage:e.sourceRef.pdfPage,printedPage:e.sourceRef.printedPage,table:t,row},references:structuredClone(e.references)};
}
/** Read-only projection; caller may display it without recording migration. */
export function preparationView(input:PreparationInput,catalog:KnaveCatalog,live:ReadonlySet<string>):PreparationState {
 validateKnaveCatalog(catalog);
 if(input?.schemaVersion===2){validatePreparation(input,live);return structuredClone(input);}
 if(input)validateKnaveContent(input,live);
 const next:PreparationState={schemaVersion:2,nextCallId:1,byPoi:{}};
 if(!input)return next;
 for(const key of Object.keys(input.byPoi).sort()){
  const p=input.byPoi[key],counters=input.rollCounters[key],calls:TableCall[]=[];
  if(p.site){const site=p.site;calls.push({...snapshot(catalog,site.table,site.sourceRow),ru:site.ru,en:knaveResultText(site,site.table,'en'),references:structuredClone(site.references),id:next.nextCallId++,selection:'legacy_compatible_pool',rollCounter:counters.primary,legacySelection:{role:'primary',representation:site.representation}});}
  calls.push({...snapshot(catalog,'place_traits',p.trait.sourceRow),ru:p.trait.ru,en:knaveResultText(p.trait,'place_traits','en'),references:structuredClone(p.trait.references),id:next.nextCallId++,selection:'d100',rollCounter:counters.trait,rollValue:p.trait.roll,legacySelection:{role:'trait'}});
  next.byPoi[key]={catalogVersion:p.catalogVersion,sourceId:p.sourceId,category:p.category,calls,description:'',migrationMeta:{categoryCounter:counters.category}};
 }
 validatePreparation(next,live);return next;
}
function choose(ctx:PreparationContext,id:number,counter:number,t:KnaveTable,choice:TableChoice,legacy?:TableCall,ownerKey?:string):{value:TableSnapshot;counter:number;selection:TableCall['selection'];rollValue?:number} {
 if(!object(choice)||!keys(choice,['kind'],choice.kind==='manual'?['row']:[])||!['manual','roll'].includes(choice.kind))fail('choice');
 if(choice.kind==='manual'){if(!integer(choice.row,1,100))fail('row');return {value:snapshot(ctx.catalog,t,choice.row),counter,selection:'manual'};}
 let rows:number[]|undefined;
 if(legacy?.selection==='legacy_compatible_pool'){
  const facts=ownerKey&&ctx.facts?.[ownerKey];if(!facts||facts.owner!==ownerKey||t==='place_traits')fail('facts_required');rows=knaveCompatibleRows(t,facts);if(!rows.length)fail('empty_pool');
 }
 const draw=drawTagIndex(ctx.seed,`knave-tables-v1:call:${id}`,counter,rows?.length??100),row=rows?rows[draw.index]:draw.index+1;
 return {value:snapshot(ctx.catalog,t,row),counter:draw.nextCounter,selection:rows?'legacy_compatible_pool':'d100',...(!rows?{rollValue:row}:{})};
}
/** Commit-ready detached proposal. Errors and no-ops leave the input object,
 * its counter allocation, and the accepted document untouched. */
export function applyPreparation(input:PreparationInput,ctx:PreparationContext,cmd:PreparationCommand):PreparationInput {
 const next=preparationView(input,ctx.catalog,ctx.live);
 if(!owner(cmd.owner)||!ctx.live.has(cmd.owner))fail('owner');
 let p=next.byPoi[cmd.owner];
 if(!p){const category=ctx.categories?.[cmd.owner];if(!category||cmd.owner.startsWith('waterPoi:')!==(category==='water'))fail('category_required');p={catalogVersion:KNAVE_CATALOG_VERSION,sourceId:KNAVE_SOURCE_ID,category,calls:[],description:''};next.byPoi[cmd.owner]=p;}
 const old=structuredClone(p);
 const allocate=()=>{if(!integer(next.nextCallId,1,Number.MAX_SAFE_INTEGER-1))fail('id_overflow');return next.nextCallId++;};
 const make=(id:number,t:KnaveTable,counter:number,choice:TableChoice,legacy?:TableCall):TableCall=>{const d=choose(ctx,id,counter,t,choice,legacy,cmd.owner);return {...d.value,id,selection:d.selection,rollCounter:d.counter,...(d.rollValue===undefined?{}:{rollValue:d.rollValue}),...(d.selection==='legacy_compatible_pool'?{legacySelection:legacy!.legacySelection}: {})};};
 if(cmd.kind==='description'){if(typeof cmd.value!=='string'||cmd.value.length>20000)fail('description');p.description=cmd.value;}
 else if(cmd.kind==='add')p.calls.push(make(allocate(),cmd.table,0,cmd.choice));
 else {
  const call=p.calls.find(c=>c.id===cmd.id);if(!call)fail('missing_call');
  const child=p.calls.find(c=>c.parentId===call.id);
  if(cmd.kind==='link'){
   if(child)return input;
   const edge=preparationLink(call);if(call.parentId!==undefined||!edge)fail('target_unavailable');
   p.calls.push({...make(allocate(),edge.target,0,cmd.choice),parentId:call.id,edgeId:edge.id});
  }else if(cmd.kind==='nextEntry'){
   if(call.nextEntry)return input;if(call.parentId===undefined||!call.references.length||call.sourceRow===100)fail('next_entry_unavailable');
   call.nextEntry={...snapshot(ctx.catalog,call.table,call.sourceRow+1),policy:'confirmed_next_entry'};
  }else if(cmd.kind==='remove'){
   if((child||call.nextEntry)&&!cmd.confirmDependents)fail('dependent_confirmation_required');p.calls=p.calls.filter(c=>c.id!==call.id&&c.parentId!==call.id);
  }else if(cmd.kind==='replace'||cmd.kind==='reroll'){
   if((child||call.nextEntry)&&!cmd.confirmDependents)fail('dependent_confirmation_required');
   const replacement=cmd.kind==='reroll'?make(call.id,call.table,call.rollCounter,{kind:'roll'},call):make(call.id,cmd.table,call.rollCounter,cmd.choice);
   if(call.parentId!==undefined){if(replacement.table!==call.table)fail('linked_table_mismatch');replacement.parentId=call.parentId;replacement.edgeId=call.edgeId;}
   p.calls=p.calls.filter(c=>c.parentId!==call.id).map(c=>c.id===call.id?replacement:c);
  }else fail('command');
 }
 if(JSON.stringify(old)===JSON.stringify(p))return input;
 validatePreparation(next,ctx.live);return next;
}
/** App must apply its existing loss/confirmation gate before retaining owners. */
export function retainPreparation(input:PreparationState,live:ReadonlySet<string>):PreparationState {
 const sourceLive=new Set(Object.keys(input.byPoi));validatePreparation(input,sourceLive);
 const next=structuredClone(input);next.byPoi=Object.fromEntries(Object.entries(next.byPoi).filter(([k])=>live.has(k)));validatePreparation(next,live);return next;
}
export function remapPreparation(input:PreparationState,moves:ReadonlyMap<string,string>,live:ReadonlySet<string>):PreparationState {
 validatePreparation(input,new Set(Object.keys(input.byPoi)));const entries=Object.entries(input.byPoi).map(([k,v])=>[moves.get(k)??k,v]as const);
 if(new Set(entries.map(([k])=>k)).size!==entries.length)fail('owner_collision');const next={...structuredClone(input),byPoi:Object.fromEntries(structuredClone(entries))};validatePreparation(next,live);return next;
}

/** Continue automatic generation after materialization without redrawing accepted
 * calls. Reuse the schema1 algorithm, including its namespaces and pool policy,
 * only for missing, non-preserved owners; then allocate new global IDs.
 * The caller still owns the map transaction and marker changes for new owners. */
export function fillPreparation(state:PreparationState,catalog:KnaveCatalog,facts:readonly KnaveFacts[],seed:number,preservedOwners?:ReadonlySet<string>):PreparationState {
 const live=new Set(facts.map(f=>f.owner));
 validatePreparation(state,live);
 const excluded=new Set([...Object.keys(state.byPoi),...(preservedOwners??[])]);
 // This validates all facts/catalog even when no owners need filling. Existing
 // user-authored snapshots are never revalidated against a current table row.
 const generated=fillKnaveContent(emptyKnaveContent(),catalog,facts,seed,excluded);
 if(!Object.keys(generated.byPoi).length)return state;
 const pending=preparationView(generated,catalog,live),next=structuredClone(state);
 for(const key of Object.keys(pending.byPoi).sort()){
  const place=pending.byPoi[key];
  for(const call of place.calls){
   if(!integer(next.nextCallId,1,Number.MAX_SAFE_INTEGER-1))fail('id_overflow');
   call.id=next.nextCallId++;
  }
  next.byPoi[key]=place;
 }
 validatePreparation(next,live);
 return next;
}
