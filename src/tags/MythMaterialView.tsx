import {useEffect,useId,useRef,useState,type SyntheticEvent} from 'react';
import {selectMythMaterial,type MythMaterialSelection} from './mythMaterial';
import {ownerKey,type TagDefinition,type TagInstance,type TagOwner} from './engine';
import {localizedTagText} from './tagPresentation';

type Props={owner:TagOwner;instance:TagInstance;definition?:TagDefinition;poiType:string;language:string;disabled:boolean};
// Reading reference material never invokes a tag command or a map transaction.
export function MythMaterialView({owner,instance,definition,poiType,language,disabled}:Props){
 const id=useId(),request=useRef(0);
 const view=useRef<HTMLDivElement|null>(null),focusWasInside=useRef(false);
 const [open,setOpen]=useState(false),[result,setResult]=useState<MythMaterialSelection|null>(null);
 const ru=language==='ru';
 useEffect(()=>()=>{
  request.current++;
  if(focusWasInside.current&&(document.activeElement===document.body||view.current?.contains(document.activeElement))){
   const fallback=document.querySelector<HTMLElement>('.info-block--hex')??document.querySelector<HTMLElement>('.map-viewport');
   fallback?.focus({preventScroll:true});
  }
 },[]);
 const protect=(event:SyntheticEvent)=>{if(disabled){event.preventDefault();event.stopPropagation();}};
 const toggle=()=>{
  if(disabled)return;
  const token=++request.current;
  if(open){setOpen(false);setResult(null);return;}
  setOpen(true);setResult(null);
  import('./mythMaterialData').then(module=>{
   if(request.current===token)setResult(selectMythMaterial(instance,owner,poiType,module.default,language));
  }).catch(()=>{if(request.current===token)setResult({status:'error',reason:'load-failed'});});
 };
 const original=localizedTagText(instance,definition,0,language,false);
 const overridden=instance.overrides?.[0]?.[language]!==undefined;
 return <div ref={view} className="myth-material" data-myth-material={ownerKey(owner)}
   onFocusCapture={()=>{focusWasInside.current=true;}}
   onBlurCapture={event=>{if(event.relatedTarget!==null)focusWasInside.current=!!view.current?.contains(event.relatedTarget as Node);}}
   onPointerDownCapture={protect} onMouseDownCapture={protect}
   onClickCapture={protect} onKeyDownCapture={event=>{if(event.key!=='Tab')protect(event);}}>
  <button type="button" className="myth-material-toggle" disabled={disabled} aria-expanded={open} aria-controls={id} onClick={toggle}>
   <span aria-hidden="true">{open?'▾':'▸'} </span>{ru?'Материал мифа':'Myth material'}
  </button>
  {open&&<div id={id} className="myth-material-content">
   {overridden&&<p className="myth-material-context">{ru?'Материал исходного мифа: ':'Original myth material: '}{original}</p>}
   {!result?<p role="status">{ru?'Загрузка…':'Loading…'}</p>:result.status==='error'?<p role="status">{ru?'Не удалось показать материал мифа':'Could not show myth material'}</p>:result.status!=='ready'?<p role="status">{ru?'Материал этого мифа пока недоступен':'Material for this myth is not available'}</p>:<>
    {result.fallback&&<p className="myth-material-source">{ru?'Русский источник':'Russian source'}</p>}
    <section aria-label={ru?'Знамения':'Omens'}><strong>{ru?'Знамения':'Omens'}</strong>
     {result.content.omenPreamble&&<p>{result.content.omenPreamble}</p>}
     {result.content.omens.length?result.content.omens.map(omen=><details key={omen.id}><summary aria-disabled={disabled} tabIndex={disabled?-1:0}>{omen.ordinal}</summary><p>{omen.text}</p></details>):<p>{ru?'Знамений нет':'No omens'}</p>}
    </section>
    <section aria-label={ru?'Роли':'Roles'}><strong>{ru?'Роли':'Roles'}</strong>
     {result.content.rolePreamble&&<p>{result.content.rolePreamble}</p>}
     {result.content.roles.length?result.content.roles.map(role=><details key={role.id}><summary aria-disabled={disabled} tabIndex={disabled?-1:0}>{role.title}</summary><p>{role.text}</p></details>):<p>{ru?'Ролей нет':'No roles'}</p>}
    </section>
    <p className="myth-material-source">{ru?'Источник: Mythic Bastionland, с. ':'Source: Mythic Bastionland, p. '}{result.record.sourcePage}</p>
    {result.record.references.length>0&&<div className="myth-material-references">{result.record.references.map((ref,index)=><p key={index}>{ru?ref.description:ref.descriptionEn??'Additional source reference'}{ref.type==='unresolved'?(ru?' (ссылка не разрешена)':' (unresolved reference)'):''}</p>)}</div>}
   </>}
  </div>}
 </div>;
}
