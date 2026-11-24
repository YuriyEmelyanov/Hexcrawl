import type {Discovery} from './knaveClassic';
import type {ReactNode} from 'react';
import type {DetailCell} from './detailGrid';
export type FineDraft={target:DetailCell;revision:number;language:'ru'|'en';name:string;note:string;biome:string;localPlace:Discovery|null;projected:Record<string,Discovery>;baseline:string};
type Props={classic:boolean;localPlace?:Discovery;discoveryLabels:Record<Discovery,string>;projectedPlaces:readonly {owner:string;label:string}[];newPlaceMode:Discovery;children?:ReactNode;canEdit:boolean;language:'ru'|'en';cell:DetailCell|null;name?:string;biome?:string;note?:string;roads:readonly string[];rivers:readonly string[];pois:readonly string[];draft:FineDraft|null;biomes:readonly {id:string;label:string}[];water:boolean;busy:boolean;error:string|null;
 onEdit:()=>void;onChange:(fields:Partial<Pick<FineDraft,'name'|'note'|'biome'|'localPlace'|'projected'>>)=>void;onSave:()=>void;onCancel:()=>void;onComposition:(active:boolean)=>void};
export function OneMilePanel(p:Props){const ru=p.language==='ru';return <section className={`info-block info-block--hex${p.draft?' is-editing':''}`} data-fine-panel aria-label={ru?'Информация о выбранном гексе':'Selected hex information'}>
 <div className="direct-mode-row"><button type="button" className="secondary direct-mode" aria-label={ru?'Редактировать':'Edit'} disabled={!p.canEdit||p.busy||!!p.draft} onClick={p.onEdit}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6Z"/></svg></button></div>
 {p.cell?<><strong>{p.name||`${p.cell.q}/${p.cell.r}`}</strong>{p.name&&<p>{p.cell.q}/{p.cell.r}</p>}</>:<p>{ru?'Гекс не выбран':'No hex selected'}</p>}
 {p.children}
 {p.draft?<form data-fine-editor onSubmit={e=>{e.preventDefault();p.onSave();}} onCompositionStart={()=>p.onComposition(true)} onCompositionEnd={()=>p.onComposition(false)}>
  <label>{ru?'Название':'Name'}<input autoFocus aria-label={ru?'Название гекса':'Hex name'} maxLength={200} value={p.draft.name} onChange={e=>p.onChange({name:e.target.value})}/></label>
  <label>{ru?'Местность':'Terrain'}<select aria-label={ru?'Местность гекса':'Hex terrain'} disabled={p.water} value={p.draft.biome} onChange={e=>p.onChange({biome:e.target.value})}><option value="">{ru?'Исходная':'Default'}{p.biome?` · ${p.biome}`:''}</option>{p.biomes.map(b=><option key={b.id} value={b.id}>{b.label}</option>)}</select></label>
  {p.water&&<p>{ru?'Биом водной или прибрежной клетки здесь не меняется.':'The biome of water or mixed coastal cells cannot be changed here.'}</p>}
  {p.classic&&<>
    {p.projectedPlaces.map(({owner,label})=><label key={owner}>{label} · {ru?'Обнаружение':'Discovery'}
      <select value={p.draft!.projected[owner]??'passage'} onChange={e=>p.onChange({projected:{...p.draft!.projected,[owner]:e.target.value as Discovery}})}>
        {Object.entries(p.discoveryLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
      </select></label>)}
    <label className="fine-local-place"><input type="checkbox" checked={p.draft.localPlace!==null} onChange={e=>p.onChange({localPlace:e.target.checked?p.newPlaceMode:null})}/>{ru?'Место без типа':'Untyped place'}</label>
    {p.draft.localPlace&&<label>{ru?'Обнаружение места без типа':'Untyped place discovery'}
      <select value={p.draft.localPlace} onChange={e=>p.onChange({localPlace:e.target.value as Discovery})}>
        {Object.entries(p.discoveryLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
      </select></label>}
  </>}
  <label>{ru?'Заметка мастера':'GM note'}<textarea rows={4} aria-label={ru?'Заметка гекса':'Hex note'} maxLength={20000} value={p.draft.note} onChange={e=>p.onChange({note:e.target.value})}/></label>
  {p.error&&<p role="alert" className="direct-error">{p.error}</p>}
  <div className="fine-actions"><button type="submit" disabled={p.busy}>{ru?'Сохранить':'Save'}</button><button type="button" className="secondary" onClick={p.onCancel}>{ru?'Отмена':'Cancel'}</button></div>
 </form>:<>{p.biome&&<p>{p.biome}</p>}{p.roads.map((s,i)=><p key={`road${i}`}>{s}</p>)}{p.rivers.map((s,i)=><p key={`river${i}`}>{s}</p>)}{p.pois.map((s,i)=><p key={`poi${i}`}>{s}</p>)}{p.classic&&p.localPlace&&<p>{ru?'Место без типа':'Untyped place'} · {p.discoveryLabels[p.localPlace]}</p>}{p.note&&<div className="gm-notes"><strong>{ru?'Заметка мастера':'GM note'}</strong><p className="gm-notes__text">{p.note}</p></div>}</>}
 </section>;}
