import {useRef,useState,type ReactNode} from 'react';

export type TableRollAction={slot:number;purpose:string;current:string;values?:readonly number[];sides?:number;active?:boolean;animationKey?:number;pick?:boolean};
type Props={label:string;language:string;disabled:boolean;readonly?:boolean;components:{actions:TableRollAction[];result:ReactNode}[];onRoll:(slot:number)=>boolean;onRollAll?:()=>boolean;allLabel?:string;tagId?:string;owner?:string};
/** Shared interaction and presentation; adapters retain their own table rules. */
export function TableResultRow({label,language,disabled,readonly,components,onRoll,onRollAll,allLabel,tagId,owner}:Props){
 const [menu,setMenu]=useState(false);
 const menuTrigger=useRef<HTMLButtonElement|null>(null);
 const ru=language==='ru',blocked=disabled||readonly;
 const title=readonly?(ru?'Неизвестная версия таблицы':'Unknown table version'):disabled?(ru?'Завершите текущую операцию':'Finish the current operation'):undefined;
 const openMenu=(event:React.MouseEvent|React.KeyboardEvent)=>{if(!blocked&&onRollAll){event.preventDefault();menuTrigger.current=event.currentTarget as HTMLButtonElement;setMenu(true);}};
 return <span className="tag-inline" data-table-result data-tag={tagId} data-tag-owner={owner}>
   <span className="tag-label">{label}: </span>
   {menu&&onRollAll?<span className="tag-actions" role="menu" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setMenu(false);menuTrigger.current?.focus();}}}><button type="button" role="menuitem" autoFocus disabled={!!blocked} onBlur={()=>setMenu(false)} onClick={()=>{onRollAll();setMenu(false);}}>{allLabel??(ru?'Перебросить':'Reroll')}</button></span>:null}
   {components.map((component,i)=><span className="tag-component" key={i}>{component.actions.map(action=><button key={action.slot} type="button" className={`${action.pick?'tag-pick':'tag-die'}${action.active?' tag-die--roll':''}`} disabled={!!blocked}
     data-tag-slot={action.slot} aria-label={`${ru?'Перебросить':'Reroll'} ${label}; ${action.purpose}; ${action.current}${action.values?`; d${action.sides}: ${action.values.join(', ')}`:''}`} title={title}
     onContextMenu={openMenu} onKeyDown={event=>{if(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10')openMenu(event);}}
     onClick={event=>{event.stopPropagation();onRoll(action.slot);}}>
     {action.pick?<span key={action.active?action.animationKey:0} aria-hidden="true">↻</span>:<svg key={action.active?action.animationKey:0} viewBox="0 0 18 18" aria-hidden="true"><path d={action.sides===6?'M2 2H16V16H2Z':'M9 1L17 7L14 16H4L1 7Z'}/><text x="9" y="12">{action.values?.reduce((a,b)=>a+b,0)}</text></svg>}
   </button>)}<span className="tag-result">{component.result}</span></span>)}
 </span>;
}
