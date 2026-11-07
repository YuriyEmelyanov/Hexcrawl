import {useState} from 'react';
import {ownerKey,type TagDefinition,type TagInstance,type TagOwner} from './engine';
import {MythMaterialView} from './MythMaterialView';
type Props={owner:TagOwner;definition?:TagDefinition;instance?:TagInstance;language:string;editMode:boolean;disabled:boolean;materialContext?:{poiType:string;documentRevision:number;disabled:boolean};animation?:{key:string;slot?:number;revision:number;expiresAt:number};onRoll:(slot?:number)=>boolean;onEdit:(index:number,text:string)=>boolean};
export function TagRow({owner,definition:def,instance,language,editMode,disabled,materialContext,animation,onRoll,onEdit}:Props){
 const [menu,setMenu]=useState(false);
 const [editing,setEditing]=useState<number|null>(null),[draft,setDraft]=useState('');
 const label=def?.label[language]??def?.label.ru??instance?.definitionId??'';
 const readonly=!def||(instance&&instance.definitionVersion!==def.version);
 const text=(i:number)=>instance?.overrides?.[i]?.[language]??instance?.texts[i]?.[language]??instance?.texts[i]?.ru??Object.values(instance?.texts[i]??{})[0]??'';
 const commit=()=>{if(editing!==null&&onEdit(editing,draft))setEditing(null);};
 const dice=(slot:number)=>{
   const values=instance!.values[slot],sides=instance!.sides[slot];
   const purpose=def?.slots[slot]?.label?.[language]??def?.slots[slot]?.label?.ru??`${language==='ru'?'Компонент':'Component'} ${slot+1}`;
   const current=text(instance!.resolver==='product'?0:slot);
   const active=animation?.revision===instance!.revision&&animation.expiresAt>Date.now()&&(animation.slot===undefined||animation.slot===slot);
   return <button key={slot} type="button" className={`tag-die${active?' tag-die--roll':''}`} disabled={disabled||!!readonly}
     data-tag-slot={slot} aria-label={`${language==='ru'?'Перебросить':'Reroll'} ${label}; ${purpose}; ${current}; d${sides}: ${values.join(', ')}`}
     title={readonly?(language==='ru'?'Неизвестная версия таблицы':'Unknown table version'):disabled?(language==='ru'?'Дождитесь завершения текущей операции':'Wait for the current operation'):undefined}
     onContextMenu={event=>{if(!readonly&&!disabled){event.preventDefault();setMenu(true);}}}
     onKeyDown={event=>{if(!readonly&&!disabled&&(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10'))){event.preventDefault();setMenu(true);}}}
     onClick={event=>{event.stopPropagation();onRoll(slot);}}>
     <svg key={active?instance!.revision:0} viewBox="0 0 18 18" aria-hidden="true"><path d={sides===6?'M2 2H16V16H2Z':'M9 1L17 7L14 16H4L1 7Z'} /><text x="9" y="12">{values.reduce((a,b)=>a+b,0)}</text></svg>
   </button>;
 };
 const result=(i:number)=>editing===i?<input key={`text-${i}`} className="tag-text-input" aria-label={label} maxLength={512} autoFocus value={draft} disabled={disabled}
    onChange={event=>setDraft(event.target.value)} onBlur={commit} onKeyDown={event=>{event.stopPropagation();if(event.key==='Enter')commit();if(event.key==='Escape')setEditing(null);}}/>
   :editMode&&!readonly?<button key={`text-${i}`} type="button" className="tag-text" disabled={disabled} onClick={()=>{setDraft(text(i));setEditing(i);}} aria-label={`${language==='ru'?'Изменить':'Edit'} ${label}: ${text(i)}`}>{text(i)}{instance?.overrides?.[i]?.[language]!==undefined?<sup aria-label={language==='ru'?'изменено':'edited'}>*</sup>:null}</button>:<span key={`text-${i}`}>{text(i)}</span>;
 if(!instance)return def?<span className="tag-inline"><button type="button" className="tag-add" disabled={disabled} onClick={()=>onRoll()}>{label} +</button></span>:null;
 return <><span className="tag-inline" data-tag={instance.definitionId} data-tag-owner={ownerKey(owner)}>
   {menu?<span className="tag-actions" role="menu" onKeyDown={e=>{if(e.key==='Escape')setMenu(false);}}><button type="button" role="menuitem" autoFocus disabled={disabled||!!readonly} onBlur={()=>setMenu(false)} onClick={()=>{onRoll();setMenu(false);}}>{language==='ru'?'Перебросить оба':'Reroll both'}</button></span>:null}
   {instance.definitionId==='mb.seer'?<span>{language==='ru'?'Провидец: ':'Seer: '}</span>:null}
   {instance.resolver==='product'?<span className="tag-component">{instance.values.map((_,i)=>dice(i))}{result(0)}</span>:instance.values.map((_,i)=><span className="tag-component" key={i}>{dice(i)}{result(i)}</span>)}
 </span>{materialContext?.poiType==='myth'&&owner.kind==='poi'&&instance.definitionId==='mb.myth'&&<MythMaterialView
  key={`${ownerKey(owner)}:${instance.definitionVersion}:${instance.revision}:${instance.entryIds.join('|')}:${language}:${materialContext.documentRevision}`}
  owner={owner} instance={instance} poiType={materialContext.poiType} language={language} disabled={disabled||materialContext.disabled||editing!==null}/>}</>;
}
