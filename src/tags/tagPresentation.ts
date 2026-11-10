import {resolved,type TagDefinition,type TagInstance} from './engine.ts';

// A display-only lookup also localizes pre-translation saves. It never rewrites
// their accepted text snapshots, authored overrides, dice, or random counters.
export function localizedTagText(instance:TagInstance,definition:TagDefinition|undefined,index:number,language:string,includeOverrides=true):string {
 const override=includeOverrides?instance.overrides?.[index]?.[language]:undefined;
 if(override!==undefined)return override;
 const stored=instance.texts[index]?.[language];
 if(stored!==undefined&&(language!=='en'||!/[\u0400-\u04ff]/u.test(stored)))return stored;
 if(language!=='en')return instance.texts[index]?.ru??Object.values(instance.texts[index]??{})[0]??'';
 if(definition&&definition.id===instance.definitionId&&definition.version===instance.definitionVersion&&definition.resolver===instance.resolver
  &&definition.slots.length===instance.values.length&&definition.slots.every((slot,i)=>slot.sides===instance.sides[i]
   &&instance.values[i]?.length===(slot.count??1)&&instance.values[i].every(value=>Number.isInteger(value)&&value>=1&&value<=slot.sides))){
  const current=resolved(definition,instance.values);
  if(current.entryIds.length===instance.entryIds.length&&current.entryIds.every((id,i)=>id===instance.entryIds[i])){
   const text=current.texts[index]?.en;
   if(text!==undefined&&!/[\u0400-\u04ff]/u.test(text))return text;
  }
 }
 return 'Translation unavailable';
}
