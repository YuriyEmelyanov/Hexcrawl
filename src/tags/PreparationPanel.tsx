import {useEffect,useMemo,useRef,useState} from 'react';
import {TableResultRow} from './TableResultRow';
import {KnaveContentRow} from './KnaveContentRow';
import {knaveResultText,type KnaveCatalog,type KnaveTable} from './knave';
import {preparationLink,preparationView,type PreparationInput,type PreparationCommand,type TableCall,type PreparationState} from './tablePreparation';
export type PreparationNavigation={owner:string;revision:number;dirty:boolean;finish:()=>boolean;discard:()=>void;focus:()=>void};
type Ticket={revision:number;token:object};
type Props={input:PreparationInput;catalog:()=>KnaveCatalog;owner:string;language:string;disabled:boolean;animation?:{slot?:number;revision:number;expiresAt:number};onLegacyRoll:(part:'primary'|'trait'|'both')=>boolean;context:()=>Ticket;commit:(commands:PreparationCommand[],ticket:Ticket)=>boolean;onDraft:(active:boolean)=>void;navigation:(value:PreparationNavigation|null)=>void};
const names:Record<KnaveTable,{ru:string;en:string}>={locations:{ru:'Место',en:'Location'},structures:{ru:'Постройка',en:'Structure'},dungeons:{ru:'Подземелье',en:'Dungeon'},place_traits:{ru:'Особенность места',en:'Place trait'}};
type Draft={kind:'select'|'description';ticket:Ticket;target:number|null;link:boolean;table:KnaveTable;mode:'manual'|'roll';row:string;search:string;text:string;initialText:string};
/** Catalog lookup and projection are read-only and must fail closed, not crash App. */
export function PreparationPanel(props:Props){
 const prepared=useMemo(()=>{try{const catalog=props.catalog();return {catalog,view:preparationView(props.input,catalog,new Set(Object.keys(props.input?.byPoi??{})))};}catch{return null;}},[props.input,props.catalog]);
 if(!prepared){
  const place=props.input?.byPoi[props.owner],ru=props.language==='ru';
  return <section data-preparation data-preparation-owner={props.owner} className="preparation-panel">
   <p role="alert">{ru?'Таблицы недоступны. Сохранённые подсказки доступны для чтения.':'Tables are unavailable. Saved prompts remain readable.'}</p>
   {props.input?.schemaVersion===1&&props.input.byPoi[props.owner]?<KnaveContentRow content={props.input.byPoi[props.owner]} owner={props.owner} language={props.language} disabled onRoll={props.onLegacyRoll}/>:place&&'calls' in place?<>{place.calls.map(c=><p key={c.id}>{names[c.table][ru?'ru':'en']}: #{c.sourceRow} {knaveResultText(c,c.table,props.language)}{c.nextEntry?` → #${c.nextEntry.sourceRow}: ${knaveResultText(c.nextEntry,c.nextEntry.table,props.language)}`:''}</p>)}<p className="preparation-description">{place.description}</p></>:null}
  </section>;
 }
 return <PreparationEditor {...props} catalog={prepared.catalog} view={prepared.view}/>;
}
type ReadyProps=Omit<Props,'catalog'>&{catalog:KnaveCatalog;view:PreparationState};
function PreparationEditor({input,catalog,view,owner,language,disabled,animation,onLegacyRoll,context,commit,onDraft,navigation}:ReadyProps){
 const ru=language==='ru',lang=ru?'ru':'en',word=(a:string,b:string)=>ru?a:b;
 const place=view.byPoi[owner],calls=place?.calls??[],roots=calls.filter(c=>c.parentId===undefined);
 const [,setAnimationTick]=useState(0);
 const [draft,setDraft]=useState<Draft|null>(null),[error,setError]=useState('');
 const navigationObserver=useRef(navigation);navigationObserver.current=navigation;
 const modal=useRef<HTMLDialogElement|null>(null),trigger=useRef<HTMLElement|null>(null),observer=useRef(onDraft),composing=useRef(false),applying=useRef(false);observer.current=onDraft;
 useEffect(()=>()=>{observer.current(false);navigationObserver.current(null);},[]);
 useEffect(()=>{navigationObserver.current(draft?.kind==='description'?{owner,revision:draft.ticket.revision,dirty:draft.text!==draft.initialText,finish:()=>apply(),discard:close,focus:()=>modal.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus()}:null);},[draft,disabled]);
 useEffect(()=>{const delay=(animation?.expiresAt??0)-Date.now();if(delay<=0)return;const timer=setTimeout(()=>setAnimationTick(t=>t+1),delay+1);return()=>clearTimeout(timer);},[animation?.revision,animation?.expiresAt]);
 useEffect(()=>{if(draft&&!modal.current?.open){if(draft.kind==='description')modal.current?.show();else modal.current?.showModal();}},[!!draft]);
 const restoreFocus=()=>queueMicrotask(()=>{if(trigger.current?.isConnected)trigger.current.focus();else document.querySelector<HTMLElement>('[data-preparation] button')?.focus();});
 const close=()=>{navigationObserver.current(null);modal.current?.close();setDraft(null);onDraft(false);setError('');restoreFocus();};
 const cancel=()=>{if(draft?.kind==='description'&&draft.text!==draft.initialText&&!window.confirm(word('Отбросить изменения описания?','Discard description changes?')))return;close();};
 const open=(event:React.MouseEvent<HTMLElement>,kind:'select'|'description',call?:TableCall,link=false)=>{
  if(disabled)return;trigger.current=event.currentTarget;setError('');
  const edge=call&&preparationLink(call),text=place?.description??'';
  setDraft({kind,ticket:context(),target:call?.id??null,link,table:link?edge!.target:call?.table??'locations',mode:'manual',row:String(link?1:call?.sourceRow??1),search:'',text,initialText:text});onDraft(true);
 };
 const loss=(id:number)=>calls.some(c=>c.parentId===id)||!!calls.find(c=>c.id===id)?.nextEntry;
 const confirmLoss=(ids:number[])=>!ids.some(loss)||window.confirm(word('Изменение удалит связанное уточнение и выбранную следующую строку. Продолжить?','This change removes the linked clarification and chosen next entry. Continue?'));
 const immediate=(commands:PreparationCommand[])=>{
  if(disabled||draft||!confirmLoss(commands.flatMap(c=>'id' in c?[c.id]:[])))return false;
  const ok=commit(commands.map(c=>('confirmDependents' in c||['reroll','remove','replace'].includes(c.kind))?{...c,confirmDependents:true}:c),context());
  if(!ok)setError(word('Не удалось применить действие. Карта не изменена.','Could not apply. Your map is unchanged.'));return ok;
 };
 const apply=()=>{
  if(!draft||composing.current||applying.current)return false;
  let command:PreparationCommand;
  if(draft.kind==='description')command={kind:'description',owner,value:draft.text};
  else{
   const row=Number(draft.row);if(draft.mode==='manual'&&(!draft.row.trim()||!Number.isSafeInteger(row)||row<1||row>100)){setError(word('Введите целое число от 1 до 100.','Enter a whole number from 1 to 100.'));return false;}
   if(draft.target!==null&&!draft.link&&!confirmLoss([draft.target]))return false;
   const choice=draft.mode==='roll'?{kind:'roll' as const}:{kind:'manual' as const,row};
   command=draft.link?{kind:'link',owner,id:draft.target!,choice}:draft.target!==null?{kind:'replace',owner,id:draft.target,table:draft.table,choice,confirmDependents:true}:{kind:'add',owner,table:draft.table,choice};
  }
  if(draft.kind==='description'&&draft.text===draft.initialText){close();return true;}
  applying.current=true;onDraft(false);
  const ok=commit([command],draft.ticket);applying.current=false;
  if(ok)close();else{onDraft(true);setError(word('Карта изменилась или действие недоступно. Отмените черновик и откройте заново.','The map changed or action is unavailable. Cancel and reopen this draft.'));}return ok;
 };
 const row=(call:TableCall)=>{
  const value=knaveResultText(call,call.table,language),edge=preparationLink(call),child=calls.find(c=>c.parentId===call.id);
  return <div key={call.id} className={`preparation-call${call.parentId?' preparation-child':''}`} data-preparation-call={call.id}>
   <TableResultRow label={names[call.table][lang]} language={language} owner={owner} contextLabel={`${owner}; ${word('подсказка','call')} ${call.id}`} disabled={disabled||!!draft||!!animation&&animation.expiresAt>Date.now()&&(animation.slot===undefined||animation.slot===call.id)}
    components={[{actions:[{slot:call.id,current:value,purpose:call.selection==='manual'?`${word('Выбор строки','Manual selection')} #${call.sourceRow}`:call.selection==='d100'?'d100':word('Бросок','Roll'),pick:call.selection==='legacy_compatible_pool',manualRow:call.selection==='manual'?call.sourceRow:undefined,values:call.rollValue===undefined?undefined:[call.rollValue],sides:call.selection==='d100'?100:undefined,active:!!animation&&animation.expiresAt>Date.now()&&(animation.slot===undefined||animation.slot===call.id),animationKey:animation?.revision}],result:value}]}
    onRoll={()=>immediate([{kind:'reroll',owner,id:call.id,confirmDependents:false}])}
    onRollAll={()=>immediate(roots.map(c=>({kind:'reroll',owner,id:c.id,confirmDependents:false})))} allLabel={word('Перебросить все подсказки','Reroll all prompts')}/>
   <details className="preparation-actions" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}>
    <summary aria-label={`${word('Действия','Actions')}: ${names[call.table][lang]} #${call.sourceRow}; ${word('подсказка','call')} ${call.id}`}>⋯</summary>
    <div><button type="button" disabled={disabled||!!draft} onClick={e=>{e.currentTarget.closest('details')!.open=false;open(e,'select',call);}}>{word('Выбрать строку','Choose a row')}</button>
    {!call.parentId&&edge&&!child?<button type="button" disabled={disabled||!!draft} onClick={e=>{e.currentTarget.closest('details')!.open=false;open(e,'select',call,true);}}>{word('Добавить по ссылке','Follow table link')}</button>:null}
    {!call.parentId&&call.references.length&&!edge?<small>{word('Таблица пока недоступна','Table not available yet')}</small>:null}
    {call.parentId&&call.references.length&&!call.nextEntry?(call.sourceRow<100?<button type="button" disabled={disabled||!!draft} onClick={()=>immediate([{kind:'nextEntry',owner,id:call.id}])}>{word('Взять следующую строку','Use next entry')}</button>:<small>{word('Следующей строки нет','No next entry')}</small>):null}
    <button type="button" disabled={disabled||!!draft} onClick={()=>immediate([{kind:'remove',owner,id:call.id,confirmDependents:false}])}>{word('Удалить','Delete')}</button>
    <small>{names[call.table][lang]} · {word('с.','p.')} {call.sourceRef.printedPage} · #{call.sourceRow}{call.sourceRow===100?' (00)':''}{call.references.map(r=>` → ${r.printedPage}`).join('')}</small></div>
   </details>
   {call.nextEntry?<p className="preparation-next">→ #{call.nextEntry.sourceRow}: {knaveResultText(call.nextEntry,call.nextEntry.table,language)}{call.nextEntry.references.length?` · ${word('Ссылка остаётся открытой','Reference remains unresolved')}`:''}</p>:null}
  </div>;
 };
 const selected=draft?.kind==='select'?catalog.tables[draft.table][Number(draft.row)-1]:undefined;
 return <section data-preparation data-preparation-owner={owner} className="preparation-panel">
  {input?.schemaVersion===1&&input.byPoi[owner]?<KnaveContentRow content={input.byPoi[owner]} owner={owner} language={language} disabled={disabled||!!draft} animation={animation} onRoll={onLegacyRoll}/>:roots.map(c=><div key={c.id}>{row(c)}{calls.filter(k=>k.parentId===c.id).map(row)}</div>)}
  {place?.description?<p className="preparation-description">{place.description}</p>:null}
  <div className="preparation-tools"><button type="button" className="secondary" disabled={disabled||!!draft} onClick={e=>open(e,'select')}>{word('Добавить подсказку','Add prompt')}</button>
   {input?.schemaVersion===1&&calls.length?<button type="button" className="secondary" disabled={disabled||!!draft} onClick={e=>open(e,'select',calls[0])}>{word('Выбрать строку','Choose a row')}</button>:null}
   <button type="button" className="secondary" disabled={disabled||!!draft} onClick={e=>open(e,'description')}>{word('Описание места','Place description')}</button></div>
  {error&&!draft?<p role="alert">{error}</p>:null}
  {draft?<dialog ref={modal} data-preparation-dialog className="preparation-dialog" aria-label={draft.kind==='description'?word('Описание места','Place description'):word('Подсказка места','Place prompt')} onCancel={e=>{e.preventDefault();cancel();}}>
   <form noValidate onSubmit={e=>{e.preventDefault();apply();}} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'&&!e.nativeEvent.isComposing&&!composing.current){e.preventDefault();cancel();}if(draft.kind==='description'&&e.key==='Tab'){const nodes=[...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,textarea')],first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}}>
    <h3>{draft.kind==='description'?word('Описание места','Place description'):word('Подсказка места','Place prompt')}</h3>
    {draft.kind==='description'?<textarea autoFocus aria-label={word('Описание места','Place description')} maxLength={20000} rows={7} value={draft.text} onCompositionStart={()=>composing.current=true} onCompositionEnd={()=>composing.current=false} onChange={e=>setDraft({...draft,text:e.target.value})}/>:<>
     {!draft.link?<label>{word('Обращение','Call')}<select aria-label={word('Обращение','Call')} value={draft.target??'new'} onChange={e=>{const id=e.target.value==='new'?null:Number(e.target.value),c=calls.find(c=>c.id===id);setDraft({...draft,target:id,table:c?.table??draft.table,row:String(c?.sourceRow??1)});}}><option value="new">{word('Новая подсказка','New prompt')}</option>{calls.map(c=><option key={c.id} value={c.id}>{names[c.table][lang]} #{c.sourceRow} · {c.id}</option>)}</select></label>:null}
     <label>{word('Таблица','Table')}<select aria-label={word('Таблица','Table')} value={draft.table} disabled={draft.link||!!calls.find(c=>c.id===draft.target)?.parentId} onChange={e=>setDraft({...draft,table:e.target.value as KnaveTable,row:'1',search:''})}>{Object.keys(names).map(k=><option key={k} value={k}>{names[k as KnaveTable][lang]}</option>)}</select></label>
     <label>{word('Способ','Method')}<select aria-label={word('Способ','Method')} value={draft.mode} onChange={e=>setDraft({...draft,mode:e.target.value as Draft['mode']})}><option value="manual">{word('Выбрать строку','Choose a row')}</option><option value="roll">{word('Бросить d100','Roll d100')}</option></select></label>
     {draft.mode==='manual'?<><label>{word('Номер 1–100','Row 1–100')}<input autoFocus aria-label={word('Номер строки','Row number')} type="number" min="1" max="100" step="1" value={draft.row} onChange={e=>setDraft({...draft,row:e.target.value})}/></label><button type="button" className="secondary" onClick={()=>setDraft({...draft,row:'100'})}>100 (00)</button>
      <label>{word('Поиск','Search')}<input aria-label={word('Поиск строк','Search rows')} value={draft.search} onChange={e=>setDraft({...draft,search:e.target.value})}/></label>
      <select size={5} aria-label={word('Строки таблицы','Table rows')} value={draft.row} onChange={e=>setDraft({...draft,row:e.target.value})}>{catalog.tables[draft.table].filter(e=>`${e.row} ${e.printedResult} ${knaveResultText({sourceRow:e.row,ru:e.ru},draft.table,language)}`.toLocaleLowerCase().includes(draft.search.toLocaleLowerCase())).map(e=><option key={e.row} value={e.row}>{e.row}{e.row===100?' (00)':''} · {knaveResultText({sourceRow:e.row,ru:e.ru},draft.table,language)}</option>)}</select>
      <p className="preparation-preview">{selected?knaveResultText({sourceRow:selected.row,ru:selected.ru},draft.table,language):word('Выберите строку от 1 до 100','Choose row 1 to 100')}</p></>:null}
    </>}
    {error?<p role="alert">{error}</p>:null}
    <div className="preparation-tools"><button type="submit" disabled={disabled}>{word('Применить','Apply')}</button><button type="button" className="secondary" onClick={cancel}>{word('Отмена','Cancel')}</button></div>
   </form>
  </dialog>:null}
 </section>;
}
