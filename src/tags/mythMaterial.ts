import type {TagInstance,TagOwner} from './engine.ts';

// Compatibility is deliberately pinned. A later bundle must not silently choose
// the newest edition or replace the meaning of an already published version.
export const MYTH_MATERIAL_EDITION='mythic-bastionland-ru-core-v1' as const;
export const MYTH_MATERIAL_VERSION=1 as const;
export const mythMaterialManifest=Object.freeze([Object.freeze({
 definitionId:'mb.myth' as const,definitionVersion:1 as const,
 sourceEdition:MYTH_MATERIAL_EDITION,materialVersion:MYTH_MATERIAL_VERSION
})]);
export const MYTH_MATERIAL_LIMITS=Object.freeze({blocks:128,stringCodePoints:16384,recordCodePoints:262144});

export type MythMaterialContent={
 readonly omenPreamble?:string;
 readonly omens:readonly {readonly id:string;readonly ordinal:number;readonly text:string}[];
 readonly roles:readonly {readonly id:string;readonly title:string;readonly text:string}[];
 readonly rolePreamble?:string;
 // Empty arrays alone cannot assert that the source has no such section.
 readonly verifiedEmptySections?:readonly ('omens'|'roles')[];
};
export type MythMaterialRecord={
 readonly definitionId:'mb.myth';readonly definitionVersion:1;readonly entryId:string;
 readonly materialVersion:typeof MYTH_MATERIAL_VERSION;readonly sourceEdition:typeof MYTH_MATERIAL_EDITION;
 readonly sourcePage:number;
 readonly locales:{readonly ru:MythMaterialContent;readonly en?:MythMaterialContent};
 readonly references:readonly {readonly type:'resolved'|'unresolved';readonly description:string}[];
};
export type MythMaterialSelection=
 | {status:'absent'}
 | {status:'unavailable';reason:'incompatible-snapshot'|'missing-material'|'incompatible-material'|'incomplete-material'}
 | {status:'error';reason:'invalid-registry'|'duplicate-material'|'invalid-material'|'load-failed'}
 | {status:'ready';record:MythMaterialRecord;content:MythMaterialContent;language:'ru'|'en';fallback:boolean};

const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const positiveInteger=(value:unknown):value is number=>Number.isSafeInteger(value)&&(value as number)>0;

function knownEntry(instance:TagInstance,owner:TagOwner):string|undefined {
 if(owner.kind!=='poi'||instance.owner?.kind!=='poi'||instance.owner.regionId!==owner.regionId||instance.owner.hexKey!==owner.hexKey
  ||instance.definitionId!=='mb.myth'||instance.definitionVersion!==1||instance.resolver!=='product'
  ||!Number.isSafeInteger(instance.revision)||instance.revision<0
  ||!Array.isArray(instance.sides)||instance.sides.length!==2||instance.sides[0]!==6||instance.sides[1]!==12
  ||!Array.isArray(instance.values)||instance.values.length!==2
  ||!Array.isArray(instance.values[0])||instance.values[0].length!==1
  ||!Array.isArray(instance.values[1])||instance.values[1].length!==1)return;
 const group=instance.values[0][0],entry=instance.values[1][0];
 if(!positiveInteger(group)||group>6||!positiveInteger(entry)||entry>12)return;
 const entryId=`mb.myth:${(group-1)*12+entry-1}`;
 if(!Array.isArray(instance.entryIds)||instance.entryIds.length!==1||instance.entryIds[0]!==entryId)return;
 return entryId;
}

// The caller adds document revision and UI language to its transient view key.
// JSON encoding avoids delimiter collisions in owner identity. No name/override
// participates in lookup; revision still resets the view after an authored edit.
export function materialIdentity(instance:TagInstance|undefined,owner:TagOwner,poiType:string):string|undefined {
 if(!instance||poiType!=='myth')return;
 const entryId=knownEntry(instance,owner);if(entryId===undefined||owner.kind!=='poi')return;
 return JSON.stringify([owner.kind,owner.regionId,owner.hexKey,'mb.myth',1,entryId,instance.revision,MYTH_MATERIAL_VERSION]);
}

function validateRecord(record:Record<string,unknown>):'valid'|'invalid'|'incomplete' {
 let codePoints=0;
 const string=(value:unknown):value is string=>{
  if(typeof value!=='string'||!value.trim().length)return false;
  let length=0;
  for(const _ of value)if(++length>MYTH_MATERIAL_LIMITS.stringCodePoints)return false;
  codePoints+=length;return codePoints<=MYTH_MATERIAL_LIMITS.recordCodePoints;
 };
 if(!string(record.definitionId)||!string(record.entryId)||!string(record.sourceEdition)||!positiveInteger(record.sourcePage)
  ||!object(record.locales)||!Object.prototype.hasOwnProperty.call(record.locales,'ru')||!object(record.locales.ru)
  ||!Array.isArray(record.references)||record.references.length>MYTH_MATERIAL_LIMITS.blocks)return 'invalid';
 let incomplete=false;
 for(const reference of record.references){
  if(!object(reference)||!['resolved','unresolved'].includes(reference.type as string)||!string(reference.description))return 'invalid';
 }
 for(const language of Object.keys(record.locales)){
  if(language!=='ru'&&language!=='en')return 'invalid';
  const content=record.locales[language];
  if(!object(content)||!Array.isArray(content.omens)||!Array.isArray(content.roles)
   ||content.omens.length>MYTH_MATERIAL_LIMITS.blocks||content.roles.length>MYTH_MATERIAL_LIMITS.blocks
   ||(content.omenPreamble!==undefined&&!string(content.omenPreamble))
   ||(content.rolePreamble!==undefined&&!string(content.rolePreamble)))return 'invalid';
  const ids=new Set<string>(),ordinals=new Set<number>();
  for(const omen of content.omens){
   if(!object(omen)||!string(omen.id)||ids.has(omen.id)||!positiveInteger(omen.ordinal)||ordinals.has(omen.ordinal)||!string(omen.text))return 'invalid';
   ids.add(omen.id);ordinals.add(omen.ordinal);
  }
  for(const role of content.roles){
   if(!object(role)||!string(role.id)||ids.has(role.id)||!string(role.title)||!string(role.text))return 'invalid';
   ids.add(role.id);
  }
  const verified=content.verifiedEmptySections;
  if(verified!==undefined&&(!Array.isArray(verified)||verified.length>2))return 'invalid';
  const empty=new Set<string>();
  for(const section of verified??[]){
   if((section!=='omens'&&section!=='roles')||empty.has(section)||(section==='omens'?content.omens:content.roles).length!==0)return 'invalid';
   empty.add(section);
  }
  if((content.omens.length===0&&!empty.has('omens'))||(content.roles.length===0&&!empty.has('roles')))incomplete=true;
 }
 return incomplete?'incomplete':'valid';
}

// Pure reference selection: no map commands, RNG, repair, registry writes or
// fallback to a neighbouring entry. Failures remain local to the requested ID.
export function selectMythMaterial(instance:TagInstance|undefined,owner:TagOwner,poiType:string,registry:unknown,language:string):MythMaterialSelection {
 if(!instance||poiType!=='myth'||owner.kind!=='poi')return {status:'absent'};
 const entryId=knownEntry(instance,owner);
 if(entryId===undefined)return {status:'unavailable',reason:'incompatible-snapshot'};
 if(!Array.isArray(registry))return {status:'error',reason:'invalid-registry'};
 const matches=registry.filter(record=>object(record)&&record.entryId===entryId);
 if(matches.length===0)return {status:'unavailable',reason:'missing-material'};
 if(matches.length!==1)return {status:'error',reason:'duplicate-material'};
 const candidate=matches[0] as Record<string,unknown>;
 if(typeof candidate.definitionId!=='string'||!candidate.definitionId.trim().length||!positiveInteger(candidate.definitionVersion)
  ||typeof candidate.sourceEdition!=='string'||!candidate.sourceEdition.trim().length||!positiveInteger(candidate.materialVersion))return {status:'error',reason:'invalid-material'};
 const manifest=mythMaterialManifest[0];
 if(candidate.definitionId!==manifest.definitionId||candidate.definitionVersion!==manifest.definitionVersion
  ||candidate.sourceEdition!==manifest.sourceEdition||candidate.materialVersion!==manifest.materialVersion)return {status:'unavailable',reason:'incompatible-material'};
 const validation=validateRecord(candidate);
 if(validation==='invalid')return {status:'error',reason:'invalid-material'};
 if(validation==='incomplete')return {status:'unavailable',reason:'incomplete-material'};
 const record=candidate as unknown as MythMaterialRecord;
 const selectedLanguage=language==='en'&&Object.prototype.hasOwnProperty.call(record.locales,'en')?'en':'ru';
 return {status:'ready',record,content:record.locales[selectedLanguage]!,language:selectedLanguage,fallback:language==='en'&&selectedLanguage==='ru'};
}
