import {useEffect,useId,useRef,useState} from 'react';
import {ownerKey,type TagDefinition,type TagInstance,type TagOwner} from './engine';
import {MythMaterialView} from './MythMaterialView';
import {TableResultRow,type TableRollAction} from './TableResultRow';
import {localizedTagText} from './tagPresentation';
type Props={owner:TagOwner;definition?:TagDefinition;instance?:TagInstance;language:string;editMode:boolean;disabled:boolean;rollDisabled?:boolean;materialContext?:{poiType:string;documentRevision:number;disabled:boolean};animation?:{key:string;slot?:number;revision:number;expiresAt:number};onDraftChange?:(active:boolean,token:string)=>void;onRoll:(slot?:number)=>boolean;onEdit:(index:number,text:string)=>boolean};
export function TagRow({owner,definition:def,instance,language,editMode,disabled,rollDisabled,materialContext,animation,onDraftChange,onRoll,onEdit}:Props){
 const [editing,setEditing]=useState<number|null>(null),[draft,setDraft]=useState('');
 const draftToken=useId(),draftObserver=useRef(onDraftChange);draftObserver.current=onDraftChange;
 useEffect(()=>()=>draftObserver.current?.(false,draftToken),[]);
 const label=def?.label[language]??def?.label.ru??instance?.definitionId??'';
 const readonly=!def||(instance&&instance.definitionVersion!==def.version);
 const text=(i:number)=>instance?localizedTagText(instance,def,i,language):'';
 const stopEditing=()=>{setEditing(null);onDraftChange?.(false,draftToken);};
 const commit=()=>{if(editing!==null&&onEdit(editing,draft))stopEditing();};
 const action=(slot:number):TableRollAction=>({slot,values:instance!.values[slot],sides:instance!.sides[slot],current:text(instance!.resolver==='product'?0:slot),
   purpose:def?.slots[slot]?.label?.[language]??def?.slots[slot]?.label?.ru??`${language==='ru'?'Компонент':'Component'} ${slot+1}`,
   active:animation?.revision===instance!.revision&&animation.expiresAt>Date.now()&&(animation.slot===undefined||animation.slot===slot),animationKey:instance!.revision});
 const result=(i:number)=>editing===i?<input key={`text-${i}`} className="tag-text-input" aria-label={label} maxLength={512} autoFocus value={draft} disabled={disabled}
    onChange={event=>setDraft(event.target.value)} onBlur={commit} onKeyDown={event=>{event.stopPropagation();if(event.key==='Enter')commit();if(event.key==='Escape')stopEditing();}}/>
   :editMode&&!readonly?<button key={`text-${i}`} type="button" className="tag-text" disabled={disabled} onClick={()=>{setDraft(text(i));setEditing(i);onDraftChange?.(true,draftToken);}} aria-label={`${language==='ru'?'Изменить':'Edit'} ${label}: ${text(i)}`}>{text(i)}{instance?.overrides?.[i]?.[language]!==undefined?<sup aria-label={language==='ru'?'изменено':'edited'}>*</sup>:null}</button>:<span key={`text-${i}`}>{text(i)}</span>;
 if(!instance)return def?<span className="tag-inline"><button type="button" className="tag-add" disabled={disabled||rollDisabled} onClick={()=>onRoll()}>{label} +</button></span>:null;
 return <><TableResultRow label={label} language={language} disabled={disabled||!!rollDisabled||editing!==null} readonly={!!readonly}
   tagId={instance.definitionId} owner={ownerKey(owner)} onRoll={slot=>onRoll(slot)} onRollAll={()=>onRoll()}
   allLabel={instance.values.length>1?(language==='ru'?'Перебросить оба':'Reroll both'):(language==='ru'?'Перебросить':'Reroll')}
   components={instance.resolver==='product'?[{actions:instance.values.map((_,i)=>action(i)),result:result(0)}]:instance.values.map((_,i)=>({actions:[action(i)],result:result(i)}))}/>
{materialContext?.poiType==='myth'&&owner.kind==='poi'&&instance.definitionId==='mb.myth'&&<MythMaterialView
  key={`${ownerKey(owner)}:${instance.definitionVersion}:${instance.revision}:${instance.entryIds.join('|')}:${language}:${materialContext.documentRevision}`}
  owner={owner} instance={instance} definition={def} poiType={materialContext.poiType} language={language} disabled={disabled||materialContext.disabled||editing!==null}/>}</>;
}
